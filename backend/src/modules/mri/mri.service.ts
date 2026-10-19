import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  UnsupportedMediaTypeException,
} from '@nestjs/common';
import { MriAnalysis, MriStatus, Prisma } from '@prisma/client';
import { randomUUID } from 'crypto';
import { AuthUser } from '../../common/decorators/user.decorator';
import { CaseAccessService } from '../../common/policies/case-access.service';
import { PrismaService } from '../../database/prisma.service';
import { AuditService } from '../audit/audit.service';
import { detectImageType } from './image-sniffing';
import {
  MRI_INFERENCE_PROVIDER,
  MriInferenceError,
  MriInferenceProvider,
  SingleImageInferenceResult,
} from './interfaces/mri-inference-provider.interface';
import { normalizeMriFindings } from './mri-findings';
import {
  ARTIFACT_STORAGE,
  ArtifactKind,
  ArtifactStorage,
  buildArtifactKey,
  contentTypeForKey,
} from './storage/artifact-storage';

export interface UploadedImage {
  originalname: string;
  buffer: Buffer;
  size: number;
}

const INFERENCE_UNAVAILABLE = 'The MRI inference service could not process this image. No measurements were produced.';

@Injectable()
export class MriService {
  private readonly logger = new Logger(MriService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(MRI_INFERENCE_PROVIDER) private readonly inferenceClient: MriInferenceProvider,
    @Inject(ARTIFACT_STORAGE) private readonly storage: ArtifactStorage,
    private readonly auditService: AuditService,
    private readonly caseAccess: CaseAccessService,
  ) {}

  async processMriUploads(user: AuthUser, caseId: string, files: UploadedImage[] | undefined) {
    const clinicalCase = await this.caseAccess.getCaseOrThrow(user, caseId, 'act');
    if (!files || files.length === 0) {
      throw new BadRequestException('No MRI files provided');
    }

    // Validate every file before storing anything (size limits are enforced earlier by multer).
    const prepared = files.map((file) => {
      const detected = detectImageType(file.buffer);
      if (!detected) {
        throw new UnsupportedMediaTypeException(`'${safeName(file.originalname)}' is not a PNG, JPEG or WebP image.`);
      }
      return { file, detected, mriId: randomUUID() };
    });

    const records = new Map<string, { mriId: string }>();
    for (const item of prepared) {
      const key = buildArtifactKey(caseId, item.mriId, 'original', item.detected.ext);
      await this.storage.put(key, item.file.buffer);
      await this.prisma.mriAnalysis.create({
        data: {
          id: item.mriId,
          clinicalCaseId: caseId,
          originalFilename: safeName(item.file.originalname),
          originalImageKey: key,
          status: MriStatus.PROCESSING,
        },
      });
      records.set(`${item.mriId}.${item.detected.ext}`, { mriId: item.mriId });
    }

    let results: SingleImageInferenceResult[] = [];
    try {
      const response = await this.inferenceClient.analyzeImages(
        prepared.map((p) => ({ filename: `${p.mriId}.${p.detected.ext}`, buffer: p.file.buffer, mimetype: p.detected.mimeType })),
      );
      results = response.data;
    } catch (err) {
      const reason = err instanceof MriInferenceError ? err.message : String(err);
      this.logger.error(`MRI inference failed for caseId=${caseId}: ${reason}`);
    }

    // Results are matched by the server-generated filename, never by array position.
    for (const result of results) {
      const record = records.get(result.image_name);
      if (!record) {
        this.logger.warn('Inference returned a result for an unknown image; ignored.');
        continue;
      }
      records.delete(result.image_name);
      await this.storeResult(caseId, record.mriId, result);
    }

    // Anything without a matching result failed.
    for (const { mriId } of records.values()) {
      await this.prisma.mriAnalysis.update({
        where: { id: mriId },
        data: { status: MriStatus.FAILED, errorMessage: INFERENCE_UNAVAILABLE },
      });
    }

    await this.auditService.log({
      actorUserId: user.userId,
      organizationId: clinicalCase.organizationId,
      action: 'mri.upload',
      resourceType: 'ClinicalCase',
      resourceId: caseId,
      metadata: { files: prepared.length, failed: records.size },
    });

    return this.listForCase(caseId);
  }

