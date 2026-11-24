import {
  IsEmail,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { MIN_PASSWORD_LENGTH } from '../../../../domain/value-objects/PasswordPolicy';
export class RequestAccountActionDto {
  @IsEmail() @MaxLength(255) email!: string;
}
export class ConfirmEmailDto {
  @Matches(/^[A-Za-z0-9_-]{43}$/) token!: string;
}
export class ResetPasswordDto extends ConfirmEmailDto {
  @IsString() @MinLength(MIN_PASSWORD_LENGTH) @MaxLength(72) password!: string;
}

export class ConfirmEmailCodeDto extends RequestAccountActionDto {
  @IsString() @Matches(/^[0-9]{6}$/) code!: string;
}

export class ResetPasswordCodeDto extends ConfirmEmailCodeDto {
  @IsString() @MinLength(MIN_PASSWORD_LENGTH) @MaxLength(72) password!: string;
}
