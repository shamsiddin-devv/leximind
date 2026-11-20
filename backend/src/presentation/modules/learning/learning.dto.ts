import {
  ValidateIf,
  IsBoolean,
  IsInt,
  Min,
  Max,
  IsString,
  MaxLength,
  MinLength,
  Matches,
  IsIn,
  IsArray,
  ArrayMaxSize,
  ArrayMinSize,
} from 'class-validator';
import { type GameKind, gameKinds } from '../../../domain/entities/Challenge';
import { IReviewRating } from '../../../domain/services/IReviewRatingService';
import { CEFR_LEVELS, type CefrLevel } from '../../../domain/entities/Word';
import type { SessionData } from '../../../domain/entities/LearningSession';
import { leaderboardPeriods, reviewModes, reviewQueues, studyReminderTimePattern, type LeaderboardPeriod, type ReviewMode, type ReviewQueue } from '../../../domain/repositories/ILearningRepository';
import { PaginationDto } from '../../pagination.dto';
import { notebookCategories, type NotebookCategory } from '../../../domain/entities/MistakesNotebook';

export class MistakesNotebookDto extends PaginationDto {
  @ValidateIf((_object: unknown, value: unknown) => value !== undefined)
  @IsIn(notebookCategories)
  category?: NotebookCategory;

  @IsIn(['true', 'false'])
  onlyOpen: 'true' | 'false' = 'false';
}

export class ResolveMistakeDto {
  @IsBoolean()
  resolved!: boolean;
}

export class RetryMistakeDto {
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  answer!: string;
}

export class SessionHistoryDto extends PaginationDto {
  @ValidateIf((_object: unknown, value: unknown) => value !== undefined)
  @IsIn(['in_progress', 'completed', 'cancelled'])
  status?: SessionData['status'];
}

export class LearningCalendarDto {
  @ValidateIf((_object: unknown, value: unknown) => value !== undefined)
  @IsString()
  @Matches(/^(?!0000)[0-9]{4}-(0[1-9]|1[0-2])$/)
  month?: string;
}
export class LeaderboardDto {
  @IsIn(leaderboardPeriods)
  period: LeaderboardPeriod = 'all';
}

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

  @ValidateIf((_object: unknown, value: unknown) => value !== undefined)
  @IsInt()
  @Min(5)
  @Max(180)
  dailyStudyMinutes?: number;

  @ValidateIf((_object: unknown, value: unknown) => value != null)
  @IsIn(CEFR_LEVELS)
  studyLevel?: CefrLevel | null;

  @ValidateIf((_object: unknown, value: unknown) => value !== undefined)
  @IsIn(reviewModes)
  reviewMode?: ReviewMode;

  @ValidateIf((_object: unknown, value: unknown) => value !== undefined)
  @IsBoolean()
  studyReminderEnabled?: boolean;

  @ValidateIf((_object: unknown, value: unknown) => value !== undefined)
  @IsString()
  @Matches(studyReminderTimePattern)
  studyReminderTime?: string;

  @ValidateIf((_object: unknown, value: unknown) => value !== undefined)
  @IsBoolean()
  autoplayPronunciation?: boolean;
}
export class StartSessionDto {
  @ValidateIf((_object: unknown, value: unknown) => value !== undefined)
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 20;

  @ValidateIf((_object: unknown, value: unknown) => value !== undefined)
  @IsIn(reviewQueues)
  queue?: ReviewQueue;
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
