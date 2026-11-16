import {
  AudioLines, BookOpen, Brain, Grid2X2, Headphones, Keyboard,
  Languages, ListOrdered, RotateCcw, TextCursorInput, Zap,
} from 'lucide-react';
import type { Activity, Question, Word } from '../../shared/types/api';

export const activities = [
  { id: 'meaning_match', category: 'vocabulary', title: 'So‘zni toping', detail: 'So‘zga mos tarjimani tanlang.', icon: Languages, color: 'blue' },
  { id: 'type_word', category: 'vocabulary', title: 'Imlo mashqi', detail: 'Tarjimadan inglizcha so‘zni yozing.', icon: Keyboard, color: 'violet' },
  { id: 'word_dictation', category: 'vocabulary', title: 'Diktant', detail: 'Tinglang va eshitgan so‘zingizni yozing.', icon: Headphones, color: 'mint' },
  { id: 'word_rush', category: 'vocabulary', title: 'Tezkor tarjima', detail: '60 soniya ichida tarjimalarni toping.', icon: Zap, color: 'amber' },
  { id: 'finish_sentence', category: 'vocabulary', title: 'Gapni to‘ldiring', detail: 'Gapda yetishmayotgan so‘zni toping.', icon: TextCursorInput, color: 'mint' },
  { id: 'build_sentence', category: 'vocabulary', title: 'Gap tuzing', detail: 'So‘zlarni to‘g‘ri tartibda joylashtiring.', icon: ListOrdered, color: 'blue' },
  { id: 'sentence_dictation', category: 'vocabulary', title: 'Gap diktanti', detail: 'Gapni tinglab, to‘liq yozing.', icon: AudioLines, color: 'violet' },
  { id: 'mistake_words', category: 'vocabulary', title: 'Xatolar ustida ishlash', detail: 'Adashgan so‘zlaringizni takrorlang.', icon: RotateCcw, color: 'amber' },
  { id: 'word_span', category: 'memory', title: 'So‘zlar xotirasi', detail: 'So‘zlar va ularning tartibini eslab qoling.', icon: Brain, color: 'violet' },
  { id: 'sequence_memory', category: 'memory', title: 'Raqamlar xotirasi', detail: 'Raqamlarni berilgan tartibda takrorlang.', icon: ListOrdered, color: 'blue' },
  { id: 'visual_grid', category: 'memory', title: 'Kataklar xotirasi', detail: 'Yoritilgan kataklarni tartib bilan tanlang.', icon: Grid2X2, color: 'mint' },
  { id: 'assessment', category: 'assessment', title: 'Daraja testi', detail: 'Lug‘at bo‘yicha CEFR darajangizni baholang.', icon: BookOpen, color: 'amber' },
] as const satisfies ReadonlyArray<{ id: Activity; category: 'vocabulary' | 'memory' | 'assessment'; title: string; detail: string; icon: typeof Brain; color: string }>;

const samples = [
  ['curiosity', 'qiziquvchanlik', 'A strong desire to learn something.', 'Curiosity helps us learn.', 'B1'],
  ['journey', 'sayohat', 'A trip from one place to another.', 'The journey took two hours.', 'A2'],
  ['habit', 'odat', 'Something you do regularly.', 'Reading is a good habit.', 'A2'],
  ['discover', 'kashf etmoq', 'To find something new.', 'We discover new words every day.', 'A2'],
  ['improve', 'yaxshilamoq', 'To make something better.', 'I want to improve my English.', 'A2'],
  ['focus', 'diqqatni jamlamoq', 'To give your attention to something.', 'Try to focus on the question.', 'B1'],
] as const;
export const demoWords: Word[] = samples.map(([text, translationUz, definition, exampleSentence, cefrLevel]) => ({
  id: text, text, cefrLevel, sense: [{ translationUz, definition, exampleSentence }],
}));
export function demoQuestions(kind: Activity): { questions: Question[]; answers: string[] } {
  const words = demoWords.slice(0, 5);
  const translations = words.map((word) => word.sense[0].translationUz);
  if (kind === 'type_word') {
    return { questions: words.map((word) => ({
      prompt: word.sense[0].translationUz, definition: word.sense[0].definition, input: 'text', options: [],
    })), answers: words.map((word) => word.text) };
  }
  return {
    questions: words.map((word, index) => ({
      prompt: word.text,
      options: [2, 0, 3, 1].map((shift) => translations[(index + shift) % translations.length]),
    })),
    answers: translations,
  };
}
