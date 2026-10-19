import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AccountStatus, Prisma, Role, User } from '@prisma/client';
import { randomUUID } from 'crypto';
import { PrismaService } from '../../database/prisma.service';
import { AuditService } from '../audit/audit.service';
import { AppConfigService } from '../config/config.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { MfaService } from './mfa.service';
import { hashPassword, verifyAgainstDummy, verifyPassword } from './passwords';
import { generateOpaqueToken, hashToken } from './tokens';

export const MAX_FAILED_LOGINS = 5;
export const LOCKOUT_MINUTES = 15;
const MFA_TOKEN_TTL_SECONDS = 300;
const PASSWORD_RESET_TTL_MINUTES = 60;
const INVALID_CREDENTIALS = 'Invalid email or password.';

export interface SessionUser {
  id: string;
  email: string;
  fullName: string;
  role: Role;
  organizationId: string | null;
  mustChangePassword: boolean;
  mfaEnabled: boolean;
}

export interface IssuedSession {
  accessToken: string;
  refreshToken: string;
  refreshExpiresAt: Date;
  user: SessionUser;
}

export type LoginResult = ({ mfaRequired: false } & IssuedSession) | { mfaRequired: true; mfaToken: string };

export interface RequestMeta {
  ipAddress?: string;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly config: AppConfigService,
    private readonly auditService: AuditService,
    private readonly mfaService: MfaService,
  ) {}

  // ---------------------------------------------------------------- registration

  async register(dto: RegisterDto, meta: RequestMeta = {}) {
    if (dto.password !== dto.confirmPassword) {
      throw new BadRequestException('Passwords do not match');
    }

    const email = dto.email.trim().toLowerCase();
    const existing = await this.prisma.user.findUnique({ where: { email } });
    // The same response is returned whether or not the address is registered, so the
    // endpoint cannot be used to discover accounts. Only a REJECTED request may be resubmitted.
    const accepted = {
      message: 'Registration request received. An administrator must approve it before you can sign in.',
      status: AccountStatus.PENDING,
    };

    if (existing) {
      if (existing.accountStatus === AccountStatus.REJECTED) {
        await this.prisma.$transaction(async (tx) => {
          const organizationId = dto.organizationName
            ? (await tx.organization.create({ data: { name: dto.organizationName.trim() } })).id
            : existing.organizationId;
          await tx.user.update({
            where: { id: existing.id },
            data: {
              passwordHash: await hashPassword(dto.password),
              fullName: dto.fullName.trim(),
              accountStatus: AccountStatus.PENDING,
              organizationId,
              refreshTokenVersion: { increment: 1 },
            },
          });
        });
        await this.auditService.log({
          actorUserId: existing.id,
          organizationId: existing.organizationId,
          action: 'auth.register_resubmitted',
          resourceType: 'User',
          resourceId: existing.id,
          ipAddress: meta.ipAddress,
        });
      } else {
        await this.auditService.log({
          action: 'auth.register_duplicate',
          resourceType: 'User',
          resourceId: existing.id,
          ipAddress: meta.ipAddress,
        });
      }
      return accepted;
    }

    const passwordHash = await hashPassword(dto.password);
    const user = await this.prisma.$transaction(async (tx) => {
      const organizationId = dto.organizationName
        ? (await tx.organization.create({ data: { name: dto.organizationName.trim() } })).id
        : null;
      return tx.user.create({
        data: {
          email,
          passwordHash,
          fullName: dto.fullName.trim(),
          role: Role.DOCTOR,
          accountStatus: AccountStatus.PENDING,
          organizationId,
          passwordChangedAt: new Date(),
        },
      });
    });

    await this.auditService.log({
      actorUserId: user.id,
      organizationId: user.organizationId,
      action: 'auth.register_pending',
      resourceType: 'User',
      resourceId: user.id,
      ipAddress: meta.ipAddress,
    });
    return accepted;
  }

  // ---------------------------------------------------------------- login

  async login(dto: LoginDto, meta: RequestMeta = {}): Promise<LoginResult> {
    const email = dto.email.trim().toLowerCase();
    const user = await this.prisma.user.findUnique({ where: { email } });

    if (!user) {
      await verifyAgainstDummy(dto.password);
      throw new UnauthorizedException(INVALID_CREDENTIALS);
    }

    if (user.lockedUntil && user.lockedUntil > new Date()) {
      await verifyAgainstDummy(dto.password);
      await this.auditService.log({
        action: 'auth.login_locked',
        resourceType: 'User',
        resourceId: user.id,
        organizationId: user.organizationId,
        ipAddress: meta.ipAddress,
      });
      throw new UnauthorizedException(INVALID_CREDENTIALS);
    }

    const check = await verifyPassword(user.passwordHash, dto.password);
    if (!check.valid) {
      await this.recordFailedLogin(user, meta);
      throw new UnauthorizedException(INVALID_CREDENTIALS);
    }

    // Account state is only disclosed to someone who has proven they know the password.
    this.assertAccountActive(user);

    const updates: Prisma.UserUpdateInput = { failedLoginCount: 0, lockedUntil: null };
    if (check.needsRehash) {
      updates.passwordHash = await hashPassword(dto.password);
    }
    await this.prisma.user.update({ where: { id: user.id }, data: updates });

    if (user.mfaEnabled) {
      const mfaToken = await this.jwtService.signAsync(
        { sub: user.id, tv: user.refreshTokenVersion, purpose: 'mfa' },
        { secret: this.config.jwtAccessSecret, expiresIn: MFA_TOKEN_TTL_SECONDS, audience: 'cdss-mfa' },
      );
      return { mfaRequired: true, mfaToken };
    }

    return { mfaRequired: false, ...(await this.completeLogin(user, meta)) };
  }

  async completeMfaLogin(mfaToken: string, code: string, meta: RequestMeta = {}): Promise<IssuedSession> {
    let payload: { sub: string; tv: number; purpose: string };
    try {
      payload = await this.jwtService.verifyAsync(mfaToken, { secret: this.config.jwtAccessSecret, audience: 'cdss-mfa' });
    } catch {
      throw new UnauthorizedException('MFA session expired. Please sign in again.');
    }
    const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user || payload.purpose !== 'mfa' || user.refreshTokenVersion !== payload.tv || !user.mfaEnabled || !user.mfaSecretEnc) {
      throw new UnauthorizedException('MFA session expired. Please sign in again.');
    }
    this.assertAccountActive(user);

    if (!(await this.consumeTotp(user, code))) {
      await this.recordFailedLogin(user, meta);
      throw new UnauthorizedException('Invalid verification code.');
    }
    await this.prisma.user.update({ where: { id: user.id }, data: { failedLoginCount: 0, lockedUntil: null } });
    return this.completeLogin(user, meta);
  }

  private async completeLogin(user: User, meta: RequestMeta): Promise<IssuedSession> {
    await this.prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
    await this.auditService.log({
      actorUserId: user.id,
      organizationId: user.organizationId,
      action: 'auth.login_success',
      resourceType: 'User',
      resourceId: user.id,
      ipAddress: meta.ipAddress,
      metadata: { mfa: user.mfaEnabled },
    });
    return this.issueSession(user);
  }

  private async recordFailedLogin(user: User, meta: RequestMeta) {
    const failed = user.failedLoginCount + 1;
    const lock = failed >= MAX_FAILED_LOGINS;
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        failedLoginCount: lock ? 0 : failed,
        lockedUntil: lock ? new Date(Date.now() + LOCKOUT_MINUTES * 60_000) : user.lockedUntil,
      },
    });
    await this.auditService.log({
      action: lock ? 'auth.account_locked' : 'auth.login_failed',
      resourceType: 'User',
      resourceId: user.id,
      organizationId: user.organizationId,
      ipAddress: meta.ipAddress,
    });
  }

  private assertAccountActive(user: User) {
    if (user.accountStatus === AccountStatus.PENDING) {
      throw new ForbiddenException({ code: 'ACCOUNT_PENDING', message: 'Your registration is awaiting administrator approval.' });
    }
    if (user.accountStatus !== AccountStatus.APPROVED) {
      throw new ForbiddenException({ code: 'ACCOUNT_INACTIVE', message: 'This account is not active. Contact your administrator.' });
    }
  }

  // ---------------------------------------------------------------- sessions

  private async issueSession(user: User, familyId: string = randomUUID()): Promise<IssuedSession> {
    const accessToken = await this.jwtService.signAsync(
      { sub: user.id, tv: user.refreshTokenVersion },
      { secret: this.config.jwtAccessSecret, expiresIn: this.config.jwtAccessTtl },
    );
    const refreshToken = generateOpaqueToken();
    const refreshExpiresAt = new Date(Date.now() + this.config.refreshTokenTtl * 1000);
    await this.prisma.refreshToken.create({
      data: { userId: user.id, familyId, tokenHash: hashToken(refreshToken), expiresAt: refreshExpiresAt },
    });
    return { accessToken, refreshToken, refreshExpiresAt, user: toSessionUser(user) };
  }

  /**
   * Rotates a refresh token. Each token is single-use; presenting one that was already
   * rotated or revoked is treated as theft: the whole token family and all access tokens
   * for the user are revoked.
   */
  async refresh(rawToken: string | undefined, meta: RequestMeta = {}): Promise<IssuedSession> {
    if (!rawToken) {
      throw new UnauthorizedException('Session expired. Please sign in again.');
    }
    const stored = await this.prisma.refreshToken.findUnique({ where: { tokenHash: hashToken(rawToken) }, include: { user: true } });
    if (!stored) {
      throw new UnauthorizedException('Session expired. Please sign in again.');
    }

    if (stored.revokedAt || stored.rotatedAt) {
      await this.revokeAllSessions(stored.userId);
      await this.auditService.log({
        action: 'auth.refresh_token_reuse_detected',
        resourceType: 'User',
        resourceId: stored.userId,
        organizationId: stored.user.organizationId,
        ipAddress: meta.ipAddress,
        metadata: { familyId: stored.familyId },
      });
      throw new UnauthorizedException('Session expired. Please sign in again.');
    }
    if (stored.expiresAt <= new Date() || stored.user.accountStatus !== AccountStatus.APPROVED) {
      throw new UnauthorizedException('Session expired. Please sign in again.');
    }

    // Atomic claim: only one concurrent request can rotate a given token.
    const claimed = await this.prisma.refreshToken.updateMany({
      where: { id: stored.id, rotatedAt: null, revokedAt: null },
      data: { rotatedAt: new Date() },
    });
    if (claimed.count !== 1) {
      throw new UnauthorizedException('Session expired. Please sign in again.');
    }
    return this.issueSession(stored.user, stored.familyId);
  }

  async logout(userId: string, meta: RequestMeta = {}) {
    const user = await this.revokeAllSessions(userId);
    await this.auditService.log({
      actorUserId: userId,
      organizationId: user.organizationId,
      action: 'auth.logout',
      resourceType: 'User',
      resourceId: userId,
      ipAddress: meta.ipAddress,
    });
    return { message: 'Logged out successfully' };
  }

  /** Invalidates every access token (via the session generation) and every refresh token. */
  async revokeAllSessions(userId: string, extra: Prisma.UserUpdateInput = {}, tx: Prisma.TransactionClient = this.prisma) {
    const [user] = await Promise.all([
      tx.user.update({ where: { id: userId }, data: { ...extra, refreshTokenVersion: { increment: 1 } } }),
      tx.refreshToken.updateMany({ where: { userId, revokedAt: null }, data: { revokedAt: new Date() } }),
    ]);
    return user;
  }

  // ---------------------------------------------------------------- passwords

  async changePassword(userId: string, currentPassword: string, newPassword: string, meta: RequestMeta = {}) {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    const check = await verifyPassword(user.passwordHash, currentPassword);
    if (!check.valid) {
      await this.recordFailedLogin(user, meta);
      throw new BadRequestException('Current password is incorrect.');
    }
    if ((await verifyPassword(user.passwordHash, newPassword)).valid) {
      throw new BadRequestException('The new password must be different from the current password.');
    }

    const updated = await this.revokeAllSessions(user.id, {
      passwordHash: await hashPassword(newPassword),
      passwordChangedAt: new Date(),
      mustChangePassword: false,
      failedLoginCount: 0,
      lockedUntil: null,
    });
    await this.auditService.log({
      actorUserId: user.id,
      organizationId: user.organizationId,
      action: 'auth.password_changed',
      resourceType: 'User',
      resourceId: user.id,
      ipAddress: meta.ipAddress,
    });
    return this.issueSession(updated);
  }

  /** Creates a single-use reset link token. Called by an authorized administrator. */
  async createPasswordResetToken(targetUserId: string, createdById: string) {
    const token = generateOpaqueToken();
    const expiresAt = new Date(Date.now() + PASSWORD_RESET_TTL_MINUTES * 60_000);
    await this.prisma.$transaction([
      // Only the newest link is valid.
      this.prisma.passwordResetToken.updateMany({ where: { userId: targetUserId, usedAt: null }, data: { usedAt: new Date() } }),
      this.prisma.passwordResetToken.create({ data: { userId: targetUserId, tokenHash: hashToken(token), expiresAt, createdById } }),
    ]);
    return { token, expiresAt };
  }

  async resetPassword(rawToken: string, newPassword: string, meta: RequestMeta = {}) {
    const stored = await this.prisma.passwordResetToken.findUnique({ where: { tokenHash: hashToken(rawToken) }, include: { user: true } });
    if (!stored || stored.usedAt || stored.expiresAt <= new Date()) {
      throw new BadRequestException('This reset link is invalid or has expired.');
    }
    const claimed = await this.prisma.passwordResetToken.updateMany({
      where: { id: stored.id, usedAt: null },
      data: { usedAt: new Date() },
    });
    if (claimed.count !== 1) {
      throw new BadRequestException('This reset link is invalid or has expired.');
    }
    await this.revokeAllSessions(stored.userId, {
      passwordHash: await hashPassword(newPassword),
      passwordChangedAt: new Date(),
      mustChangePassword: false,
      failedLoginCount: 0,
      lockedUntil: null,
    });
    await this.auditService.log({
      actorUserId: stored.userId,
      organizationId: stored.user.organizationId,
      action: 'auth.password_reset_completed',
      resourceType: 'User',
      resourceId: stored.userId,
      ipAddress: meta.ipAddress,
    });
    return { message: 'Password updated. You can now sign in.' };
  }

  // ---------------------------------------------------------------- MFA

  async beginMfaEnrollment(userId: string) {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    if (user.mfaEnabled) {
      throw new ConflictException('MFA is already enabled. Disable it first to re-enrol.');
    }
    const { secret, otpauthUri } = this.mfaService.createEnrollment(user.email);
    await this.prisma.user.update({ where: { id: userId }, data: { mfaSecretEnc: this.mfaService.encryptSecret(secret), mfaLastUsedStep: null } });
    return { secret, otpauthUri };
  }

  async confirmMfaEnrollment(userId: string, code: string, meta: RequestMeta = {}) {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    if (user.mfaEnabled || !user.mfaSecretEnc) {
      throw new BadRequestException('No pending MFA enrolment. Start enrolment first.');
    }
    if (!(await this.consumeTotp(user, code))) {
      throw new BadRequestException('Invalid verification code.');
    }
    await this.prisma.user.update({ where: { id: userId }, data: { mfaEnabled: true } });
    await this.auditService.log({
      actorUserId: userId,
      organizationId: user.organizationId,
      action: 'auth.mfa_enabled',
      resourceType: 'User',
      resourceId: userId,
      ipAddress: meta.ipAddress,
    });
    return { mfaEnabled: true };
  }

  async disableMfa(userId: string, code: string, meta: RequestMeta = {}) {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    if (!user.mfaEnabled) {
      throw new BadRequestException('MFA is not enabled.');
    }
    if (!(await this.consumeTotp(user, code))) {
      throw new BadRequestException('Invalid verification code.');
    }
    await this.prisma.user.update({ where: { id: userId }, data: { mfaEnabled: false, mfaSecretEnc: null, mfaLastUsedStep: null } });
    await this.auditService.log({
      actorUserId: userId,
      organizationId: user.organizationId,
      action: 'auth.mfa_disabled',
      resourceType: 'User',
      resourceId: userId,
      ipAddress: meta.ipAddress,
    });
    return { mfaEnabled: false };
  }

  /** Verifies a TOTP code and atomically records its time step so it cannot be replayed. */
  private async consumeTotp(user: User, code: string): Promise<boolean> {
    if (!user.mfaSecretEnc) {
      return false;
    }
    const step = await this.mfaService.verifyCode(this.mfaService.decryptSecret(user.mfaSecretEnc), code);
    if (step === null) {
      return false;
    }
    const claimed = await this.prisma.user.updateMany({
      where: { id: user.id, OR: [{ mfaLastUsedStep: null }, { mfaLastUsedStep: { lt: step } }] },
      data: { mfaLastUsedStep: step },
    });
    return claimed.count === 1;
  }

  async getSessionUser(userId: string): Promise<SessionUser> {
    return toSessionUser(await this.prisma.user.findUniqueOrThrow({ where: { id: userId } }));
  }
}

export function toSessionUser(user: User): SessionUser {
  return {
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    role: user.role,
    organizationId: user.organizationId,
    mustChangePassword: user.mustChangePassword,
    mfaEnabled: user.mfaEnabled,
  };
}
