import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { FeedbackRating } from '@prisma/client';

export class DoctorFeedbackDto {
  @IsEnum(FeedbackRating, { message: 'Rating must be HELPFUL, PARTIALLY_HELPFUL, or NOT_HELPFUL' })
  rating!: FeedbackRating;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  comment?: string;
}
