import { api, explain } from '../../shared/services/api';
import type { Page } from '../../shared/types/api';

export const collectionKinds = ['word', 'phrase', 'sentence'] as const;
export type CollectionKind = (typeof collectionKinds)[number];
export type CollectionDraft = {
  kind: CollectionKind; text: string; translation: string; example: string; topic: string; progress: number;
};
export type PersonalEntry = CollectionDraft & { id: string; createdAt: string; pinned?: boolean };
export type CollectionEntry = PersonalEntry & { mastered: boolean; personal: boolean };
export type SavedCollection = { entries: PersonalEntry[]; pinned: string[] };
type CatalogEntry = Omit<CollectionEntry, 'topic' | 'personal' | 'kind'> & { topic: string | null };

const isText = (value: unknown, max: number): value is string => typeof value === 'string' && value.length <= max && !value.includes('\u0000');
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const isPersonalEntry = (value: unknown): value is PersonalEntry => {
  if (!value || typeof value !== 'object') return false;
  const entry = value as Partial<PersonalEntry>;
  return isText(entry.id, 36) && uuid.test(entry.id) && isText(entry.createdAt, 40) && Number.isFinite(Date.parse(entry.createdAt))
    && collectionKinds.some((kind) => kind === entry.kind) && isText(entry.text, 255) && !!entry.text.trim()
    && isText(entry.translation, 255) && !!entry.translation.trim() && isText(entry.example, 500) && isText(entry.topic, 80)
    && typeof entry.progress === 'number' && Number.isInteger(entry.progress) && entry.progress >= 0 && entry.progress <= 100;
};

export function collectionStorageKey(userId: string) {
  return 'leximind.my-collections.v1.' + userId;
}

export function readCollection(key: string): SavedCollection {
  try {
    const data: unknown = JSON.parse(localStorage.getItem(key) ?? 'null');
    if (data && typeof data === 'object') {
      const { entries, pinned } = data as Partial<SavedCollection>;
      return {
        entries: Array.isArray(entries) ? entries.filter(isPersonalEntry).map(({ id, createdAt, kind, text, translation, example, topic, progress }) => ({
          id: id.toLowerCase(), createdAt: new Date(createdAt).toISOString(), kind, text, translation, example, topic, progress,
        })) : [],
        pinned: Array.isArray(pinned) ? pinned.filter((id) => isText(id, 36) && uuid.test(id)).map((id) => id.toLowerCase()) : [],
      };
    }
  } catch { /* Recover from unavailable storage or invalid saved data. */ }
  return { entries: [], pinned: [] };
}

export function searchKey(text: string) {
  return text.normalize('NFKC').toLowerCase().replace(/[‘’ʻʼ`']/g, '').trim();
}

function catalogKind({ text, topic }: CatalogEntry): CollectionKind {
  if (topic === 'idioms') return 'phrase';
  if (/[.!?]$/.test(text) && /\s/.test(text)) return 'sentence';
  return /\s/.test(text) ? 'phrase' : 'word';
}

export async function loadCatalogCollection(token: string, signal: AbortSignal): Promise<CollectionEntry[]> {
  return loadCollection<CatalogEntry, CollectionEntry>('/cards/collection', token, signal, (entry) => ({
    ...entry, topic: entry.topic ?? '', kind: catalogKind(entry), personal: false,
  }));
}

export function loadPersonalCollection(token: string, signal: AbortSignal) {
  return loadCollection<PersonalEntry, PersonalEntry>('/collection-entries', token, signal, (entry) => entry);
}

async function loadCollection<T extends { id: string }, V>(
  path: string, token: string, signal: AbortSignal, adapt: (entry: T) => V,
): Promise<V[]> {
  const limit = 100;
  const entries = new Map<string, V>();
  for (let page = 1; ; page++) {
    const result = await api<Page<T>>(path + '?page=' + page + '&limit=' + limit, { token, signal });
    for (const entry of result.data) {
      entries.set(entry.id, adapt(entry));
    }
    if (result.data.length < limit || page * limit >= result.total) return [...entries.values()];
  }
}

export function addCollectionEntries(token: string, entries: PersonalEntry[], signal?: AbortSignal) {
  return api<PersonalEntry[]>('/collection-entries', { token, method: 'POST', body: { entries }, signal });
}

export function editCollectionEntry(token: string, id: string, draft: CollectionDraft) {
  return api<PersonalEntry>('/collection-entries/' + id, { token, method: 'PUT', body: draft });
}

export function deleteCollectionEntry(token: string, id: string) {
  return api<void>('/collection-entries/' + id, { token, method: 'DELETE' });
}

export function setCollectionPin(token: string, entry: CollectionEntry, pinned: boolean) {
  const source = entry.personal ? 'personal' : 'card';
  return api<void>('/collection-entries/pins/' + source + '/' + entry.id, {
    token, method: 'PUT', body: { pinned },
  });
}

export async function migrateBrowserCollection(token: string, key: string, signal: AbortSignal) {
  const pending = readCollection(key).entries;
  const batchSize = 40;
  let error: string | undefined;
  for (let offset = 0; offset < pending.length; offset += batchSize) {
    const batch = pending.slice(offset, offset + batchSize);
    try {
      await addCollectionEntries(token, batch, signal);
      signal.throwIfAborted();
    } catch (failure) {
      if (signal.aborted) throw failure;
      error = 'Brauzerdagi eski yozuvlarni ko‘chirib bo‘lmadi. ' + explain(failure);
      break;
    }
    const ids = new Set(batch.map(({ id }) => id));
    try {
      const current = readCollection(key);
      localStorage.setItem(key, JSON.stringify({
        ...current,
        entries: current.entries.filter(({ id }) => !ids.has(id)),
      }));
    } catch { /* A future migration retry keeps the same IDs. */ }
  }
  if (error) return error;

  const pins = [...new Set(readCollection(key).pinned)];
  for (let offset = 0; offset < pins.length; offset += 80) {
    const batch = pins.slice(offset, offset + 80);
    try {
      await api<void>('/collection-entries/pins/import', {
        token, method: 'POST', body: { ids: batch }, signal,
      });
      signal.throwIfAborted();
    } catch (failure) {
      if (signal.aborted) throw failure;
      return 'Eski mahkamlangan yozuvlarni ko‘chirib bo‘lmadi. ' + explain(failure);
    }
    const confirmed = new Set(batch);
    try {
      const current = readCollection(key);
      localStorage.setItem(key, JSON.stringify({
        ...current,
        pinned: current.pinned.filter((id) => !confirmed.has(id)),
      }));
    } catch { /* The next import preserves explicit server choices. */ }
  }
  return undefined;
}
