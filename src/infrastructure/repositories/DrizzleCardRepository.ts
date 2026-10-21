import { Inject } from '@nestjs/common';
import {
  CardFilters,
  CardResult,
  ICardRepository,
} from 'src/domain/repositories/ICardRepository';
import { DRIZZLE } from '../db/drizzle/drizzle.provider';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { relations } from '../db/drizzle/drizzle.relations';
import { Card } from 'src/domain/entities/Card';
import { and, asc, count, eq, type SQL } from 'drizzle-orm';
import { cards } from '../db/drizzle/drizzle.schema';

export class DrizzleCardRepository implements ICardRepository {
  constructor(
    @Inject(DRIZZLE) private readonly db: NodePgDatabase<typeof relations>,
  ) {}

  async findById(id: string): Promise<Card | null> {
    const row = await this.db.query.cards.findFirst({
      where: { id },
      with: {user: true, word: true}
    });
    return this.toDomain(row);
  }

  async findByUserId(userId: string): Promise<Card | null> {
    const row = await this.db.query.cards.findFirst({
      where: {
        userId
      },
    });
    return this.toDomain(row);
  };

  async findUnique(userId: string, wordId: string): Promise<Card | null> {
    const row = await this.db.query.cards.findFirst({where: {userId, wordId}});
    return this.toDomain(row);
  };

  async findAll(filter: CardFilters): Promise<CardResult | null> {
    const page = Math.max(filter.page ?? 1, 1);
    const pageSize = Math.min(filter.pageSize ?? 20, 100);

    const offset = (page - 1) * pageSize;

    const conditions: SQL[] = [];

    if (filter.userId) {
      conditions.push(eq(cards.userId, filter.userId));
    }

    if (filter.wordId) {
      conditions.push(eq(cards.wordId, filter.wordId));
    }

    if (filter.state) {
      conditions.push(eq(cards.state, filter.state));
    }

    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const rows = await this.db
      .select()
      .from(cards)
      .where(where)
      .orderBy(asc(cards.id))
      .limit(pageSize)
      .offset(offset);

    const [countResult] = await this.db
      .select({ total: count() })
      .from(cards)
      .where(where);

    const total = countResult.total;

    return {
      data: rows.map((row) => this.toDomain(row)),
      page,
      pageSize: pageSize,
      total,
      totalPage: Math.ceil(total / pageSize)
    };
  };

  async create(data: Card): Promise<Card> {
    const row = await this.db.insert(cards).values(this.toPersistence(data)).returning();
    return this.toDomain(row);
  };

  async createMany(data: Card[]): Promise<void> {
    for(const item of data) {
      const row = await this.db.insert(cards).values(this.toPersistence(item));
    };
  };

  async update(id: string, data: Card): Promise<Card | null> {
    const row = await this.db.update(cards).set(this.toPersistence(data)).where(eq(cards.id, id)).returning();
    return this.toDomain(row);
  };

  private toDomain(row): Card {
    return new Card({
      id: row.id,
      userId: row.userId,
      wordId: row.userId,
      stability: row.stability,
      difficulty: row.difficulty,
      due: row.due,
      reps: row.reps,
      lapses: row.lapses,
      state: row.state,
      lastReviewedAt: row.lastReviewedAt,
      createdAt: row.createdAt,
    });
  }

  private toPersistence(row: Card): any {
    return {
      id: row.id,
      userId: row.userId,
      wordId: row.wordId,
      stability: row.stability,
      difficulty: row.difficulty,
      due: row.due,
      reps: row.reps,
      lapses: row.lapses,
      state: row.state,
      lastReviewedAt: row.lastReviewedAt,
      createdAt: row.createdAt,
    };
  }
}
