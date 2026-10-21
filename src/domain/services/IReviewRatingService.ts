export const IReviewRating = {
  AGAIN: 'AGAIN',
  HARD: 'HARD',
  GOOD: 'GOOD',
  EASY: 'EASY',
} as const;

export type IReviewRating = (typeof IReviewRating)[keyof typeof IReviewRating];