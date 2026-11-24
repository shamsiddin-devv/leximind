import type { CefrLevel } from './Word';
import { BadRequestError } from '../errors/BadRequestError';
import { ConflictError } from '../errors/ConflictError';
import { AnswerFeedback, gradeAnswer } from './GameFeedback';
import {
  createPractice,
  practiceKinds,
  type PracticeKind,
} from './PracticeGames';
export const gameKinds = [
  'word_span',
  'sequence_memory',
  'meaning_match',
  'visual_grid',
  'word_rush',
  ...practiceKinds,
] as const;
export type GameKind = (typeof gameKinds)[number];
export type ChallengeKind = GameKind | 'assessment';
export interface QuizWord {
  id: string;
  text: string;
  translation: string;
  level: CefrLevel;
  definition?: string;
  exampleSentence?: string;
  audioUrl?: string | null;
  exampleAudioUrl?: string | null;
}
export interface Question {
  prompt: string;
  options: string[];
  level?: CefrLevel;
  input?: 'text' | 'tokens' | 'sentence';
  definition?: string;
  hint?: string;
  audioUrl?: string;
}
export interface ChallengePayload {
  questions?: Question[];
  stimulus?: string[];
  gridSize?: number;
  previewMs?: number;
  wordIds?: string[];
}
export interface ChallengeData {
  id: string;
  userId: string;
  kind: ChallengeKind;
  payload: ChallengePayload;
  answers: string[];
  expiresAt: Date;
  completedAt: Date | null;
  result: ChallengeResult | null;
  attempts?: AnswerFeedback[];
  createdAt?: Date;
}
export interface ChallengeResult {
  correctCount: number;
  totalQuestion: number;
  score: number;
  resultingLevel?: CefrLevel;
  feedback?: AnswerFeedback[];
}
const levels: CefrLevel[] = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
export function createChallenge(
  kind: ChallengeKind,
  words: QuizWord[],
  random: (max: number) => number,
): { payload: ChallengePayload; answers: string[] } {
  const shuffle = <T>(items: T[]) => {
    const a = [...items];
    for (let i = a.length - 1; i > 0; i--) {
      const j = random(i + 1);
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };
  if (practiceKinds.some((practice) => practice === kind)) {
    return createPractice(kind as PracticeKind, words, shuffle);
  }
  if (kind === 'sequence_memory' || kind === 'visual_grid') {
    const stimulus =
      kind === 'visual_grid'
        ? shuffle(Array.from({ length: 16 }, (_, i) => String(i))).slice(0, 6)
        : Array.from({ length: 7 }, () => String(random(10)));
    return {
      payload: {
        stimulus,
        previewMs: 5000,
        ...(kind === 'visual_grid' ? { gridSize: 4 } : {}),
      },
      answers: stimulus,
    };
  }
  if (kind === 'word_span') {
    if (words.length < 7)
      throw new ConflictError('At least seven words are required.');
    const selected = shuffle(words).slice(0, 7);
    const stimulus = selected.map((w) => w.text);
    return {
      payload: {
        stimulus,
        previewMs: 5000,
        wordIds: selected.map((w) => w.id),
      },
      answers: stimulus,
    };
  }
  if (new Set(words.map((w) => w.translation)).size < 4)
    throw new ConflictError(
      'At least four distinct translations are required.',
    );
  let selected: QuizWord[];
  if (kind === 'assessment') {
    selected = [];
    for (const level of levels) {
      const group = shuffle(words.filter((w) => w.level === level));
      if (group.length < 3)
        throw new ConflictError(
          'Assessment requires at least three words at every CEFR level.',
        );
      selected.push(...group.slice(0, 3));
    }
  } else selected = shuffle(words).slice(0, kind === 'word_rush' ? 20 : 10);
  const questions = selected.map((w) => ({
    prompt: w.text,
    options: shuffle([
      w.translation,
      ...shuffle(
        [...new Set(words.map((x) => x.translation))].filter(
          (x) => x !== w.translation,
        ),
      ).slice(0, 3),
    ]),
    ...(kind === 'assessment' ? { level: w.level } : {}),
  }));
  return {
    payload: {
      questions,
      ...(kind === 'assessment' ? {} : { wordIds: selected.map((w) => w.id) }),
    },
    answers: selected.map((w) => w.translation),
  };
}
export class Challenge {
  constructor(readonly data: ChallengeData) {}
  submit(answers: string[], now: Date): ChallengeResult {
    this.assertOpen(now);
    if (this.data.attempts?.length)
      throw new ConflictError(
        'Finish this round through the attempts endpoint.',
      );
    if (answers.length !== this.data.answers.length)
      throw new BadRequestError(
        'Submit one answer per question; use an empty string for skipped questions.',
      );
    return this.finish(
      answers.map((answer, index) => this.grade(index, answer)),
      now,
    );
  }

  attempt(index: number, answer: string, now: Date) {
    const attempts = this.data.attempts ?? [];
    if (
      !Number.isInteger(index) ||
      index < 0 ||
      index >= this.data.answers.length
    )
      throw new BadRequestError('Invalid question index.');
    if (index < attempts.length) {
      return {
        feedback: attempts[index],
        replayed: true,
        result: this.data.result,
      };
    }
    this.assertOpen(now);
    if (index !== attempts.length)
      throw new ConflictError('Answer the current question first.');
    const feedback = this.grade(index, answer);
    this.data.attempts = [...attempts, feedback];
    const result =
      this.data.attempts.length === this.data.answers.length
        ? this.finish(this.data.attempts, now)
        : null;
    return { feedback, replayed: false, result };
  }

  private assertOpen(now: Date) {
    if (this.data.completedAt)
      throw new ConflictError('Challenge is already submitted.');
    if (now > this.data.expiresAt)
      throw new ConflictError('Challenge expired.');
  }

  private grade(index: number, answer: string) {
    const input =
      this.data.payload.questions?.[index].input ??
      (this.data.kind === 'word_span' ? 'text' : undefined);
    const feedback = gradeAnswer(answer, this.data.answers[index], input);
    if (
      !feedback.correct &&
      feedback.mistake !== 'skipped' &&
      this.data.payload.stimulus &&
      this.data.answers.some(
        (target, other) =>
          other !== index && gradeAnswer(answer, target).correct,
      )
    ) {
      return { correct: false, mistake: 'word_order' as const };
    }
    return feedback;
  }

  private finish(feedback: AnswerFeedback[], now: Date): ChallengeResult {
    const correct = feedback.map((item) => item.correct);
    const correctCount = correct.filter(Boolean).length;
    const result: ChallengeResult = {
      correctCount,
      totalQuestion: feedback.length,
      score: correctCount * 10,
    };
    if (this.data.kind === 'assessment') {
      let level: CefrLevel = 'A1';
      for (const candidate of levels) {
        const hits = correct.filter(
          (ok, i) => ok && this.data.payload.questions?.[i].level === candidate,
        ).length;
        if (hits < 2) break;
        level = candidate;
      }
      result.resultingLevel = level;
    } else result.feedback = feedback;
    this.data.completedAt = now;
    this.data.result = result;
    return result;
  }
}
