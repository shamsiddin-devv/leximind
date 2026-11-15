import {
  IsEmail,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
export class RequestAccountActionDto {
  @IsEmail() @MaxLength(255) email!: string;
}
export class ConfirmEmailDto {
  @Matches(/^[A-Za-z0-9_-]{43}$/) token!: string;
}
export class ResetPasswordDto extends ConfirmEmailDto {
  @IsString() @MinLength(12) @MaxLength(72) password!: string;
}
