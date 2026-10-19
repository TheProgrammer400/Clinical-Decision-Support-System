import { BadRequestException, Injectable, ServiceUnavailableException } from '@nestjs/common';
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';
import { generateSecret, generateURI, verify } from 'otplib';
import { AppConfigService } from '../config/config.service';

const ISSUER = 'CDSS';
// Accept the previous and next 30 s step to tolerate clock drift.
const EPOCH_TOLERANCE_SECONDS = 30;

/** TOTP (RFC 6238) helpers. Secrets are encrypted at rest with AES-256-GCM. */
@Injectable()
export class MfaService {
  constructor(private readonly config: AppConfigService) {}

  get isAvailable(): boolean {
    return this.config.mfaEncryptionKey !== null;
  }

  createEnrollment(email: string): { secret: string; otpauthUri: string } {
    this.requireKey();
    const secret = generateSecret();
    return { secret, otpauthUri: generateURI({ issuer: ISSUER, label: email, secret }) };
  }

  /** Returns the matched time step on success so callers can prevent replay. */
  async verifyCode(secret: string, code: string): Promise<number | null> {
    if (!/^\d{6}$/.test(code)) {
      return null;
    }
    const result = await verify({ secret, token: code, epochTolerance: EPOCH_TOLERANCE_SECONDS });
    // The root otplib verify() is typed as TOTP|HOTP; TOTP results carry the matched time step.
    return result.valid && 'timeStep' in result ? result.timeStep : null;
  }

  encryptSecret(secret: string): string {
    const key = this.requireKey();
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', key, iv);
    const ciphertext = Buffer.concat([cipher.update(secret, 'utf8'), cipher.final()]);
    return [iv, cipher.getAuthTag(), ciphertext].map((b) => b.toString('base64')).join(':');
  }

  decryptSecret(encoded: string): string {
    const key = this.requireKey();
    const [iv, tag, ciphertext] = encoded.split(':').map((part) => Buffer.from(part, 'base64'));
    if (!iv || !tag || !ciphertext) {
      throw new BadRequestException('Stored MFA secret is malformed');
    }
    const decipher = createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8');
  }

  private requireKey(): Buffer {
    const key = this.config.mfaEncryptionKey;
    if (!key) {
      throw new ServiceUnavailableException({
        code: 'MFA_NOT_CONFIGURED',
        message: 'Multi-factor authentication is not configured on this server (MFA_ENCRYPTION_KEY).',
      });
    }
    return key;
  }
}
