import {
  Controller,
  Post,
  Get,
  Param,
  UseGuards,
  UseInterceptors,
  UploadedFiles,
  Res,
  NotFoundException,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { MriService } from './mri.service';
import { S3ArtifactService } from './storage/s3-artifact.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/user.decorator';

@Controller()
export class MriController {
  constructor(
    private readonly mriService: MriService,
    private readonly s3ArtifactService: S3ArtifactService,
  ) {}

  @Post('clinical-cases/:caseId/mri')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FilesInterceptor('files', 10))
  async uploadMriFiles(
    @Param('caseId') caseId: string,
    @CurrentUser('userId') userId: string,
    @CurrentUser('role') role: string,
    @CurrentUser('organizationId') orgId: string | undefined,
    @UploadedFiles() files: Array<{ originalname: string; buffer: Buffer; mimetype: string; size: number }>,
  ) {
    return this.mriService.processMriUploads(caseId, userId, role, orgId, files);
  }

  @Get('clinical-cases/:caseId/mri')
  @UseGuards(JwtAuthGuard)
  async getCaseMriAnalyses(
    @Param('caseId') caseId: string,
    @CurrentUser('userId') userId: string,
    @CurrentUser('role') role: string,
    @CurrentUser('organizationId') orgId: string | undefined,
  ) {
    return this.mriService.getMriAnalysesForCase(caseId, userId, role, orgId);
  }

  @Get('mri/artifacts/:caseId/:mriId/:kind')
  async serveArtifactFile(
    @Param('caseId') caseId: string,
    @Param('mriId') mriId: string,
    @Param('kind') kind: string,
    @Res() res: Response,
  ) {
    const cleanKind = kind.replace(/\.png$/, '');
    const buffer = this.s3ArtifactService.getLocalFileBuffer(caseId, mriId, cleanKind);

    if (!buffer) {
      throw new NotFoundException('Artifact image file not found');
    }

    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.send(buffer);
  }
}
