import { routes } from '../../app/router';
import { listStudyVocabulary } from './studyVocabulary';
import type { Level } from '../../shared/types/api';

export const wordSearchLength = 80;

export function vocabularyHref(query: string, level: Level | '' = '', page = 1, topic = '') {
  const params = new URLSearchParams();
  if (query) params.set('search', query);
  if (level) params.set('level', level);
  if (page > 1) params.set('page', String(page));
  if (topic) params.set('topic', topic);
  return routes.vocabulary + (params.size ? '?' + params : '');
}

export function listWords({ query, level, page, limit, token, signal, topic }: {
  query: string; level?: Level | ''; page: number; limit: number; token: string; signal: AbortSignal; topic?: string;
}) {
  return listStudyVocabulary({ query, page, scope: level || 'all', topic: topic ?? '', status: '', fromLessons: false }, limit, token, signal);
}
