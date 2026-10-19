import { Injectable, Logger } from '@nestjs/common';
import { promises as fs } from 'fs';
import * as path from 'path';
import { AppConfigService } from '../../config/config.service';
import { ArtifactStorage, parseArtifactKey } from './artifact-storage';

/**
 * Stores artifacts on the local filesystem under ARTIFACT_STORAGE_DIR.
 *
 * Limitation: on platforms with ephemeral or per-instance disks (e.g. multiple ECS Fargate
 * tasks) files are not shared between instances and are lost on redeploy. A shared object
 * store implementation of ArtifactStorage is required for such deployments.
 */
@Injectable()
export class LocalArtifactStorage implements ArtifactStorage {
  private readonly logger = new Logger(LocalArtifactStorage.name);
  private readonly baseDir: string;

  constructor(config: AppConfigService) {
    this.baseDir = config.artifactStorageDir;
  }

  async put(key: string, data: Buffer): Promise<void> {
    const file = this.resolve(key);
    await fs.mkdir(path.dirname(file), { recursive: true, mode: 0o700 });
    await fs.writeFile(file, data, { mode: 0o600 });
  }

  async get(key: string): Promise<Buffer | null> {
    try {
      return await fs.readFile(this.resolve(key));
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
        return null;
      }
      throw err;
    }
  }

  async deleteCase(caseId: string): Promise<void> {
    if (!/^[0-9a-f-]{36}$/.test(caseId)) {
      throw new Error('Invalid case id');
    }
    await fs.rm(this.contain(path.join(this.baseDir, caseId)), { recursive: true, force: true });
  }

  /** Maps a validated key to an absolute path that is guaranteed to stay inside baseDir. */
  private resolve(key: string): string {
    const parsed = parseArtifactKey(key);
    if (!parsed) {
      this.logger.warn('Rejected malformed artifact key');
      throw new Error('Invalid artifact key');
    }
    return this.contain(path.join(this.baseDir, parsed.relativePath));
  }

  private contain(candidate: string): string {
    const resolved = path.resolve(candidate);
    if (resolved !== this.baseDir && !resolved.startsWith(this.baseDir + path.sep)) {
      throw new Error('Artifact path escapes storage directory');
    }
    return resolved;
  }
}
