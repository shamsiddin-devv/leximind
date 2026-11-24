import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsIn,
  IsInt,
  IsString,
  IsUUID,
  Length,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateIf,
} from 'class-validator';
import { CEFR_LEVELS, type CefrLevel } from '../../../../domain/entities/Word';
import { MIN_PASSWORD_LENGTH } from '../../../../domain/value-objects/PasswordPolicy';
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
  @IsString() @MinLength(MIN_PASSWORD_LENGTH) @MaxLength(72) password!: string;
  @ValidateIf((_target, value: unknown) => value !== undefined)
  @IsIn(CEFR_LEVELS)
  studyLevel?: CefrLevel;
  @ValidateIf((_target, value: unknown) => value !== undefined)
  @IsInt()
  @Min(5)
  @Max(180)
  dailyStudyMinutes?: number;
  @ValidateIf((_target, value: unknown) => value !== undefined)
  @IsInt()
  @Min(1)
  @Max(100)
  dailyNewWords?: number;
  @ValidateIf((_target, value: unknown) => value !== undefined)
  @IsUUID('4')
  referralCode?: string;
}
