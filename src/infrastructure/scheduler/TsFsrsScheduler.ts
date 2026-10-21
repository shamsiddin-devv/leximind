import { IReviewRating } from 'src/domain/services/IReviewRatingService';
import { IScheduleResult } from 'src/domain/services/IScheduleResultService';
import {
  fsrs,
  Rating as FsrsRating,
  State as FsrsState,
  type Grade as FsrsGrade,
  type CardInput as FsrsCardInput,
} from 'ts-fsrs';
import { State, Card, type CardStateType } from '../../domain/entities/Card';
import { IReviewScheduler } from 'src/domain/services/IReviewSchedulerService';

const ratingMap: Record<IReviewRating, FsrsGrade> = {
  [IReviewRating.GOOD]: FsrsRating.Good,
  [IReviewRating.EASY]: FsrsRating.Easy,
  [IReviewRating.AGAIN]: FsrsRating.Again,
  [IReviewRating.HARD]: FsrsRating.Hard,
};

const stateToFsrs: Record<CardStateType, FsrsState> = {
  [State.NEW]: FsrsState.New,
  [State.LEARNING]: FsrsState.Learning,
  [State.REVIEW]: FsrsState.Review,
  [State.RELEARNING]: FsrsState.Relearning,
};

const stateFormFsrs: Record<FsrsState, CardStateType> = {
  [FsrsState.New]: State.NEW,
  [FsrsState.Learning]: State.LEARNING,
  [FsrsState.Relearning]: State.RELEARNING,
  [FsrsState.Review]: State.REVIEW,
};

export class TsFsrsScheduler implements IReviewScheduler  {
  private readonly scheduler = fsrs({
    request_retention: 0.9,
    enable_fuzz: false,
    enable_short_term: false,
  });

  schedule(card: Card, rating: IReviewRating, now: Date): IScheduleResult {
    const data = card.getSchedulingData();

    const fsrsCard: FsrsCardInput = {
      due: data.due,
      stability: data.stability,
      difficulty: data.difficulty,
      reps: data.reps,
      lapses: data.lapses,
      learning_steps: 0,
      state: stateToFsrs[data.state],
      last_review: data.lastReviewedAt,
      elapsed_days: 0,
      scheduled_days: 0,
    };

    const result = this.scheduler.next(fsrsCard, now, ratingMap[rating]);

    return {
      stability: result.card.stability,
      difficulty: result.card.difficulty,
      due: result.card.due,
      reps: result.card.reps,
      lapses: result.card.lapses,
      learningSteps: result.card.learning_steps,
      state: stateFormFsrs[result.card.state],
    };
  }
}
