import { Injectable, Logger } from '@nestjs/common';
import { AppConfigService } from '../../config/config.service';
import * as fs from 'fs';
import * as path from 'path';

export interface StorageUploadResult {
  key: string;
  url: string;
}

@Injectable()
export class S3ArtifactService {
  private readonly logger = new Logger(S3ArtifactService.name);
  private readonly localStorageDir: string;

  constructor(private readonly configService: AppConfigService) {
    // Local storage fallback path inside project directory
    this.localStorageDir = path.join(process.cwd(), 'uploads', 'mri');
    if (!fs.existsSync(this.localStorageDir)) {
      fs.mkdirSync(this.localStorageDir, { recursive: true });
    }
  }

  /**
   * Uploads an image buffer to storage (S3 or local disk fallback).
   */
  async uploadArtifact(
    caseId: string,
    mriId: string,
    kind: 'original' | 'mask' | 'overlay',
    fileBuffer: Buffer,
    mimeType: string = 'image/png',
  ): Promise<StorageUploadResult> {
    const fileExt = kind === 'original' ? 'png' : 'png';
    const key = `org/default/case/${caseId}/mri/${mriId}/${kind}.${fileExt}`;

    // For local dev, store in local filesystem under uploads/mri/
    const targetDir = path.join(this.localStorageDir, caseId, mriId);
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }
    const localFilePath = path.join(targetDir, `${kind}.${fileExt}`);
    fs.writeFileSync(localFilePath, fileBuffer);

    this.logger.log(`Artifact saved to local storage: key=${key}, path=${localFilePath}`);

    // Generate local URL served via backend API controller
    const url = `/api/v1/mri/artifacts/${caseId}/${mriId}/${kind}.${fileExt}`;

    return { key, url };
  }

  /**
   * Generates presigned / accessible GET URL for artifact.
   */
  async getPresignedUrl(
    caseId: string,
    mriId: string,
    kind: 'original' | 'mask' | 'overlay',
  ): Promise<string> {
    // Return relative URL for client consumption
    return `/api/v1/mri/artifacts/${caseId}/${mriId}/${kind}.png`;
  }

  /**
   * Serves file buffer from local storage.
   */
  getLocalFileBuffer(caseId: string, mriId: string, kind: string): Buffer | null {
    const fileExt = kind.endsWith('.png') ? '' : '.png';
    const localFilePath = path.join(this.localStorageDir, caseId, mriId, `${kind}${fileExt}`);
    if (fs.existsSync(localFilePath)) {
      return fs.readFileSync(localFilePath);
    }
    return null;
  }
}
