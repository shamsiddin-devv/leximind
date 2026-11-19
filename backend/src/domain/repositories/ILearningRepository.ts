import { Card } from '../entities/Card';
import { SessionData } from '../entities/LearningSession';
import type { CefrLevel } from '../entities/Word';
import { IReviewRating } from '../services/IReviewRatingService';
import type { GameKind } from '../entities/Challenge';

export interface AssessmentResult {
  id: string;
  resultingLevel: CefrLevel;
  correctCount: number;
  totalQuestion: number;
  takenAt: Date;
}

export interface GameScore {
  id: string;
  gameType: GameKind;
  score: number;
  playedAt: Date;
}

export interface StudySnapshot {
  timezone: string;
  activeSessionId: string | null;
  activeCards: number;
  dueNow: number;
  dueNew: number;
  dailyNewLimit: number;
  dailyNewReviewed: number;
  forecast: { date: string; count: number }[];
  difficultWords: { wordId: string; text: string; againCount: number }[];
}
export const reviewModes = ['spaced', 'random'] as const;
export type ReviewMode = (typeof reviewModes)[number];
export const studyReminderTimePattern = /^([01][0-9]|2[0-3]):[0-5][0-9]$/;

export interface Profile {
  userId: string;
  level: CefrLevel;
  studyLevel: CefrLevel | null;
  timezone: string;
  streakDay: number;
  dailyNewWords: number;
  dailyStudyMinutes: number;
  reviewMode: ReviewMode;
  studyReminderEnabled: boolean;
  studyReminderTime: string;
  autoplayPronunciation: boolean;
  feedbackAudioEnabled: boolean;
  xpMultiplier: number;
  lastSessionAt: Date | null;
}
export type ProfilePreferences = Pick<Profile,
  'studyLevel' | 'timezone' | 'dailyNewWords' | 'dailyStudyMinutes' | 'reviewMode' |
  'studyReminderEnabled' | 'studyReminderTime' | 'feedbackAudioEnabled' | 'autoplayPronunciation'
>;
export interface SessionTask {
  id: string;
  sessionId: string;
  cardId: string;
  orderIndex: number;
  completed: boolean;
  correct: boolean | null;
  wordId: string;
  text: string;
  audioUrl: string | null;
  definition: string;
  translationUz: string;
}
export interface ReviewEntry {
  id: string;
  cardId: string;
  rating: IReviewRating;
  responseMs: number;
  reviewedAt: Date;
}
export interface LearningTransaction {
  profile(userId: string): Promise<Profile>;
  updateProfile(profile: Profile): Promise<Profile>;
  activeSession(userId: string): Promise<SessionData | null>;
  session(id: string, userId: string): Promise<SessionData | null>;
  tasks(id: string): Promise<SessionTask[]>;
  dueCards(userId: string, limit: number, newLimit: number): Promise<Card[]>;
  createSession(userId: string, cardIds: string[]): Promise<SessionData>;
  card(id: string, userId: string): Promise<Card | null>;
  saveReview(
    card: Card,
    rating: IReviewRating,
    responseMs: number,
    now: Date,
  ): Promise<void>;
  completeTask(id: string, correct: boolean): Promise<void>;
  completeSession(data: SessionData): Promise<void>;
}
export interface ILearningRepository {
  transaction<T>(work: (tx: LearningTransaction) => Promise<T>): Promise<T>;
  history(
    userId: string,
    page: number,
    limit: number,
    status?: SessionData['status'],
  ): Promise<{ data: SessionData[]; total: number }>;
  reviews(
    userId: string,
    page: number,
    limit: number,
  ): Promise<{ data: ReviewEntry[]; total: number }>;
  reviewById(userId: string, id: string): Promise<ReviewEntry | null>;
  assessmentResults(
    userId: string,
    page: number,
    limit: number,
  ): Promise<{ data: AssessmentResult[]; total: number }>;
  assessmentResult(
    userId: string,
    id: string,
  ): Promise<AssessmentResult | null>;
  gameScores(
    userId: string,
    page: number,
    limit: number,
  ): Promise<{ data: GameScore[]; total: number }>;
  gameScore(userId: string, id: string): Promise<GameScore | null>;
  studySnapshot(userId: string): Promise<StudySnapshot | null>;
  statistics(
    userId: string,
  ): Promise<{
    cards: number;
    due: number;
    reviews: number;
    sessions: number;
    learnedWords: number;
    accuracy: number | null;
    studyMinutes: number;
  }>;
}
