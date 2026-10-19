import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';

export const AGE_GROUPS = ['pediatric', 'adult', 'geriatric', 'not_specified'] as const;
export const SEXES = ['m', 'f', 'other', 'not_specified'] as const;
export const ACUITIES = ['hyperacute', 'acute', 'subacute', 'chronic', 'not_specified'] as const;

/**
 * Structured context. Every field must be chosen explicitly by the clinician; "not_specified"
 * is a valid, deliberate answer. Nothing is assumed on the patient's behalf.
 */
export class PatientContextDto {
  @IsIn(AGE_GROUPS)
  ageGroup!: (typeof AGE_GROUPS)[number];

  @IsIn(SEXES)
  sex!: (typeof SEXES)[number];

  @IsIn(ACUITIES)
  acuity!: (typeof ACUITIES)[number];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(30)
  @IsString({ each: true })
  @MaxLength(80, { each: true })
  historyTags?: string[];
}

export class CreateCaseDto {
  @IsString()
  @MinLength(10, { message: 'Clinical case description should contain at least 10 characters' })
  @MaxLength(20000)
  caseText!: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => PatientContextDto)
  patientContext?: PatientContextDto;
}
