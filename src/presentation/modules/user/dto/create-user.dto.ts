import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsString,
  Length,
  MaxLength,
  MinLength,
} from 'class-validator';
export class CreateUserDto {
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @Length(1, 255)
  fullName!: string;
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsEmail()
  @MaxLength(255)
  email!: string;
  @IsString() @MinLength(12) @MaxLength(72) password!: string;
}
