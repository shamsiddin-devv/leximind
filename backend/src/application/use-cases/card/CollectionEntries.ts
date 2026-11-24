import { NotFoundError } from '../../../domain/errors/NotFoundError';
import type {
  CollectionDraft,
  CollectionEntry,
  CollectionSource,
  ICollectionRepository,
} from '../../../domain/repositories/ICollectionRepository';

export class CollectionEntries {
  constructor(private readonly entries: ICollectionRepository) {}

  list(userId: string, page: number, limit: number) {
    return this.entries.list(userId, page, limit);
  }

  import(userId: string, entries: CollectionEntry[]) {
    return this.entries.add(userId, entries);
  }

  async update(userId: string, id: string, draft: CollectionDraft) {
    const entry = await this.entries.update(userId, id, draft);
    if (!entry) throw new NotFoundError('Collection entry not found.');
    return entry;
  }

  importPins(userId: string, ids: string[]) {
    return this.entries.importPins(userId, ids);
  }

  async pin(
    userId: string,
    source: CollectionSource,
    id: string,
    pinned: boolean,
  ) {
    if (!(await this.entries.setPin(userId, source, id, pinned))) {
      throw new NotFoundError('Collection entry not found.');
    }
  }

  remove(userId: string, id: string) {
    return this.entries.remove(userId, id);
  }
}
