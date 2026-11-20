import { api } from '../../shared/services/api';
import type { Page } from '../../shared/types/api';

export const collectionKinds = ['word', 'phrase', 'sentence'] as const;
export type CollectionKind = (typeof collectionKinds)[number];
export type CollectionDraft = {
  kind: CollectionKind; text: string; translation: string; example: string; topic: string; progress: number;
};
export type PersonalEntry = CollectionDraft & { id: string; createdAt: string };
export type CollectionEntry = PersonalEntry & { mastered: boolean; personal: boolean };
export type SavedCollection = { entries: PersonalEntry[]; pinned: string[] };
type CatalogEntry = Omit<CollectionEntry, 'topic' | 'personal' | 'kind'> & { topic: string | null };

const isText = (value: unknown, max: number): value is string => typeof value === 'string' && value.length <= max;
const isPersonalEntry = (value: unknown): value is PersonalEntry => {
  if (!value || typeof value !== 'object') return false;
  const entry = value as Partial<PersonalEntry>;
  return isText(entry.id, 100) && isText(entry.createdAt, 40) && Number.isFinite(Date.parse(entry.createdAt))
    && collectionKinds.some((kind) => kind === entry.kind) && isText(entry.text, 255)
    && isText(entry.translation, 255) && isText(entry.example, 500) && isText(entry.topic, 80)
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
        entries: Array.isArray(entries) ? entries.filter(isPersonalEntry) : [],
        pinned: Array.isArray(pinned) ? pinned.filter((id) => isText(id, 100)) : [],
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
  const limit = 100;
  const entries = new Map<string, CollectionEntry>();
  for (let page = 1; ; page++) {
    const result = await api<Page<CatalogEntry>>('/cards/collection?page=' + page + '&limit=' + limit, { token, signal });
    for (const entry of result.data) {
      entries.set(entry.id, { ...entry, topic: entry.topic ?? '', kind: catalogKind(entry), personal: false });
    }
    if (result.data.length < limit || page * limit >= result.total) return [...entries.values()];
  }
}
