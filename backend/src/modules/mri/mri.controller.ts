import {
  Controller,
  Get,
  Param,
  ParseEnumPipe,
  ParseUUIDPipe,
  Post,
  Res,
  StreamableFile,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { Throttle } from '@nestjs/throttler';
import { Response } from 'express';
import { AuthUser, CurrentUser } from '../../common/decorators/user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { MriService, UploadedImage } from './mri.service';

enum ArtifactKindParam {
  original = 'original',
  mask = 'mask',
  overlay = 'overlay',
}

/** Hard cap on files per request; the configurable limit (MRI_MAX_FILES) is enforced by multer. */
const MAX_FILES_PER_REQUEST = 20;

@Controller('clinical-cases/:caseId/mri')
@UseGuards(JwtAuthGuard)
export class MriController {
  constructor(private readonly mriService: MriService) {}

  @Post()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @UseInterceptors(FilesInterceptor('files', MAX_FILES_PER_REQUEST))
  uploadMriFiles(
    @Param('caseId', ParseUUIDPipe) caseId: string,
    @CurrentUser() user: AuthUser,
    @UploadedFiles() files: UploadedImage[],
  ) {
    return this.mriService.processMriUploads(user, caseId, files);
  }

  @Get()
  getCaseMriAnalyses(@Param('caseId', ParseUUIDPipe) caseId: string, @CurrentUser() user: AuthUser) {
    return this.mriService.getMriAnalysesForCase(user, caseId);
  }

  /** Authenticated, authorized artifact download. Never cached by shared caches. */
  @Get(':mriId/artifacts/:kind')
  async getArtifact(
    @Param('caseId', ParseUUIDPipe) caseId: string,
    @Param('mriId', ParseUUIDPipe) mriId: string,
    @Param('kind', new ParseEnumPipe(ArtifactKindParam)) kind: ArtifactKindParam,
    @CurrentUser() user: AuthUser,
    @Res({ passthrough: true }) res: Response,
  ) {
    const artifact = await this.mriService.getArtifact(user, caseId, mriId, kind);
    res.setHeader('Cache-Control', 'private, no-store');
    return new StreamableFile(artifact.data, { type: artifact.contentType });
  }
}
