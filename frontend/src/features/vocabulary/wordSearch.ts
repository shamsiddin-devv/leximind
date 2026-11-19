import { routes } from '../../app/router';
import { api } from '../../shared/services/api';
import type { Level, Page, Word } from '../../shared/types/api';

export const wordSearchLength = 80;

export function vocabularyHref(query: string, level: Level | '' = '', page = 1) {
  const params = new URLSearchParams();
  if (query) params.set('search', query);
  if (level) params.set('level', level);
  if (page > 1) params.set('page', String(page));
  return routes.vocabulary + (params.size ? '?' + params : '');
}

export function listWords({ query, level, page, limit, token, signal }: {
  query: string; level?: Level | ''; page: number; limit: number; token: string; signal: AbortSignal;
}) {
  const params = new URLSearchParams({ page: String(page), limit: String(limit) });
  const term = query.trim();
  if (term) params.set('search', term);
  if (level) params.set('cefrLevel', level);
  return api<Page<Word>>('/words?' + params, { token, signal });
}
