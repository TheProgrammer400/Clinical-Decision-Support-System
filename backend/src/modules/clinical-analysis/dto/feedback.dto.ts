import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { FeedbackRating } from '@prisma/client';

export class DoctorFeedbackDto {
  @IsEnum(FeedbackRating, { message: 'Rating must be HELPFUL, PARTIALLY_HELPFUL, or NOT_HELPFUL' })
  @IsNotEmpty()
  rating: FeedbackRating;

  @IsOptional()
  @IsString()
  comment?: string;
}
