import { IsEmail, IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class LoginDto {
  @IsEmail({}, { message: 'Must be a valid email address' })
  @MaxLength(254)
  email!: string;

  // No minimum length here: existing accounts may predate the current password policy.
  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  password!: string;
}
