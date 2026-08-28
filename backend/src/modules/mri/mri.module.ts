import { Module } from '@nestjs/common';
import { MriController } from './mri.controller';
import { MriService } from './mri.service';
import { S3ArtifactService } from './storage/s3-artifact.service';
import { HttpMriInferenceClient } from './clients/mri-inference.client';

@Module({
  controllers: [MriController],
  providers: [
    MriService,
    S3ArtifactService,
    HttpMriInferenceClient,
    {
      provide: 'MriInferenceProvider',
      useExisting: HttpMriInferenceClient,
    },
  ],
  exports: [MriService, S3ArtifactService],
})
export class MriModule {}
