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
    if (
      input === 'tokens' &&
      parts.length < targetParts.length &&
      parts.every((part) => targetParts.includes(part))
    ) {
      return { correct: false, mistake: 'incomplete' };
    }
    if (expected.length >= 3 && oneEdit(answer, expected))
      return { correct: false, mistake: 'typo' };
  }
  return { correct: false, mistake: 'incorrect' };
}

const cueGroups = {
  skipped: ['huh-cat', 'hub-intro-sound'],
  typo: ['bruh', 'dexter'],
  word_order: ['shocked', 'black-suit-spider-man'],
  incomplete: ['alert', 'galaxy'],
  incorrect: ['faah', 'chicken-on-tree-screaming'],
} as const satisfies Record<Mistake, readonly string[]>;
const successCue = 'encourage';
const recoveryCue = 'romanceeeeeeeeeeeeee';

export const soundIds = [
  ...Object.values(cueGroups).flat(),
  successCue,
  recoveryCue,
] as const;
export type SoundId = (typeof soundIds)[number];

export function chooseSound(
  feedback: AnswerFeedback,
  index: number,
  recovery: boolean,
): SoundId {
  if (feedback.correct) return recovery ? recoveryCue : successCue;
  const group = cueGroups[feedback.mistake ?? 'incorrect'];
  return group[index % group.length];
}
