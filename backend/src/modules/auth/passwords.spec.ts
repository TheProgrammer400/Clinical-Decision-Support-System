import * as bcrypt from 'bcryptjs';
import { hashPassword, verifyPassword } from './passwords';

describe('passwords', () => {
  it('hashes with argon2id and verifies', async () => {
    const hash = await hashPassword('correct horse battery');
    expect(hash.startsWith('$argon2id$')).toBe(true);
    expect(await verifyPassword(hash, 'correct horse battery')).toEqual({ valid: true, needsRehash: false });
    expect((await verifyPassword(hash, 'wrong')).valid).toBe(false);
  });

  it('verifies legacy bcrypt hashes and requests a rehash (no lockout on migration)', async () => {
    const legacy = await bcrypt.hash('legacy-password', 10);
    expect(await verifyPassword(legacy, 'legacy-password')).toEqual({ valid: true, needsRehash: true });
    expect(await verifyPassword(legacy, 'nope')).toEqual({ valid: false, needsRehash: false });
  });

  it('treats garbage hashes as invalid instead of throwing', async () => {
    expect(await verifyPassword('not-a-hash', 'x')).toEqual({ valid: false, needsRehash: false });
  });
});
