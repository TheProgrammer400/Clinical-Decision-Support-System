import { Body, Controller, Get, HttpCode, HttpStatus, Post, Req, Res, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Request, Response } from 'express';
import { API_PREFIX } from '../../app.setup';
import { CurrentUser } from '../../common/decorators/user.decorator';
import { AppConfigService } from '../config/config.service';
import { AuthService, IssuedSession } from './auth.service';
import { AllowPasswordChangeRequired } from './decorators/allow-password-change-required.decorator';
import { LoginDto } from './dto/login.dto';
import { MfaCodeDto, MfaLoginDto } from './dto/mfa.dto';
import { ChangePasswordDto, ResetPasswordDto } from './dto/password.dto';
import { RegisterDto } from './dto/register.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

export const REFRESH_COOKIE = 'refresh_token';
const REFRESH_COOKIE_PATH = `/${API_PREFIX}/auth`;
const STRICT_LIMIT = { default: { limit: 10, ttl: 60_000 } };

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly config: AppConfigService,
  ) {}

  @Post('register')
  @Throttle(STRICT_LIMIT)
  @HttpCode(HttpStatus.ACCEPTED)
  register(@Body() dto: RegisterDto, @Req() req: Request) {
    return this.authService.register(dto, { ipAddress: req.ip });
  }

  @Post('login')
  @Throttle(STRICT_LIMIT)
  @HttpCode(HttpStatus.OK)
  async login(@Body() dto: LoginDto, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const result = await this.authService.login(dto, { ipAddress: req.ip });
    if (result.mfaRequired) {
      return { mfaRequired: true, mfaToken: result.mfaToken };
    }
    return this.respondWithSession(res, result);
  }

  @Post('mfa/login')
  @Throttle(STRICT_LIMIT)
  @HttpCode(HttpStatus.OK)
  async mfaLogin(@Body() dto: MfaLoginDto, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    return this.respondWithSession(res, await this.authService.completeMfaLogin(dto.mfaToken, dto.code, { ipAddress: req.ip }));
  }

  @Post('refresh')
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @HttpCode(HttpStatus.OK)
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    try {
      return this.respondWithSession(res, await this.authService.refresh(req.cookies?.[REFRESH_COOKIE], { ipAddress: req.ip }));
    } catch (err) {
      this.clearRefreshCookie(res);
      throw err;
    }
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @AllowPasswordChangeRequired()
  @HttpCode(HttpStatus.OK)
  async logout(@CurrentUser('userId') userId: string, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    this.clearRefreshCookie(res);
    return this.authService.logout(userId, { ipAddress: req.ip });
  }

  @Get('session')
  @UseGuards(JwtAuthGuard)
  @AllowPasswordChangeRequired()
  session(@CurrentUser('userId') userId: string) {
    return this.authService.getSessionUser(userId);
  }

  @Post('change-password')
  @UseGuards(JwtAuthGuard)
  @AllowPasswordChangeRequired()
  @Throttle(STRICT_LIMIT)
  @HttpCode(HttpStatus.OK)
  async changePassword(
    @CurrentUser('userId') userId: string,
    @Body() dto: ChangePasswordDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const session = await this.authService.changePassword(userId, dto.currentPassword, dto.newPassword, { ipAddress: req.ip });
    return this.respondWithSession(res, session);
  }

  /** Completes an administrator-issued reset link. */
  @Post('password-reset/confirm')
  @Throttle(STRICT_LIMIT)
  @HttpCode(HttpStatus.OK)
  resetPassword(@Body() dto: ResetPasswordDto, @Req() req: Request) {
    return this.authService.resetPassword(dto.token, dto.newPassword, { ipAddress: req.ip });
  }

  @Post('mfa/enroll')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  beginMfa(@CurrentUser('userId') userId: string) {
    return this.authService.beginMfaEnrollment(userId);
  }

  @Post('mfa/confirm')
  @UseGuards(JwtAuthGuard)
  @Throttle(STRICT_LIMIT)
  @HttpCode(HttpStatus.OK)
  confirmMfa(@CurrentUser('userId') userId: string, @Body() dto: MfaCodeDto, @Req() req: Request) {
    return this.authService.confirmMfaEnrollment(userId, dto.code, { ipAddress: req.ip });
  }

  @Post('mfa/disable')
  @UseGuards(JwtAuthGuard)
  @Throttle(STRICT_LIMIT)
  @HttpCode(HttpStatus.OK)
  disableMfa(@CurrentUser('userId') userId: string, @Body() dto: MfaCodeDto, @Req() req: Request) {
    return this.authService.disableMfa(userId, dto.code, { ipAddress: req.ip });
  }

  private respondWithSession(res: Response, session: IssuedSession) {
    res.cookie(REFRESH_COOKIE, session.refreshToken, {
      httpOnly: true,
      secure: this.config.cookieSecure,
      sameSite: 'strict',
      path: REFRESH_COOKIE_PATH,
      expires: session.refreshExpiresAt,
    });
    // The refresh token is never returned in the body; the access token is kept in memory by the client.
    return { accessToken: session.accessToken, expiresIn: this.config.jwtAccessTtl, user: session.user };
  }

  private clearRefreshCookie(res: Response) {
    res.clearCookie(REFRESH_COOKIE, { path: REFRESH_COOKIE_PATH, httpOnly: true, secure: this.config.cookieSecure, sameSite: 'strict' });
  }
}
