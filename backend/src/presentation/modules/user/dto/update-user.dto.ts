import { OmitType, PartialType } from '@nestjs/mapped-types';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsObject,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import {
  genders,
  type Gender,
  phoneNumberPattern,
} from '../../../../domain/entities/User';
import { CreateUserDto } from './create-user.dto';
import { maxBioFormatLength } from '../../../../domain/value-objects/BioFormatting';
import {
  maxSocialLinkLength,
  type SocialLinksPatch,
} from '../../../../domain/value-objects/ProfileSocialLinks';

class SocialLinksDto implements SocialLinksPatch {
  @IsOptional() @IsString() @MaxLength(maxSocialLinkLength) telegram?:
    string | null;
  @IsOptional() @IsString() @MaxLength(maxSocialLinkLength) instagram?:
    string | null;
  @IsOptional() @IsString() @MaxLength(maxSocialLinkLength) github?:
    string | null;
  @IsOptional() @IsString() @MaxLength(maxSocialLinkLength) linkedin?:
    string | null;
  @IsOptional() @IsString() @MaxLength(maxSocialLinkLength) x?: string | null;
  @IsOptional() @IsString() @MaxLength(maxSocialLinkLength) website?:
    string | null;
}

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
  @IsOptional() @IsString() @MaxLength(maxBioFormatLength) bioFormat?:
    string | null;
  @IsOptional() @IsString() @Matches(/^[A-Z]{2}$/) countryCode?: string | null;
  @IsOptional() @IsString() @MaxLength(100) city?: string | null;
  @IsOptional() @IsString() @MaxLength(100) administrativeRegion?:
    string | null;
  @IsOptional() @IsString() @MaxLength(160) streetAddress?: string | null;
  @IsOptional() @IsString() @MaxLength(250) addressDetails?: string | null;
  @IsOptional() @IsString() @MaxLength(100) location?: string | null;
  @IsOptional() @IsIn(genders) gender?: Gender | null;
  @IsOptional() @IsString() @Matches(phoneNumberPattern) phoneNumber?:
    string | null;
  @ValidateIf((_target, value: unknown) => value !== undefined)
  @IsObject()
  @ValidateNested()
  @Type(() => SocialLinksDto)
  socialLinks?: SocialLinksDto;
  @ValidateIf((_target, value: unknown) => value !== undefined)
  @IsBoolean()
  profilePublic?: boolean;
  @ValidateIf((_target, value: unknown) => value !== undefined)
  @IsBoolean()
  profileSharing?: boolean;
  @ValidateIf((_target, value: unknown) => value !== undefined)
  @IsBoolean()
  publicStatistics?: boolean;
  @ValidateIf((_target, value: unknown) => value !== undefined)
  @IsBoolean()
  publicCefr?: boolean;
  @ValidateIf((_target, value: unknown) => value !== undefined)
  @IsBoolean()
  publicBio?: boolean;
  @ValidateIf((_target, value: unknown) => value !== undefined)
  @IsBoolean()
  publicSocialLinks?: boolean;
}
