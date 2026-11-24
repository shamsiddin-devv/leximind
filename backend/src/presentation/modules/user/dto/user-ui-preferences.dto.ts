import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsObject,
  IsString,
  Max,
  MaxLength,
  Matches,
  Min,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { maxBannerLength } from '../../../../application/use-cases/user/UserUiPreferences';
import {
  orderedProfileMetrics,
  stockProfileBanners,
  type InterfaceSettings,
  type ProfileAppearance,
  type ProfileMetric,
} from '../../../../domain/value-objects/UserUiPreferences';

function Optional() {
  return ValidateIf((_: object, value: unknown) => value !== undefined);
}

class ContentPatchDto {
  @Optional() @IsBoolean() declare bio?: boolean;
  @Optional() @IsBoolean() declare email?: boolean;
  @Optional() @IsBoolean() declare charts?: boolean;
  @Optional() @IsBoolean() declare achievements?: boolean;
}

class ProfileMetricDto {
  @IsIn(orderedProfileMetrics)
  id!: ProfileMetric;

  @IsBoolean()
  visible!: boolean;
}

class AppearancePatchDto {
  @Optional()
  @IsIn(['horizontal', 'vertical'])
  declare layout?: ProfileAppearance['layout'];

  @Optional()
  @IsIn(stockProfileBanners)
  declare banner?: string;

  @Optional()
  @IsString()
  @MaxLength(maxBannerLength)
  declare image?: string;

  @Optional()
  @IsIn(['left', 'center', 'right'])
  declare position?: ProfileAppearance['position'];

  @Optional()
  @IsIn(['low', 'medium', 'high'])
  declare height?: ProfileAppearance['height'];

  @Optional()
  @IsInt()
  @Min(0)
  @Max(75)
  declare overlay?: number;

  @Optional()
  @IsObject()
  @ValidateNested()
  @Type(() => ContentPatchDto)
  declare content?: ContentPatchDto;

  @Optional()
  @IsIn(['grid', 'list'])
  declare statsStyle?: ProfileAppearance['statsStyle'];

  @Optional()
  @IsArray()
  @ArrayMinSize(6)
  @ArrayMaxSize(6)
  @ArrayUnique((metric: ProfileMetricDto | null) => metric?.id)
  @ValidateNested({ each: true })
  @Type(() => ProfileMetricDto)
  declare metrics?: ProfileMetricDto[];
}

class NotificationsPatchDto {
  @Optional() @IsBoolean() declare review?: boolean;
  @Optional() @IsBoolean() declare streak?: boolean;
  @Optional() @IsBoolean() declare achievements?: boolean;
  @Optional() @IsBoolean() declare progress?: boolean;
  @Optional() @IsBoolean() declare weekly?: boolean;
  @Optional() @IsBoolean() declare push?: boolean;
  @Optional() @IsBoolean() declare email?: boolean;
  @Optional() @IsBoolean() declare news?: boolean;
}

class InterfaceAppearancePatchDto {
  @Optional() @Matches(/^(default|#[0-9a-fA-F]{6})$/) declare accent?: string;
  @Optional()
  @IsIn(['compact', 'normal', 'comfortable'])
  declare density?: InterfaceSettings['appearance']['density'];
  @Optional()
  @IsIn(['small', 'medium', 'large'])
  declare textSize?: InterfaceSettings['appearance']['textSize'];
  @Optional() @IsBoolean() declare animations?: boolean;
  @Optional() @IsBoolean() declare reducedMotion?: boolean;
}

class InterfaceSettingsPatchDto {
  @Optional()
  @IsIn(['uz', 'en', 'ru'])
  declare language?: InterfaceSettings['language'];

  @Optional()
  @IsIn(['light', 'dark', 'system'])
  declare themeMode?: InterfaceSettings['themeMode'];

  @Optional()
  @IsBoolean()
  declare sidebarCollapsed?: boolean;

  @Optional()
  @IsObject()
  @ValidateNested()
  @Type(() => InterfaceAppearancePatchDto)
  declare appearance?: InterfaceAppearancePatchDto;
}

export class UserUiPreferencesDto {
  @Optional()
  @IsObject()
  @ValidateNested()
  @Type(() => InterfaceSettingsPatchDto)
  declare interfaceSettings?: InterfaceSettingsPatchDto;
  @Optional()
  @IsBoolean()
  declare initialize?: boolean;

  @Optional()
  @IsObject()
  @ValidateNested()
  @Type(() => AppearancePatchDto)
  declare appearance?: AppearancePatchDto;

  @Optional()
  @IsObject()
  @ValidateNested()
  @Type(() => NotificationsPatchDto)
  declare notifications?: NotificationsPatchDto;
}
