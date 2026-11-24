import { Inject, Injectable } from '@nestjs/common';
import {
  and,
  asc,
  count,
  desc,
  eq,
  getColumns,
  inArray,
  isNull,
  sql,
} from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import type {
  CollectionDraft,
  CollectionEntry,
  CollectionSource,
  ICollectionRepository,
} from '../../domain/repositories/ICollectionRepository';
import { DRIZZLE } from '../db/drizzle/drizzle.provider';
import type { relations } from '../db/drizzle/drizzle.relations';
import { cards, collectionEntries } from '../db/drizzle/drizzle.schema';

const columns = getColumns(collectionEntries);
const entryColumns = {
  id: columns.id,
  kind: columns.kind,
  text: columns.text,
  translation: columns.translation,
  example: columns.example,
  topic: columns.topic,
  progress: columns.progress,
  createdAt: columns.createdAt,
  pinned: sql<boolean>`coalesce(${columns.collectionPinned}, false)`,
};

const activeEntries = (userId: string) =>
  and(
    eq(collectionEntries.userId, userId),
    isNull(collectionEntries.deletedAt),
  );

@Injectable()
export class DrizzleCollectionRepository implements ICollectionRepository {
  constructor(
    @Inject(DRIZZLE) private readonly db: NodePgDatabase<typeof relations>,
  ) {}

  async list(userId: string, page: number, limit: number) {
    const owner = activeEntries(userId);
    return this.db.transaction(
      async (tx) => {
        const [{ total }] = await tx
          .select({ total: count() })
          .from(collectionEntries)
          .where(owner);
        const data = await tx
          .select(entryColumns)
          .from(collectionEntries)
          .where(owner)
          .orderBy(desc(collectionEntries.createdAt), asc(collectionEntries.id))
          .limit(limit)
          .offset((page - 1) * limit);
        return { data, total };
      },
      { isolationLevel: 'repeatable read', accessMode: 'read only' },
    );
  }

  async add(userId: string, entries: CollectionEntry[]) {
    return this.db.transaction(async (tx) => {
      await tx
        .insert(collectionEntries)
        .values(entries.map((entry) => ({ ...entry, userId })))
        .onConflictDoNothing({
          target: [collectionEntries.userId, collectionEntries.id],
        });
      return tx
        .select(entryColumns)
        .from(collectionEntries)
        .where(
          and(
            activeEntries(userId),
            inArray(
              collectionEntries.id,
              entries.map(({ id }) => id),
            ),
          ),
        );
    });
  }

  async update(userId: string, id: string, draft: CollectionDraft) {
    const [row] = await this.db
      .update(collectionEntries)
      .set(draft)
      .where(and(activeEntries(userId), eq(collectionEntries.id, id)))
      .returning(entryColumns);
    return row ?? null;
  }

  async setPin(
    userId: string,
    source: CollectionSource,
    id: string,
    pinned: boolean,
  ) {
    const [row] =
      source === 'personal'
        ? await this.db
            .update(collectionEntries)
            .set({ collectionPinned: pinned })
            .where(and(activeEntries(userId), eq(collectionEntries.id, id)))
            .returning({ id: collectionEntries.id })
        : await this.db
            .update(cards)
            .set({ collectionPinned: pinned })
            .where(and(eq(cards.userId, userId), eq(cards.id, id)))
            .returning({ id: cards.id });
    return Boolean(row);
  }

  async importPins(userId: string, ids: string[]) {
    await this.db.transaction(async (tx) => {
      await tx
        .update(collectionEntries)
        .set({ collectionPinned: true })
        .where(
          and(
            activeEntries(userId),
            inArray(collectionEntries.id, ids),
            isNull(collectionEntries.collectionPinned),
          ),
        );
      await tx
        .update(cards)
        .set({ collectionPinned: true })
        .where(
          and(
            eq(cards.userId, userId),
            inArray(cards.id, ids),
            isNull(cards.collectionPinned),
          ),
        );
    });
  }

  async remove(userId: string, id: string) {
    await this.db
      .update(collectionEntries)
      .set({
        deletedAt: sql`now()`,
        collectionPinned: false,
        text: '',
        translation: '',
        example: '',
        topic: '',
        progress: 0,
      })
      .where(and(activeEntries(userId), eq(collectionEntries.id, id)));
  }
}
