import type { ChallengeKind, Question } from './Challenge';
import type { Mistake } from './GameFeedback';

export const notebookKinds = {
  grammar: ['finish_sentence', 'build_sentence'],
  vocabulary: ['meaning_match', 'word_rush'],
  spelling: ['type_word', 'mistake_words'],
  pronunciation: ['word_dictation', 'sentence_dictation'],
} as const satisfies Record<string, readonly ChallengeKind[]>;
export type NotebookCategory = keyof typeof notebookKinds;
export const notebookCategories = Object.keys(notebookKinds) as NotebookCategory[];
const categoryByKind = new Map<ChallengeKind, NotebookCategory>(
  notebookCategories.flatMap((category) => notebookKinds[category].map((kind) => [kind, category] as const)),
);
export const notebookCategory = (kind: ChallengeKind) => categoryByKind.get(kind);

export type NotebookMistake = { index: number; answer: string; reason?: Mistake };
export type NotebookEntry = {
  id: string;
  kind: ChallengeKind;
  question: Question;
  submittedAnswer: string | null;
  expectedAnswer: string;
  reason: Mistake | null;
  occurredAt: Date;
  resolvedAt: Date | null;
};
export type NotebookCount = { kind: ChallengeKind; total: number; resolved: number };
