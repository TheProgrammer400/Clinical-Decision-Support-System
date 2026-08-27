import { Injectable, UnauthorizedException, ConflictException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../../database/prisma.service';
import { AppConfigService } from '../config/config.service';
import { AuditService } from '../audit/audit.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { Role } from '@prisma/client';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: AppConfigService,
    private readonly auditService: AuditService,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });

    if (existing) {
      throw new ConflictException('User with this email already exists');
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(dto.password, salt);

    let organizationId: string | undefined = undefined;

    if (dto.organizationName) {
      const org = await this.prisma.organization.create({
        data: { name: dto.organizationName },
      });
      organizationId = org.id;
    }

    const user = await this.prisma.user.create({
      data: {
        email: dto.email.toLowerCase(),
        passwordHash,
        fullName: dto.fullName,
        role: dto.role || Role.DOCTOR,
        organizationId,
      },
    });

    await this.auditService.log({
      actorUserId: user.id,
      action: 'auth.register',
      resourceType: 'User',
      resourceId: user.id,
      metadata: { role: user.role, organizationId: user.organizationId },
    });

    return this.generateTokens(user);
  }

  async login(dto: LoginDto, ipAddress?: string) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const isMatch = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isMatch) {
      await this.auditService.log({
        action: 'auth.login_failed',
        resourceType: 'User',
        resourceId: user.id,
        ipAddress,
      });
      throw new UnauthorizedException('Invalid email or password');
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    await this.auditService.log({
      actorUserId: user.id,
      action: 'auth.login_success',
      resourceType: 'User',
      resourceId: user.id,
      ipAddress,
    });

    return this.generateTokens(user);
  }

  async refreshTokens(refreshToken: string) {
    try {
      const payload = this.jwtService.verify(refreshToken, {
        secret: this.configService.jwtRefreshSecret,
      });

      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
      });

      if (!user || user.refreshTokenVersion !== payload.tokenVersion) {
        throw new UnauthorizedException('Refresh token is invalid or has been revoked');
      }

      return this.generateTokens(user);
    } catch (e) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
  }

  async logout(userId: string) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { refreshTokenVersion: { increment: 1 } },
    });

    await this.auditService.log({
      actorUserId: userId,
      action: 'auth.logout',
      resourceType: 'User',
      resourceId: userId,
    });

    return { message: 'Logged out successfully' };
  }

  private async generateTokens(user: { id: string; email: string; role: string; organizationId?: string; fullName: string; refreshTokenVersion: number }) {
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      organizationId: user.organizationId,
      tokenVersion: user.refreshTokenVersion,
    };

    const accessToken = this.jwtService.sign(payload, {
      secret: this.configService.jwtAccessSecret,
      expiresIn: this.configService.jwtAccessTtl,
    });

    const refreshToken = this.jwtService.sign(payload, {
      secret: this.configService.jwtRefreshSecret,
      expiresIn: this.configService.jwtRefreshTtl,
    });

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        organizationId: user.organizationId,
      },
    };
  }
}
