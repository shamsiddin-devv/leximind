import {
  ChallengeData,
  ChallengeKind,
  ChallengePayload,
  ChallengeResult,
  QuizWord,
} from '../entities/Challenge';
import type { CefrLevel } from '../entities/Word';
import type { NotebookCount, NotebookEntry, NotebookMistake } from '../entities/MistakesNotebook';
export interface VocabularyFilter {
  cefrLevel?: CefrLevel;
  topic?: string;
}
export interface ChallengeTransaction {
  get(id: string, userId: string): Promise<ChallengeData | null>;
  finish(data: ChallengeData, result: ChallengeResult): Promise<void>;
  saveAttempts(data: ChallengeData): Promise<void>;
  audioEnabled(userId: string): Promise<boolean>;
  recordNotebookMistakes(data: ChallengeData, mistakes: readonly NotebookMistake[]): Promise<void>;
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
  notebook(userId: string, page: number, limit: number, kinds: readonly ChallengeKind[] | null, onlyOpen: boolean):
    Promise<{ entries: NotebookEntry[]; counts: NotebookCount[] }>;
  notebookEntry(userId: string, id: string): Promise<NotebookEntry | null>;
  setNotebookResolved(userId: string, id: string, resolved: boolean): Promise<{ resolvedAt: Date | null } | null>;
}
