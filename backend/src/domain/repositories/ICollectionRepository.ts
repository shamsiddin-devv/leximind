export const collectionKinds = ['word', 'phrase', 'sentence'] as const;
export const collectionSources = ['personal', 'card'] as const;
export type CollectionSource = (typeof collectionSources)[number];

export type CollectionKind = (typeof collectionKinds)[number];

export interface CollectionDraft {
  kind: CollectionKind;
  text: string;
  translation: string;
  example: string;
  topic: string;
  progress: number;
}

export interface CollectionEntry extends CollectionDraft {
  id: string;
  createdAt: Date;
}

export interface ICollectionRepository {
  list(
    userId: string,
    page: number,
    limit: number,
  ): Promise<{
    data: Array<CollectionEntry & { pinned: boolean }>;
    total: number;
  }>;
  add(userId: string, entries: CollectionEntry[]): Promise<CollectionEntry[]>;
  update(
    userId: string,
    id: string,
    draft: CollectionDraft,
  ): Promise<CollectionEntry | null>;
  remove(userId: string, id: string): Promise<void>;
  setPin(
    userId: string,
    source: CollectionSource,
    id: string,
    pinned: boolean,
  ): Promise<boolean>;
  importPins(userId: string, ids: string[]): Promise<void>;
}
