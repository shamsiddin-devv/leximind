import { routes } from '../../app/router';
import { api } from '../../shared/services/api';
import { levels, type Level, type Page, type Word } from '../../shared/types/api';
import type { CourseProgress } from '../learning-path/useCourseProgress';

export const vocabularyStatuses = ['new', 'learning', 'due', 'mastered'] as const;
export type VocabularyStatus = (typeof vocabularyStatuses)[number];
export type StudyWord = Omit<Word, 'sense'> & {
  cardId: string | null;
  status: VocabularyStatus;
  fromLesson: boolean;
  sense: (Word['sense'][number] & { part?: string | null; exampleAudioUrl?: string | null })[];
};

export const statusLabels: Record<VocabularyStatus, string> = {
  new: 'Yangi', learning: 'O‘rganilmoqda', due: 'Takrorlash kerak', mastered: 'O‘zlashtirilgan',
};

export type StudyFilter = {
  query: string;
  scope: Level | 'all' | 'current';
  page: number;
  topic: string;
  status: VocabularyStatus | '';
  fromLessons: boolean;
};

export function vocabularyFilter(params: URLSearchParams): StudyFilter {
  const givenLevel = params.get('level');
  const query = params.get('search')?.slice(0, 80) ?? '';
  const rawTopic = params.get('topic') ?? '';
  const topic = rawTopic.length <= 60 && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(rawTopic) ? rawTopic : '';
  const page = Number(params.get('page'));
  return {
    query, topic,
    scope: levels.find((level) => level === givenLevel) ?? (givenLevel === 'current' || (!givenLevel && !query && !topic) ? 'current' : 'all'),
    page: Number.isInteger(page) && page >= 1 && page <= 100_000 ? page : 1,
    status: vocabularyStatuses.find((item) => item === params.get('status')) ?? '',
    fromLessons: params.get('from') === 'lesson',
  };
}

export function catalogHref(filter: StudyFilter) {
  const params = new URLSearchParams({ level: filter.scope });
  if (filter.query) params.set('search', filter.query);
  if (filter.topic) params.set('topic', filter.topic);
  if (filter.page > 1) params.set('page', String(filter.page));
  if (filter.status) params.set('status', filter.status);
  if (filter.fromLessons) params.set('from', 'lesson');
  return routes.vocabulary + '?' + params;
}

export function wordDetailHref(wordId: string, back?: string) {
  const params = back?.startsWith(routes.vocabulary + '?') ? '?' + new URLSearchParams({ back }).toString() : '';
  return routes.vocabulary + '/' + wordId + params;
}

export function listStudyVocabulary(filter: StudyFilter, limit: number, token: string, signal: AbortSignal) {
  const params = new URLSearchParams({ page: String(filter.page), limit: String(limit) });
  if (filter.scope === 'current') params.set('suggested', '1');
  else if (filter.scope !== 'all') params.set('cefrLevel', filter.scope);
  if (filter.query.trim()) params.set('search', filter.query.trim());
  if (filter.topic) params.set('topic', filter.topic);
  if (filter.status) params.set('status', filter.status);
  if (filter.fromLessons) params.set('fromLessons', '1');
  return api<Page<StudyWord> & { progress: CourseProgress }>('/learning-path/vocabulary?' + params, { token, signal });
}
