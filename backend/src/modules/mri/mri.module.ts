import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { AppConfigService } from '../config/config.service';
import { HttpMriInferenceClient } from './clients/mri-inference.client';
import { MRI_INFERENCE_PROVIDER } from './interfaces/mri-inference-provider.interface';
import { MriController } from './mri.controller';
import { MriService } from './mri.service';
import { ARTIFACT_STORAGE } from './storage/artifact-storage';
import { LocalArtifactStorage } from './storage/local-artifact-storage';

@Module({
  imports: [
    // Limits are enforced while streaming, so oversized uploads are rejected (413) before
    // they are fully buffered in memory.
    MulterModule.registerAsync({
      inject: [AppConfigService],
      useFactory: (config: AppConfigService) => ({
        // No storage engine configured: multer buffers in memory, bounded by the limits below.
        limits: {
          fileSize: config.mriMaxUploadSizeMb * 1024 * 1024,
          files: config.mriMaxFiles,
          fields: 5,
          parts: config.mriMaxFiles + 5,
        },
      }),
    }),
  ],
  controllers: [MriController],
  providers: [
    MriService,
    { provide: MRI_INFERENCE_PROVIDER, useClass: HttpMriInferenceClient },
    { provide: ARTIFACT_STORAGE, useClass: LocalArtifactStorage },
  ],
  exports: [MriService, ARTIFACT_STORAGE],
})
export class MriModule {}
