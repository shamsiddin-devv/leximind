import { IsBoolean } from 'class-validator';

export class UpdateCardDto {
  @IsBoolean()
  paused!: boolean;
}
