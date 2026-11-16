export const levels = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'] as const;
export type Level = (typeof levels)[number];
export type User = { id: string; fullName: string; email: string; emailVerifiedAt: string | null };
export type Profile = { level: Level; dailyNewWords: number; streakDay: number; timezone: string; feedbackAudioEnabled: boolean; lastSessionAt: string | null };
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
export type Task = { id: string; completed: boolean; text: string; definition: string; translationUz: string };
export type Session = { id: string; status: 'active' | 'completed' | 'cancelled'; endedAt: string | null; tasks: Task[] };
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

export type Statistics = { cards: number; due: number; reviews: number; sessions: number };
