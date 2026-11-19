export const levels = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'] as const;
export type Level = (typeof levels)[number];
export type ProfilePrivacy = { profilePublic: boolean; profileSharing: boolean; publicStatistics: boolean; publicCefr: boolean };
export const privateProfile: ProfilePrivacy = { profilePublic: false, profileSharing: false, publicStatistics: false, publicCefr: false };
export type User = {
  id: string;
  fullName: string;
  email: string;
  emailVerifiedAt: string | null;
  avatarUrl?: string | null;
  bio?: string | null;
  bioFormat?: string | null;
  countryCode?: string | null;
  city?: string | null;
  location?: string | null;
  gender?: 'female' | 'male' | 'other' | 'undisclosed' | null;
  phoneNumber?: string | null;
  hasProfileBadge?: boolean;
  privacy?: ProfilePrivacy;
};
export type SharedProfileData = {
  fullName: string; avatarUrl: string | null; hasProfileBadge: boolean;
  level?: Level; statistics?: { learnedWords: number; streakDay: number };
};
export type AccountSession = { id: string; userAgent: string | null; createdAt: string; expiresAt: string; current: boolean };
export type ReviewMode = 'spaced' | 'random';
export type LearningPreferences = {
  studyLevel: Level | null;
  dailyNewWords: number;
  dailyStudyMinutes: number;
  reviewMode: ReviewMode;
  studyReminderEnabled: boolean;
  studyReminderTime: string;
  feedbackAudioEnabled: boolean;
  autoplayPronunciation: boolean;
};
export type Profile = LearningPreferences & { level: Level; streakDay: number; timezone: string; lastSessionAt: string | null };
export type Plan = {
  nextAction: 'RESUME_SESSION' | 'START_SESSION' | 'ADD_OR_RESUME_CARDS' | 'DAILY_NEW_LIMIT_REACHED' | 'CAUGHT_UP';
  activeSessionId: string | null;
  availableNow: number;
  activeCards: number;
  forecast: { date: string; count: number }[];
  difficultWords: { wordId: string; text: string; againCount: number }[];
  dailyNewReviewed: number;
  dailyNewLimit: number;
};
export type Word = {
  id: string; text: string; cefrLevel: Level; topic?: string; audioUrl?: string | null;
  sense: { translationUz: string; definition: string; exampleSentence?: string }[];
};
export type Page<T> = { data: T[]; total: number };
export type Task = { id: string; completed: boolean; text: string; definition: string; translationUz: string; audioUrl?: string | null };
export type SessionStatus = 'in_progress' | 'completed' | 'cancelled';
export type SessionSummary = { id: string; status: SessionStatus; startedAt: string; endedAt: string | null };
export type Session = SessionSummary & { tasks: Task[] };
export type Rating = 'AGAIN' | 'HARD' | 'GOOD' | 'EASY';
export type GameKind = 'meaning_match' | 'word_rush' | 'type_word' | 'finish_sentence' | 'build_sentence' | 'word_dictation' | 'sentence_dictation' | 'mistake_words' | 'sequence_memory' | 'word_span' | 'visual_grid';
export type Activity = GameKind | 'assessment';
export type Question = {
  prompt: string; options: string[]; input?: 'text' | 'tokens' | 'sentence';
  hint?: string; definition?: string; audioUrl?: string;
};
export type Round = {
  id: string; kind: Activity; expiresAt?: string;
  payload: { questions?: Question[]; stimulus?: string[]; gridSize?: number; previewMs?: number };
};
export type Result = { correctCount: number; totalQuestion: number; score: number; resultingLevel?: Level };
export type Attempt = {
  feedback: { correct: boolean };
  expectedAnswer: string;
  result?: Result;
  sound?: { url: string };
};
export type GameScore = { id: string; gameType: GameKind; score: number; playedAt: string };
export type SessionToken = { accessToken: string; expiresAt: string };

export type Statistics = {
  cards: number; due: number; reviews: number; sessions: number;
  learnedWords?: number; accuracy?: number | null; studyMinutes?: number;
};
