import { api } from '../../shared/services/api';
import type { GameKind, Question } from '../../shared/types/api';

export const mistakeCategories = [
  { id: 'grammar', label: 'Grammatika' },
  { id: 'vocabulary', label: 'Lug‘at' },
  { id: 'spelling', label: 'Imlo' },
  { id: 'pronunciation', label: 'Talaffuz' },
] as const;
export type MistakeCategory = (typeof mistakeCategories)[number]['id'];
type MistakeReason = 'skipped' | 'typo' | 'word_order' | 'incomplete' | 'incorrect';
export type MistakeEntry = {
  id: string; kind: GameKind; category: MistakeCategory; question: Question;
  submittedAnswer: string | null; expectedAnswer: string; reason: MistakeReason | null;
  occurredAt: string; resolvedAt: string | null;
};
export type MistakeSummary = { category: MistakeCategory; total: number; resolved: number };
export type NotebookResponse = { data: MistakeEntry[]; summary: MistakeSummary[]; total: number };

const labelByCategory = Object.fromEntries(mistakeCategories.map(({ id, label }) => [id, label])) as Record<MistakeCategory, string>;
export const categoryLabel = (category: MistakeCategory) => labelByCategory[category];

const reasonTips: Partial<Record<MistakeReason, string>> = {
  skipped: 'Bu savolga javob berilmagan. Savolni qayta o‘qib, javob yozib ko‘ring.',
  typo: 'To‘g‘ri javobdagi harflar va ularning tartibiga e’tibor bering.',
  word_order: 'Gap bo‘laklarining joylashuvini to‘g‘ri javob bilan solishtiring.',
  incomplete: 'Javobda tushib qolgan so‘zlarni toping va gapni to‘liq yozing.',
};
const categoryTips: Record<MistakeCategory, string> = {
  grammar: 'Gap tuzilishini to‘g‘ri javob bilan solishtiring.',
  vocabulary: 'So‘zning ma’nosini to‘g‘ri javob bilan bog‘lab eslab qoling.',
  spelling: 'So‘zni bo‘g‘inlarga ajratib, yozilishini yana bir bor mashq qiling.',
  pronunciation: 'Audioni qayta tinglab, eshitganingizni to‘liq yozing.',
};
export function mistakeTip(entry: MistakeEntry) {
  return (entry.reason && reasonTips[entry.reason]) || categoryTips[entry.category];
}

export function loadNotebook(token: string, page: number, limit: number, category: MistakeCategory | '', onlyOpen: boolean, signal: AbortSignal) {
  const query = new URLSearchParams({ page: String(page), limit: String(limit), onlyOpen: String(onlyOpen) });
  if (category) query.set('category', category);
  return api<NotebookResponse>('/mistakes-notebook?' + query, { token, signal });
}
