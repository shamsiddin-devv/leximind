import {
  ValidateIf,
  IsBoolean,
  IsInt,
  Min,
  Max,
  IsString,
  MaxLength,
  Matches,
  IsIn,
  IsArray,
  ArrayMaxSize,
  ArrayMinSize,
} from 'class-validator';
import { type GameKind, gameKinds } from '../../../domain/entities/Challenge';
import { IReviewRating } from '../../../domain/services/IReviewRatingService';
export class ProfileDto {
  @ValidateIf((_object: unknown, value: unknown) => value !== undefined)
  @IsBoolean()
  feedbackAudioEnabled?: boolean;
  @ValidateIf((_object: unknown, value: unknown) => value !== undefined)
  @IsString()
  @MaxLength(100)
  timezone?: string;
  @ValidateIf((_object: unknown, value: unknown) => value !== undefined)
  @IsInt()
  @Min(1)
  @Max(100)
  dailyNewWords?: number;
}
export class StartSessionDto {
  @ValidateIf((_object: unknown, value: unknown) => value !== undefined)
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 20;
}
export class ReviewDto {
  @IsIn(['AGAIN', 'HARD', 'GOOD', 'EASY']) rating!: IReviewRating;
  @IsInt() @Min(0) @Max(3600000) responseMs!: number;
}
export class StartGameDto {
  @IsIn(gameKinds) gameType!: GameKind;
  @ValidateIf((_object: unknown, value: unknown) => value !== undefined)
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  @MaxLength(60)
  topic?: string;
  @ValidateIf((_object: unknown, value: unknown) => value !== undefined)
  @IsIn(['A1', 'A2', 'B1', 'B2', 'C1', 'C2'])
  cefrLevel?: import('../../../domain/entities/Word').CefrLevel;
}
export class SubmitAnswersDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(30)
  @IsString({ each: true })
  @MaxLength(255, { each: true })
  answers!: string[];
}

export class SubmitAttemptDto {
  @IsInt() @Min(0) @Max(29) index!: number;
  @IsString() @MaxLength(255) answer!: string;
}
