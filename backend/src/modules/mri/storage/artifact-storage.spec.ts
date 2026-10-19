import { mkdtempSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import * as path from 'path';
import { buildArtifactKey, contentTypeForKey, parseArtifactKey } from './artifact-storage';
import { LocalArtifactStorage } from './local-artifact-storage';
import { detectImageType } from '../image-sniffing';

const C = '11111111-1111-4111-8111-111111111111';
const M = '22222222-2222-4222-8222-222222222222';

describe('artifact keys', () => {
  it('builds and parses current keys', () => {
    const key = buildArtifactKey(C, M, 'original', 'jpg');
    expect(key).toBe(`${C}/${M}/original.jpg`);
    expect(parseArtifactKey(key)?.relativePath).toBe(key);
    expect(contentTypeForKey(key)).toBe('image/jpeg');
  });

  it('accepts keys written by earlier versions', () => {
    expect(parseArtifactKey(`org/default/case/${C}/mri/${M}/mask.png`)?.relativePath).toBe(`${C}/${M}/mask.png`);
  });

  it.each([`../${C}/${M}/original.png`, `${C}/../../etc/passwd`, `${C}/${M}/original.png/../../x`, '/etc/passwd', `${C}/${M}/secret.png`])(
    'rejects malformed or traversing key %s',
    (key) => {
      expect(parseArtifactKey(key)).toBeNull();
    },
  );

  it('refuses to build keys from non-UUID components', () => {
    expect(() => buildArtifactKey('../..', M, 'mask', 'png')).toThrow();
  });
});

describe('LocalArtifactStorage', () => {
  let dir: string;
  let storage: LocalArtifactStorage;

  beforeEach(() => {
    dir = mkdtempSync(path.join(tmpdir(), 'cdss-art-'));
    storage = new LocalArtifactStorage({ artifactStorageDir: dir } as never);
  });
  afterEach(() => rmSync(dir, { recursive: true, force: true }));

  it('round-trips data and returns null for missing objects', async () => {
    const key = buildArtifactKey(C, M, 'mask', 'png');
    await storage.put(key, Buffer.from('abc'));
    expect((await storage.get(key))?.toString()).toBe('abc');
    expect(await storage.get(buildArtifactKey(C, M, 'overlay', 'png'))).toBeNull();
  });

  it('never reads outside the storage directory', async () => {
    await expect(storage.get('../outside.png')).rejects.toThrow('Invalid artifact key');
    await expect(storage.deleteCase('../..')).rejects.toThrow();
  });

  it('deletes all artifacts of a case', async () => {
    const key = buildArtifactKey(C, M, 'original', 'png');
    await storage.put(key, Buffer.from('a'));
    await storage.deleteCase(C);
    expect(await storage.get(key)).toBeNull();
  });
});

describe('detectImageType', () => {
  it('identifies images by magic bytes, not by claimed type', () => {
    expect(detectImageType(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0]))?.ext).toBe('png');
    expect(detectImageType(Buffer.from([0xff, 0xd8, 0xff, 0xe0]))?.ext).toBe('jpg');
    expect(detectImageType(Buffer.from('RIFF0000WEBPVP8 '))?.ext).toBe('webp');
    expect(detectImageType(Buffer.from('<svg onload=alert(1)>'))).toBeNull();
    expect(detectImageType(Buffer.alloc(0))).toBeNull();
  });
});
