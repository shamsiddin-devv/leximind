import { IsString, MinLength, MaxLength } from 'class-validator';
import { MIN_PASSWORD_LENGTH } from '../../../../domain/value-objects/PasswordPolicy';
export class ChangePasswordDto {
  @IsString() @MinLength(1) @MaxLength(72) currentPassword!: string;
  @IsString()
  @MinLength(MIN_PASSWORD_LENGTH)
  @MaxLength(72)
  newPassword!: string;
}
