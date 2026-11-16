import { Card } from '../entities/Card';
import { IReviewRating } from './IReviewRatingService';
import { IScheduleResult } from './IScheduleResultService';

export interface IReviewScheduler {
  schedule(card: Card, rating: IReviewRating, now: Date): IScheduleResult;
}
