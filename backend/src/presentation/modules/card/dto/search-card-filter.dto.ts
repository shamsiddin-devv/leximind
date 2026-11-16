import { Type } from 'class-transformer';
import { ValidateIf, IsUUID, IsIn, IsInt, Min, Max } from 'class-validator';
import type { CardStateType } from '../../../../domain/entities/Card';
import { PaginationDto } from '../../../pagination.dto';
export class SearchCardFilterDto extends PaginationDto {
  @ValidateIf((_object: unknown, value: unknown) => value !== undefined)
  @IsUUID('4')
  wordId?: string;
  @ValidateIf((_object: unknown, value: unknown) => value !== undefined)
  @IsIn(['NEW', 'LEARNING', 'REVIEW', 'RELEARNING'])
  state?: CardStateType;
  @ValidateIf((_object: unknown, value: unknown) => value !== undefined)
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number;
}
