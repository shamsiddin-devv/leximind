import { Card } from '../entities/Card';
import { SessionData } from '../entities/LearningSession';
import type { CefrLevel } from '../entities/Word';
import { IReviewRating } from '../services/IReviewRatingService';
import type { GameKind } from '../entities/Challenge';
import type { AchievementProgress } from '../entities/Achievement';

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
  activity: {
    today: string;
    weekStart: string;
    completedDays: string[];
    studyMinutesToday: number;
    currentStreak: number;
    longestStreak: number;
    gameKindsToday: GameKind[];
  };
  forecast: { date: string; count: number }[];
  difficultWords: { wordId: string; text: string; againCount: number }[];
}
export const reviewModes = ['spaced', 'random'] as const;
export type ReviewMode = (typeof reviewModes)[number];
export const reviewQueues = ['today', 'new', 'learning'] as const;
export type ReviewQueue = (typeof reviewQueues)[number];
export interface ReviewPrompt {
  text: string;
  topic: string | null;
  cefrLevel: CefrLevel;
}
export interface ReviewOverview {
  activeCards: number;
  newCards: number;
  learningCards: number;
  masteredCards: number;
  longestIntervalMinutes: number | null;
  nextDueAt: Date | null;
  queues: Record<ReviewQueue, { count: number; first: ReviewPrompt | null }>;
  topics: { topic: string | null; total: number; due: number }[];
}
export interface LearningAnalytics {
  today: string;
  totalXp: number;
  activeWords: number;
  accuracy: number | null;
  studySeconds: number;
  weeks: {
    date: string;
    xp: number;
    accuracy: number | null;
    newWords: number;
  }[];
  days: { date: string; studySeconds: number }[];
  months: { date: string; studySeconds: number }[];
  skills: Partial<
    Record<
      'vocabulary' | 'grammar' | 'listening' | 'reading' | 'writing',
      number
    >
  >;
}
export interface LearningCalendar {
  today: string;
  monthStart: string;
  dailyStudyMinutes: number;
  dailyNewWords: number;
  days: {
    date: string;
    studySeconds: number;
    newWords: number;
    sessions: number;
    xp: number;
    active: boolean;
  }[];
}
export interface TopicProgress {
  topic: string;
  total: number;
  learned: number;
  cefrLevel: CefrLevel;
}
export const leaderboardPeriods = ['all', 'month', 'week', 'today'] as const;
export type LeaderboardPeriod = (typeof leaderboardPeriods)[number];
export interface RankingEntry {
  id: string;
  fullName: string;
  avatarUrl: string | null;
  hasProfileBadge: boolean;
  canViewProfile: boolean;
  xp: number;
  streak: number;
  rank: number | null;
}
export interface Leaderboard {
  entries: RankingEntry[];
  own: RankingEntry | null;
  participants: number;
}
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
export type ProfilePreferences = Pick<
  Profile,
  | 'studyLevel'
  | 'timezone'
  | 'dailyNewWords'
  | 'dailyStudyMinutes'
  | 'reviewMode'
  | 'studyReminderEnabled'
  | 'studyReminderTime'
  | 'feedbackAudioEnabled'
  | 'autoplayPronunciation'
>;
export interface SessionTask extends ReviewPrompt {
  id: string;
  sessionId: string;
  cardId: string;
  orderIndex: number;
  completed: boolean;
  correct: boolean | null;
  wordId: string;
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
  dueCards(
    userId: string,
    limit: number,
    newLimit: number,
    queue?: ReviewQueue,
  ): Promise<Card[]>;
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
  reviewOverview(userId: string): Promise<ReviewOverview>;
  analytics(userId: string): Promise<LearningAnalytics | null>;
  calendar(userId: string, month?: string): Promise<LearningCalendar | null>;
  topics(userId: string): Promise<TopicProgress[]>;
  achievements(userId: string): Promise<AchievementProgress[]>;
  leaderboard(userId: string, period: LeaderboardPeriod): Promise<Leaderboard>;
  statistics(userId: string): Promise<{
    cards: number;
    due: number;
    reviews: number;
    sessions: number;
    learnedWords: number;
    accuracy: number | null;
    studyMinutes: number;
  }>;
}
