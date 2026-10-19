import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { AccountStatus } from '@prisma/client';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../../../database/prisma.service';
import { AuthUser } from '../../../common/decorators/user.decorator';
import { AppConfigService } from '../../config/config.service';

export interface AccessTokenPayload {
  sub: string;
  /** Session generation at issue time; must match the user's current generation. */
  tv: number;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    config: AppConfigService,
    private readonly prisma: PrismaService,
  ) {
    super({
      // Bearer header only: cookies are reserved for the refresh token.
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.jwtAccessSecret,
      algorithms: ['HS256'],
    });
  }

  async validate(payload: AccessTokenPayload & { aud?: unknown }): Promise<AuthUser> {
    // MFA step-up tokens carry an audience and must never be accepted as access tokens.
    if (payload.aud !== undefined || typeof payload.tv !== 'number') {
      throw new UnauthorizedException('Invalid access token');
    }
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, email: true, role: true, organizationId: true, refreshTokenVersion: true, accountStatus: true, mustChangePassword: true },
    });

    if (!user || user.accountStatus !== AccountStatus.APPROVED || user.refreshTokenVersion !== payload.tv) {
      throw new UnauthorizedException('Session is no longer valid. Please sign in again.');
    }

    return {
      userId: user.id,
      email: user.email,
      role: user.role,
      organizationId: user.organizationId,
      mustChangePassword: user.mustChangePassword,
    };
  }
}