  private async storeResult(caseId: string, mriId: string, result: SingleImageInferenceResult) {
    const findings = normalizeMriFindings(result.findings);
    if (result.status !== 'completed' || !result.visualizations || !findings || findings.segmentedPixels === null) {
      await this.prisma.mriAnalysis.update({
        where: { id: mriId },
        data: {
          status: MriStatus.FAILED,
          // The inference service returns user-safe messages for invalid images.
          errorMessage: (result.error_message ?? 'Image segmentation failed').slice(0, 300),
          modelVersion: result.model_version,
          processingTimeMs: result.processing_time_ms,
        },
      });
      return;
    }

    try {
      const mask = decodePng(result.visualizations.segmented_mask);
      const overlay = decodePng(result.visualizations.tumor_overlay);
      const maskKey = buildArtifactKey(caseId, mriId, 'mask', 'png');
      const overlayKey = buildArtifactKey(caseId, mriId, 'overlay', 'png');
      await this.storage.put(maskKey, mask);
      await this.storage.put(overlayKey, overlay);
      await this.prisma.mriAnalysis.update({
        where: { id: mriId },
        data: {
          status: MriStatus.COMPLETED,
          findings: result.findings as Prisma.InputJsonValue,
          maskImageKey: maskKey,
          overlayImageKey: overlayKey,
          modelVersion: result.model_version,
          processingTimeMs: result.processing_time_ms,
          errorMessage: null,
        },
      });
    } catch (err) {
      this.logger.error(`Storing MRI artifacts failed for mriId=${mriId}: ${err instanceof Error ? err.message : err}`);
      await this.prisma.mriAnalysis.update({
        where: { id: mriId },
        data: { status: MriStatus.FAILED, errorMessage: 'Segmentation output could not be stored.' },
      });
    }
  }

  async getMriAnalysesForCase(user: AuthUser, caseId: string) {
    await this.caseAccess.getCaseOrThrow(user, caseId, 'read');
    return this.listForCase(caseId);
  }

  private async listForCase(caseId: string) {
    const analyses = await this.prisma.mriAnalysis.findMany({ where: { clinicalCaseId: caseId }, orderBy: { createdAt: 'asc' } });
    return analyses.map(serializeMri);
  }

  async getArtifact(user: AuthUser, caseId: string, mriId: string, kind: ArtifactKind) {
    const clinicalCase = await this.caseAccess.getCaseOrThrow(user, caseId, 'read');
    const mri = await this.prisma.mriAnalysis.findFirst({ where: { id: mriId, clinicalCaseId: caseId } });
    const key = mri ? artifactKey(mri, kind) : null;
    const data = key ? await this.storage.get(key).catch(() => null) : null;
    if (!key || !data) {
      throw new NotFoundException('Artifact not found');
    }
    await this.auditService.log({
      actorUserId: user.userId,
      organizationId: clinicalCase.organizationId,
      action: 'mri.artifact_view',
      resourceType: 'MriAnalysis',
      resourceId: mriId,
      metadata: { caseId, kind },
    });
    return { data, contentType: contentTypeForKey(key) };
  }
}

function artifactKey(mri: MriAnalysis, kind: ArtifactKind): string | null {
  switch (kind) {
    case 'original':
      return mri.originalImageKey;
    case 'mask':
      return mri.maskImageKey;
    case 'overlay':
      return mri.overlayImageKey;
  }
}

export function serializeMri(m: MriAnalysis) {
  return {
    id: m.id,
    caseId: m.clinicalCaseId,
    originalFilename: m.originalFilename,
    status: m.status,
    errorMessage: m.errorMessage,
    modelVersion: m.modelVersion,
    processingTimeMs: m.processingTimeMs,
    findings: m.status === MriStatus.COMPLETED ? normalizeMriFindings(m.findings) : null,
    artifacts: { original: Boolean(m.originalImageKey), mask: Boolean(m.maskImageKey), overlay: Boolean(m.overlayImageKey) },
    createdAt: m.createdAt,
  };
}

const PNG_MAGIC = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

function decodePng(value: string): Buffer {
  const base64 = value.startsWith('data:') ? value.slice(value.indexOf(',') + 1) : value;
  const buf = Buffer.from(base64, 'base64');
  if (buf.length < PNG_MAGIC.length || !buf.subarray(0, 8).equals(PNG_MAGIC)) {
    throw new Error('Inference visualization is not a PNG');
  }
  return buf;
}

/** Display-only filename: strip paths and control characters, cap length. */
function safeName(name: string): string {
  const base = name.split(/[\\/]/).pop() ?? 'image';
  return base.replace(/[\u0000-\u001f\u007f]/g, '').slice(0, 200) || 'image';
}
