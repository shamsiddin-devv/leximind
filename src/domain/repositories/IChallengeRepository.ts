import {
  ChallengeData,
  ChallengeKind,
  ChallengePayload,
  ChallengeResult,
  QuizWord,
} from '../entities/Challenge';
import type { CefrLevel } from '../entities/Word';
export interface VocabularyFilter {
  cefrLevel?: CefrLevel;
  topic?: string;
}
export interface ChallengeTransaction {
  get(id: string, userId: string): Promise<ChallengeData | null>;
  finish(data: ChallengeData, result: ChallengeResult): Promise<void>;
  saveAttempts(data: ChallengeData): Promise<void>;
  audioEnabled(userId: string): Promise<boolean>;
}
export interface IChallengeRepository {
  vocabulary(
    kind: ChallengeKind,
    userId: string,
    filter?: VocabularyFilter,
  ): Promise<QuizWord[]>;
  create(
    userId: string,
    kind: ChallengeKind,
    payload: ChallengePayload,
    answers: string[],
    expiresAt: Date,
  ): Promise<ChallengeData>;
  transaction<T>(work: (tx: ChallengeTransaction) => Promise<T>): Promise<T>;
  history(
    userId: string,
    assessment: boolean,
    page: number,
    limit: number,
  ): Promise<{ data: unknown[]; total: number }>;
}
