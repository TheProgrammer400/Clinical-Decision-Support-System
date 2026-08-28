import {
  Injectable,
  Inject,
  Logger,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { AuditService } from '../audit/audit.service';
import { AppConfigService } from '../config/config.service';
import { S3ArtifactService } from './storage/s3-artifact.service';
import {
  MriInferenceProvider,
  UploadFileParam,
} from './interfaces/mri-inference-provider.interface';
import { MriStatus, Role } from '@prisma/client';
import { randomUUID } from 'crypto';

@Injectable()
export class MriService {
  private readonly logger = new Logger(MriService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject('MriInferenceProvider') private readonly inferenceClient: MriInferenceProvider,
    private readonly s3ArtifactService: S3ArtifactService,
    private readonly auditService: AuditService,
    private readonly configService: AppConfigService,
  ) {}

  async processMriUploads(
    caseId: string,
    doctorId: string,
    role: string,
    userOrgId: string | undefined,
    files: Array<{ originalname: string; buffer: Buffer; mimetype: string; size: number }>,
  ) {
    if (!files || files.length === 0) {
      throw new BadRequestException('No MRI files provided for processing');
    }

    const clinicalCase = await this.prisma.clinicalCase.findUnique({
      where: { id: caseId },
    });

    if (!clinicalCase) {
      throw new NotFoundException('Clinical case not found');
    }

    // Ownership / Org Access Guard
    this.verifyCaseAccess(clinicalCase, doctorId, role, userOrgId);

    // Validate files
    const maxSizeBytes = (this.configService.mriMaxUploadSizeMb || 20) * 1024 * 1024;
    const allowedMimeTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];

    for (const file of files) {
      if (file.size > maxSizeBytes) {
        throw new BadRequestException(
          `File '${file.originalname}' exceeds maximum allowed upload size of ${this.configService.mriMaxUploadSizeMb || 20}MB`,
        );
      }
      if (!allowedMimeTypes.includes(file.mimetype.toLowerCase())) {
        throw new BadRequestException(
          `File '${file.originalname}' has unsupported MIME type '${file.mimetype}'. Allowed: ${allowedMimeTypes.join(', ')}`,
        );
      }
    }

    const createdRecords: Array<{ mriId: string; filename: string; dbId: string }> = [];
    const uploadParams: UploadFileParam[] = [];

    for (const file of files) {
      const mriId = randomUUID();
      // Store original image
      const originalResult = await this.s3ArtifactService.uploadArtifact(
        caseId,
        mriId,
        'original',
        file.buffer,
        file.mimetype,
      );

      // Create database row in PROCESSING state
      const dbRecord = await this.prisma.mriAnalysis.create({
        data: {
          id: mriId,
          clinicalCaseId: caseId,
          originalFilename: file.originalname,
          originalImageKey: originalResult.key,
          status: MriStatus.PROCESSING,
        },
      });

      createdRecords.push({ mriId, filename: file.originalname, dbId: dbRecord.id });
      uploadParams.push({
        filename: file.originalname,
        buffer: file.buffer,
        mimetype: file.mimetype,
      });
    }

    let inferenceResponse;
    try {
      inferenceResponse = await this.inferenceClient.analyzeImages(uploadParams);
    } catch (inferError) {
      this.logger.error(`MRI Inference call failed for caseId=${caseId}: ${inferError.message}`);
      // Mark all created records as FAILED
      for (const item of createdRecords) {
        await this.prisma.mriAnalysis.update({
          where: { id: item.mriId },
          data: {
            status: MriStatus.FAILED,
            errorMessage: `MRI Inference Service execution error: ${inferError.message}`,
          },
        });
      }

      await this.auditService.log({
        actorUserId: doctorId,
        action: 'mri.inference_failed',
        resourceType: 'ClinicalCase',
        resourceId: caseId,
        metadata: { error: inferError.message, totalFiles: files.length },
      });

      return this.getMriAnalysesForCase(caseId, doctorId, role, userOrgId);
    }

    // Process each returned inference result
    for (let i = 0; i < inferenceResponse.data.length; i++) {
      const result = inferenceResponse.data[i];
      const record = createdRecords[i] || createdRecords.find((r) => r.filename === result.image_name);

      if (!record) continue;

      if (result.status === 'completed' && result.visualizations && result.findings) {
        try {
          // Decode Base64 PNG visualizations to raw Buffers
          const maskBuffer = this.base64ToBuffer(result.visualizations.segmented_mask);
          const overlayBuffer = this.base64ToBuffer(result.visualizations.tumor_overlay);

          // Upload derived artifacts
          const maskResult = await this.s3ArtifactService.uploadArtifact(
            caseId,
            record.mriId,
            'mask',
            maskBuffer,
            'image/png',
          );
          const overlayResult = await this.s3ArtifactService.uploadArtifact(
            caseId,
            record.mriId,
            'overlay',
            overlayBuffer,
            'image/png',
          );

          // Complete DB record
          await this.prisma.mriAnalysis.update({
            where: { id: record.mriId },
            data: {
              status: MriStatus.COMPLETED,
              findings: result.findings as any,
              maskImageKey: maskResult.key,
              overlayImageKey: overlayResult.key,
              modelVersion: result.model_version,
              processingTimeMs: result.processing_time_ms,
            },
          });
        } catch (postError) {
          this.logger.error(`Post-processing artifact storage failed for mriId=${record.mriId}: ${postError.message}`);
          await this.prisma.mriAnalysis.update({
            where: { id: record.mriId },
            data: {
              status: MriStatus.FAILED,
              errorMessage: `Artifact storage failed: ${postError.message}`,
            },
          });
        }
      } else {
        await this.prisma.mriAnalysis.update({
          where: { id: record.mriId },
          data: {
            status: MriStatus.FAILED,
            errorMessage: result.error_message || 'Image segmentation failed',
            processingTimeMs: result.processing_time_ms,
          },
        });
      }
    }

    await this.auditService.log({
      actorUserId: doctorId,
      action: 'mri.process_complete',
      resourceType: 'ClinicalCase',
      resourceId: caseId,
      metadata: { count: createdRecords.length },
    });

    return this.getMriAnalysesForCase(caseId, doctorId, role, userOrgId);
  }

  async getMriAnalysesForCase(caseId: string, userId: string, role: string, userOrgId?: string) {
    const clinicalCase = await this.prisma.clinicalCase.findUnique({
      where: { id: caseId },
    });

    if (!clinicalCase) {
      throw new NotFoundException('Clinical case not found');
    }

    this.verifyCaseAccess(clinicalCase, userId, role, userOrgId);

    const analyses = await this.prisma.mriAnalysis.findMany({
      where: { clinicalCaseId: caseId },
      orderBy: { createdAt: 'asc' },
    });

    // Attach URLs for viewing artifacts
    return Promise.all(
      analyses.map(async (item) => {
        const originalUrl = await this.s3ArtifactService.getPresignedUrl(caseId, item.id, 'original');
        const maskUrl = item.maskImageKey
          ? await this.s3ArtifactService.getPresignedUrl(caseId, item.id, 'mask')
          : null;
        const overlayUrl = item.overlayImageKey
          ? await this.s3ArtifactService.getPresignedUrl(caseId, item.id, 'overlay')
          : null;

        return {
          ...item,
          urls: {
            original: originalUrl,
            mask: maskUrl,
            overlay: overlayUrl,
          },
        };
      }),
    );
  }

  private verifyCaseAccess(clinicalCase: any, userId: string, role: string, userOrgId?: string) {
    if (role === Role.SUPER_ADMIN) {
      return;
    }
    if (role === Role.ORG_ADMIN) {
      if (userOrgId && clinicalCase.organizationId !== userOrgId) {
        throw new ForbiddenException('Access denied to clinical case outside organization');
      }
      return;
    }
    if (clinicalCase.doctorId !== userId && clinicalCase.organizationId !== userOrgId) {
      throw new ForbiddenException('Access denied to clinical case');
    }
  }

  private base64ToBuffer(b64String: string): Buffer {
    let clean = b64String;
    if (clean.includes(',')) {
      clean = clean.split(',')[1];
    }
    return Buffer.from(clean, 'base64');
  }
}
