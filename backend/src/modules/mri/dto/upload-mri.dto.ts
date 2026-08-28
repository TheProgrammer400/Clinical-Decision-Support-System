import { IsNotEmpty, IsString } from 'class-validator';

export class UploadMriDto {
  @IsString()
  @IsNotEmpty()
  clinicalCaseId: string;
}
