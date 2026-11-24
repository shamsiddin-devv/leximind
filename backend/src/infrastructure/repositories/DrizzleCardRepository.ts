import { Inject, Injectable } from '@nestjs/common';
import { and, asc, count, eq, isNull, lte, sql, SQL } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DRIZZLE } from '../db/drizzle/drizzle.provider';
import { relations } from '../db/drizzle/drizzle.relations';
import {
  cards,
  reviewLogs,
  sessions,
  sessionsTasks,
} from '../db/drizzle/drizzle.schema';
import { ConflictError } from '../../domain/errors/ConflictError';
import { NotFoundError } from '../../domain/errors/NotFoundError';
import {
  CardFilters,
  CollectionCard,
  ICardRepository,
} from '../../domain/repositories/ICardRepository';
import { Card } from '../../domain/entities/Card';
export function cardFromRow(r: typeof cards.$inferSelect) {
  return new Card({
    id: r.id,
    userId: r.userId,
    wordId: r.wordId,
    stability: r.stability,
    difficulty: r.difficulty,
    due: r.due,
    reps: r.reps,
    lapses: r.lapses,
    state: r.state,
    lastReviewedAt: r.lastReviewAt ?? undefined,
    pausedAt: r.pausedAt ?? undefined,
    createdAt: r.createdAt,
  });
}
export function cardValues(c: Card) {
  return {
    userId: c.userId,
    wordId: c.wordId,
    stability: c.stability,
    difficulty: c.difficulty,
    due: c.due,
    reps: c.reps,
    lapses: c.lapses,
    state: c.state,
    lastReviewAt: c.lastReviewedAt ?? null,
  };
}
@Injectable()
export class DrizzleCardRepository implements ICardRepository {
  constructor(
    @Inject(DRIZZLE) private readonly db: NodePgDatabase<typeof relations>,
  ) {}
  async findById(id: string) {
    const [r] = await this.db.select().from(cards).where(eq(cards.id, id));
    return r ? cardFromRow(r) : null;
  }
  async findUnique(userId: string, wordId: string) {
    const [r] = await this.db
      .select()
      .from(cards)
      .where(and(eq(cards.userId, userId), eq(cards.wordId, wordId)));
    return r ? cardFromRow(r) : null;
  }
  async findAll(f: CardFilters) {
    const page = Math.max(f.page ?? 1, 1),
      pageSize = Math.max(1, Math.min(f.pageSize ?? f.limit ?? 20, 100));
    const conditions: SQL[] = [];
    if (f.userId) conditions.push(eq(cards.userId, f.userId));
    if (f.wordId) conditions.push(eq(cards.wordId, f.wordId));
    if (f.state) conditions.push(eq(cards.state, f.state));
    if (f.dueBefore)
      conditions.push(lte(cards.due, f.dueBefore), isNull(cards.pausedAt));
    const where = and(...conditions),
      rows = await this.db
        .select()
        .from(cards)
        .where(where)
        .orderBy(asc(cards.due), asc(cards.id))
        .limit(pageSize)
        .offset((page - 1) * pageSize);
    const [c] = await this.db
      .select({ total: count() })
      .from(cards)
      .where(where);
    return {
      data: rows.map(cardFromRow),
      page,
      pageSize,
      total: c.total,
      totalPage: Math.ceil(c.total / pageSize),
    };
  }
  async listCollection(userId: string, page: number, limit: number) {
    const [result, counts] = await Promise.all([
      this.db.execute<CollectionCard>(sql`
        SELECT c.id, w.text, w.topic, c.created_at AS "createdAt",
          coalesce(s.translation_uz, '') AS translation,
          coalesce(s.example_sentence, '') AS example,
          r.progress, c.state = 'REVIEW' AS mastered, coalesce(c.collection_pinned, false) AS pinned
        FROM (
          SELECT id, word_id, created_at, state, collection_pinned FROM cards
          WHERE user_id = ${userId}
          ORDER BY created_at DESC, id
          LIMIT ${limit} OFFSET ${(page - 1) * limit}
        ) c JOIN words w ON w.id = c.word_id
        LEFT JOIN LATERAL (
          SELECT translation_uz, example_sentence FROM word_senses
          WHERE word_id = w.id ORDER BY order_index LIMIT 1
        ) s ON true
        CROSS JOIN LATERAL (
          SELECT coalesce(round(100.0 * count(*) FILTER (WHERE rating <> 'AGAIN') / nullif(count(*), 0)), 0)::integer AS progress
          FROM review_logs WHERE card_id = c.id
        ) r
        ORDER BY c.created_at DESC, c.id
      `),
      this.db
        .select({ total: count() })
        .from(cards)
        .where(eq(cards.userId, userId)),
    ]);
    return { data: result.rows, total: counts[0].total };
  }
  async create(c: Card) {
    const [r] = await this.db.insert(cards).values(cardValues(c)).returning();
    return cardFromRow(r);
  }
  async createMany(data: Card[]) {
    await this.db.insert(cards).values(data.map(cardValues));
  }
  async delete(id: string, userId: string) {
    await this.db.transaction(async (tx) => {
      const owned = and(eq(cards.id, id), eq(cards.userId, userId));
      const [card] = await tx
        .select({ id: cards.id })
        .from(cards)
        .where(owned)
        .for('update');
      if (!card) throw new NotFoundError('Card not found.');
      const [task] = await tx
        .select({ id: sessionsTasks.id })
        .from(sessionsTasks)
        .where(eq(sessionsTasks.cardId, id))
        .limit(1);
      const [review] = await tx
        .select({ id: reviewLogs.id })
        .from(reviewLogs)
        .where(eq(reviewLogs.cardId, id))
        .limit(1);
      if (task || review)
        throw new ConflictError(
          'This card has learning history. Pause it to remove it from the study queue.',
        );
      await tx.delete(cards).where(owned);
    });
  }

  async setPaused(id: string, userId: string, paused: boolean) {
    return this.db.transaction(async (tx) => {
      const owned = and(eq(cards.id, id), eq(cards.userId, userId));
      const [card] = await tx.select().from(cards).where(owned).for('update');
      if (!card) throw new NotFoundError('Card not found.');
      if (Boolean(card.pausedAt) === paused) return cardFromRow(card);
      if (paused) {
        const [pending] = await tx
          .select({ id: sessionsTasks.id })
          .from(sessionsTasks)
          .innerJoin(sessions, eq(sessions.id, sessionsTasks.sessionId))
          .where(
            and(
              eq(sessionsTasks.cardId, id),
              eq(sessionsTasks.completed, false),
              eq(sessions.status, 'in_progress'),
            ),
          )
          .limit(1);
        if (pending)
          throw new ConflictError(
            'Finish or cancel the active session before pausing this card.',
          );
      }
      const [updated] = await tx
        .update(cards)
        .set({ pausedAt: paused ? new Date() : null })
        .where(owned)
        .returning();
      return cardFromRow(updated);
    });
  }
}
