import { IsJWT, IsString, Matches } from 'class-validator';

export class MfaCodeDto {
  @IsString()
  @Matches(/^\d{6}$/, { message: 'Code must be 6 digits' })
  code!: string;
}

export class MfaLoginDto extends MfaCodeDto {
  @IsJWT()
  mfaToken!: string;
}
