import { IsNotEmpty, IsOptional, IsObject, IsString, MinLength } from 'class-validator';

export class CreateCaseDto {
  @IsString()
  @IsNotEmpty({ message: 'Clinical case narrative text cannot be empty' })
  @MinLength(10, { message: 'Clinical case description should contain at least 10 characters' })
  caseText: string;

  @IsOptional()
  @IsObject()
  patientContext?: Record<string, any>;
}
