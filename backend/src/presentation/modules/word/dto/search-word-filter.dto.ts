import {
  ValidateIf,
  IsIn,
  IsString,
  MaxLength,
  IsArray,
  ArrayMaxSize,
  IsUUID,
  Matches,
} from 'class-validator';
import type { CefrLevel } from '../../../../domain/entities/Word';
import { PaginationDto } from '../../../pagination.dto';
export class SearchWordFilterDto extends PaginationDto {
  @ValidateIf((_object: unknown, value: unknown) => value !== undefined)
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  @MaxLength(60)
  topic?: string;
  @ValidateIf((_object: unknown, value: unknown) => value !== undefined)
  @IsUUID()
  after?: string;
  @ValidateIf((_object: unknown, value: unknown) => value !== undefined)
  @IsIn(['A1', 'A2', 'B1', 'B2', 'C1', 'C2'])
  cefrLevel?: CefrLevel;
  @ValidateIf((_object: unknown, value: unknown) => value !== undefined)
  @IsString()
  @MaxLength(100)
  search?: string;
  @ValidateIf((_object: unknown, value: unknown) => value !== undefined)
  @IsArray()
  @ArrayMaxSize(100)
  @IsUUID('4', { each: true })
  excludeIds?: string[];
}
