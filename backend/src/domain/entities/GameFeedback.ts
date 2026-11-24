import type { GameKind } from './Challenge';

export type Mistake =
  'skipped' | 'typo' | 'word_order' | 'incomplete' | 'incorrect';
export interface AnswerFeedback {
  correct: boolean;
  mistake?: Mistake;
}

function normalize(value: string, sentence: boolean) {
  const text = value
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[’‘ʻʼ]/gu, "'")
    .trim();
  return (sentence ? text.replace(/[.!?,;:]+/gu, ' ') : text)
    .replace(/\s+/gu, ' ')
    .trim();
}

function oneEdit(answer: string, expected: string) {
  const a = [...answer],
    b = [...expected];
  if (Math.abs(a.length - b.length) > 1) return false;
  const first = a.findIndex((char, index) => char !== b[index]);
  if (first === -1) return a.length !== b.length;
  if (a.length < b.length)
    return a.slice(first).join('') === b.slice(first + 1).join('');
  if (a.length > b.length)
    return a.slice(first + 1).join('') === b.slice(first).join('');
  return (
    a.slice(first + 1).join('') === b.slice(first + 1).join('') ||
    (a[first] === b[first + 1] &&
      a[first + 1] === b[first] &&
      a.slice(first + 2).join('') === b.slice(first + 2).join(''))
  );
}

function isPartialSentence(parts: string[], targetParts: string[]) {
  if (parts.length >= targetParts.length) return false;
  let matched = 0;
  for (const part of targetParts) {
    if (part === parts[matched]) matched += 1;
  }
  return matched === parts.length;
}

export function gradeAnswer(
  value: string,
  target: string,
  input?: 'text' | 'tokens' | 'sentence',
): AnswerFeedback {
  const answer = normalize(value, input === 'tokens' || input === 'sentence');
  const expected = normalize(
    target,
    input === 'tokens' || input === 'sentence',
  );
  if (answer === expected) return { correct: true };
  if (!answer) return { correct: false, mistake: 'skipped' };
  if (input) {
    const parts = answer.split(' '),
      targetParts = expected.split(' ');
    if (
      parts.length > 1 &&
      [...parts].sort().join(' ') === [...targetParts].sort().join(' ')
    ) {
      return { correct: false, mistake: 'word_order' };
    }
    if (input !== 'text' && isPartialSentence(parts, targetParts)) {
      return { correct: false, mistake: 'incomplete' };
    }
    if (expected.length >= 3 && oneEdit(answer, expected))
      return { correct: false, mistake: 'typo' };
  }
  return { correct: false, mistake: 'incorrect' };
}

export const soundIds = [
  'huh-cat',
  'hub-intro-sound',
  'bruh',
  'dexter',
  'shocked',
  'black-suit-spider-man',
  'alert',
  'galaxy',
  'faah',
  'chicken-on-tree-screaming',
  'encourage',
  'romanceeeeeeeeeeeeee',
] as const;
export type SoundId = (typeof soundIds)[number];

const mistakeCues = {
  skipped: ['huh-cat', 'hub-intro-sound'],
  typo: ['bruh', 'dexter'],
  word_order: ['shocked', 'black-suit-spider-man'],
  incomplete: ['alert', 'galaxy'],
} as const satisfies Record<Exclude<Mistake, 'incorrect'>, readonly SoundId[]>;
const repeatedCues = {
  typo: ['alert', 'dexter', 'bruh'],
  word_order: ['black-suit-spider-man', 'shocked', 'alert'],
  incomplete: ['galaxy', 'huh-cat', 'alert'],
  incorrect: ['black-suit-spider-man', 'shocked', 'chicken-on-tree-screaming'],
} as const satisfies Record<Exclude<Mistake, 'skipped'>, readonly SoundId[]>;

const translationCues = ['faah', 'bruh', 'shocked'] as const;
const writingCues = ['bruh', 'dexter', 'faah'] as const;
const dictationCues = ['huh-cat', 'alert', 'dexter'] as const;
const incorrectCuesByGame = {
  meaning_match: translationCues,
  word_rush: ['faah', 'alert', 'chicken-on-tree-screaming'],
  type_word: writingCues,
  mistake_words: writingCues,
  word_dictation: dictationCues,
  sentence_dictation: dictationCues,
  finish_sentence: ['huh-cat', 'bruh', 'alert'],
  build_sentence: ['shocked', 'dexter', 'black-suit-spider-man'],
  word_span: ['huh-cat', 'galaxy', 'dexter'],
  sequence_memory: ['alert', 'shocked', 'black-suit-spider-man'],
  visual_grid: ['galaxy', 'alert', 'chicken-on-tree-screaming'],
} as const satisfies Record<GameKind, readonly SoundId[]>;
const success = ['encourage', 'romanceeeeeeeeeeeeee'] as const;
const recovery = ['romanceeeeeeeeeeeeee', 'encourage'] as const;

function cueGroup(
  kind: GameKind,
  feedback: AnswerFeedback,
  wrongStreak: number,
): readonly SoundId[] {
  if (feedback.correct)
    return wrongStreak || kind === 'mistake_words' ? recovery : success;
  const mistake = feedback.mistake ?? 'incorrect';
  if (mistake === 'skipped') return mistakeCues.skipped;
  if (wrongStreak > 0) return repeatedCues[mistake];
  return mistake === 'incorrect'
    ? incorrectCuesByGame[kind]
    : mistakeCues[mistake];
}

export function chooseSound(
  kind: GameKind,
  history: readonly AnswerFeedback[],
  seed: number,
): SoundId | undefined {
  const nextPositions = new Map<readonly SoundId[], number>();
  let last: SoundId | undefined;
  let wrongStreak = 0;
  for (const feedback of history) {
    const group = cueGroup(kind, feedback, wrongStreak);
    const initial = feedback.correct ? 0 : seed % group.length;
    let position = nextPositions.get(group) ?? initial;
    if (group[position] === last) position = (position + 1) % group.length;
    last = group[position];
    nextPositions.set(group, (position + 1) % group.length);
    wrongStreak =
      feedback.correct || feedback.mistake === 'skipped' ? 0 : wrongStreak + 1;
  }
  return last;
}

export function chooseRoundSound(
  kind: GameKind,
  feedback: readonly AnswerFeedback[],
  seed: number,
) {
  const lastMistake = feedback.findLastIndex(
    (item) => !item.correct && item.mistake !== 'skipped',
  );
  if (lastMistake >= 0)
    return chooseSound(kind, feedback.slice(0, lastMistake + 1), seed);
  if (
    feedback.some((item) => item.correct) &&
    feedback.some((item) => !item.correct)
  ) {
    return chooseSound(kind, [{ correct: false, mistake: 'incomplete' }], seed);
  }
  return chooseSound(kind, feedback.slice(0, 1), seed);
}
