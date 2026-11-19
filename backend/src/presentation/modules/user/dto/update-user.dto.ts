import { OmitType, PartialType } from '@nestjs/mapped-types';
import { IsBoolean, IsIn, IsOptional, IsString, Matches, MaxLength, MinLength, ValidateIf } from 'class-validator';
import { genders, type Gender, phoneNumberPattern } from '../../../../domain/entities/User';
import { CreateUserDto } from './create-user.dto';
import { maxBioFormatLength } from '../../../../domain/value-objects/BioFormatting';

export class UpdateUserDto extends PartialType(
  OmitType(CreateUserDto, ['password'] as const),
  { skipNullProperties: false },
) {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(72)
  currentPassword?: string;

  @IsOptional()
  @IsString()
  @MaxLength(280)
  bio?: string | null;
  @IsOptional() @IsString() @MaxLength(maxBioFormatLength) bioFormat?: string | null;
  @IsOptional() @IsString() @Matches(/^[A-Z]{2}$/) countryCode?: string | null;
  @IsOptional() @IsString() @MaxLength(100) city?: string | null;
  @IsOptional() @IsString() @MaxLength(100) location?: string | null;
  @IsOptional() @IsIn(genders) gender?: Gender | null;
  @IsOptional() @IsString() @Matches(phoneNumberPattern) phoneNumber?: string | null;
  @ValidateIf((_target, value: unknown) => value !== undefined) @IsBoolean() profilePublic?: boolean;
  @ValidateIf((_target, value: unknown) => value !== undefined) @IsBoolean() profileSharing?: boolean;
  @ValidateIf((_target, value: unknown) => value !== undefined) @IsBoolean() publicStatistics?: boolean;
  @ValidateIf((_target, value: unknown) => value !== undefined) @IsBoolean() publicCefr?: boolean;
}
