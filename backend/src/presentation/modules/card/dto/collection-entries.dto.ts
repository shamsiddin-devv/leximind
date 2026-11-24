import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsIn,
  IsInt,
  IsString,
  IsUUID,
  IsNotEmpty,
  Matches,
  Max,
  MaxLength,
  Min,
  NotContains,
  ValidateNested,
} from 'class-validator';
import {
  collectionKinds,
  type CollectionKind,
} from '../../../../domain/repositories/ICollectionRepository';

function trimText({ value }: { value: unknown }) {
  return typeof value === 'string' ? value.trim() : value;
}

export class CollectionDraftDto {
  @IsIn(collectionKinds)
  kind!: CollectionKind;

  @Transform(trimText)
  @IsString()
  @IsNotEmpty()
  @NotContains('\0')
  @MaxLength(255)
  text!: string;

  @Transform(trimText)
  @IsString()
  @IsNotEmpty()
  @NotContains('\0')
  @MaxLength(255)
  translation!: string;

  @Transform(trimText)
  @IsString()
  @NotContains('\0')
  @MaxLength(500)
  example = '';

  @Transform(trimText)
  @IsString()
  @NotContains('\0')
  @MaxLength(80)
  topic = '';

  @IsInt()
  @Min(0)
  @Max(100)
  progress = 0;
}

class NewCollectionEntryDto extends CollectionDraftDto {
  @IsUUID('4')
  id!: string;

  @IsDateString({ strict: true, strictSeparator: true })
  @Matches(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/)
  createdAt!: string;
}

export class ImportCollectionPinsDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(80)
  @IsUUID('4', { each: true })
  ids!: string[];
}

export class ChangeCollectionPinDto {
  @IsBoolean()
  pinned!: boolean;
}

export class AddCollectionEntriesDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(40)
  @ValidateNested({ each: true })
  @Type(() => NewCollectionEntryDto)
  entries!: NewCollectionEntryDto[];
}
