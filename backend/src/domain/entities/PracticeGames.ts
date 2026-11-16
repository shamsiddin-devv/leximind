import type { ChallengePayload, QuizWord, Question } from './Challenge';
import { ConflictError } from '../errors/ConflictError';

export const practiceKinds = [
  'type_word',
  'finish_sentence',
  'build_sentence',
  'word_dictation',
  'sentence_dictation',
  'mistake_words',
] as const;
export type PracticeKind = (typeof practiceKinds)[number];

export function createPractice(
  kind: PracticeKind,
  words: QuizWord[],
  shuffle: <T>(items: T[]) => T[],
): { payload: ChallengePayload; answers: string[] } {
  const questions: Question[] = [];
  const answers: string[] = [];
  const wordIds: string[] = [];
  const seen = new Set<string>();
  for (const word of shuffle(words)) {
    const answer = word.text.trim();
    if (!answer || seen.has(answer.toLowerCase()) || answer.length > 255)
      continue;
    const sentence = word.exampleSentence?.trim();
    let question: Question = {
      prompt: word.translation,
      options: [],
      input: 'text',
      definition: word.definition,
    };
    let expected = answer;
    if (kind === 'word_dictation') {
      if (!word.audioUrl?.startsWith('https://')) continue;
      question = {
        prompt: 'Listen and type the English word.',
        options: [],
        input: 'text',
        audioUrl: word.audioUrl,
      };
    } else if (kind === 'sentence_dictation') {
      if (!sentence || !word.exampleAudioUrl?.startsWith('https://')) continue;
      question = {
        prompt: 'Listen and type the English sentence.',
        options: [],
        input: 'sentence',
        audioUrl: word.exampleAudioUrl,
      };
      expected = sentence;
    } else if (kind === 'finish_sentence') {
      if (!sentence) continue;
      const escaped = answer.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&');
      const blank = sentence.replace(
        new RegExp(
          '(?<![\\p{L}\\p{N}])' + escaped + '(?![\\p{L}\\p{N}])',
          'giu',
        ),
        '____',
      );
      if (blank === sentence) continue;
      question = {
        prompt: blank,
        options: [],
        input: 'text',
        hint: word.translation,
      };
    } else if (kind === 'build_sentence') {
      if (!sentence || sentence.length > 255) continue;
      const tokens = sentence.split(/\s+/u);
      if (tokens.length < 3 || tokens.length > 20 || new Set(tokens).size < 2)
        continue;
      const shuffled = shuffle(tokens);
      if (shuffled.join(' ') === tokens.join(' '))
        shuffled.push(shuffled.shift()!);
      question = {
        prompt: 'Put the words in order.',
        options: shuffled,
        input: 'tokens',
        hint: word.translation,
      };
      expected = sentence;
    }
    questions.push(question);
    answers.push(expected);
    wordIds.push(word.id);
    seen.add(answer.toLowerCase());
    if (questions.length === 10) break;
  }
  if (!questions.length)
    throw new ConflictError(
      kind === 'mistake_words'
        ? 'No mistakes to practice yet.'
        : 'No catalog entries are suitable for this game.',
    );
  return { payload: { questions, wordIds }, answers };
}
