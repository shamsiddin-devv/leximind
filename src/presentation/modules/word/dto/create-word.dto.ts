import { Type, Transform } from 'class-transformer';
import {
  ArrayMinSize,
  ArrayMaxSize,
  IsArray,
  IsIn,
  IsInt,
  ValidateIf,
  IsString,
  IsUrl,
  Length,
  Max,
  Matches,
  Min,
  ValidateNested,
} from 'class-validator';
import type { CefrLevel } from '../../../../domain/entities/Word';
export class WordSenseDto {
  @IsString() @Length(1, 255) definition!: string;
  @IsString() @Length(1, 255) exampleSentence!: string;
  @ValidateIf((_object: unknown, value: unknown) => value !== undefined)
  @IsUrl({ protocols: ['https'], require_protocol: true })
  @Length(1, 2048)
  exampleAudioUrl?: string;
  @IsString() @Length(1, 255) translationUz!: string;
  @IsInt() @Min(0) @Max(100) orderIndex!: number;
}
export class CreateWordDto {
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsString()
  @Length(1, 255)
  text!: string;
  @IsIn(['A1', 'A2', 'B1', 'B2', 'C1', 'C2']) cefrLevel!: CefrLevel;
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => WordSenseDto)
  sense!: WordSenseDto[];
  @ValidateIf((_object: unknown, value: unknown) => value !== undefined)
  @IsUrl({ protocols: ['https'], require_protocol: true })
  audioUrl?: string;
  @ValidateIf((_object: unknown, value: unknown) => value !== undefined)
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  @Length(1, 60)
  topic?: string;
}
export class BulkWordsDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => CreateWordDto)
  words!: CreateWordDto[];
}
