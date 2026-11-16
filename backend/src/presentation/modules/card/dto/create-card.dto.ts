import {
  IsUUID,
  IsArray,
  ArrayMinSize,
  ArrayMaxSize,
  ArrayUnique,
} from 'class-validator';
export class CreateCardDto {
  @IsUUID('4') wordId!: string;
}
export class BulkCardsDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  @ArrayUnique()
  @IsUUID('4', { each: true })
  wordIds!: string[];
}
