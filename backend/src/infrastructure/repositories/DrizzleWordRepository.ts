import { Inject, Injectable } from '@nestjs/common';
import {
  and,
  asc,
  count,
  eq,
  ilike,
  gt,
  inArray,
  notInArray,
  sql,
  SQL,
} from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DRIZZLE } from '../db/drizzle/drizzle.provider';
import { relations } from '../db/drizzle/drizzle.relations';
import { words, wordSenses } from '../db/drizzle/drizzle.schema';
import {
  IWordRepository,
  WordFilters,
} from '../../domain/repositories/IWordRepository';
import { Word, CefrLevel } from '../../domain/entities/Word';
import { WordSense } from '../../domain/entities/WordSense';
import { NotFoundError } from '../../domain/errors/NotFoundError';
type Row = typeof words.$inferSelect & {
  wordSenses: (typeof wordSenses.$inferSelect)[];
};
@Injectable()
export class DrizzleWordRepository implements IWordRepository {
  constructor(
    @Inject(DRIZZLE) private readonly db: NodePgDatabase<typeof relations>,
  ) {}
  async findDaily(dayNumber: number) {
    return this.db.transaction(
      async (tx) => {
        const [{ total }] = await tx.select({ total: count() }).from(words);
        if (!total) return null;
        const row = await tx.query.words.findFirst({
          orderBy: { id: 'asc' },
          offset: dayNumber % total,
          with: { wordSenses: true },
        });
        return row ? this.toDomain(row) : null;
      },
      { isolationLevel: 'repeatable read', accessMode: 'read only' },
    );
  }
  async findById(id: string) {
    const r = await this.db.query.words.findFirst({
      where: { id },
      with: { wordSenses: true },
    });
    return r ? this.toDomain(r) : null;
  }
  async findByText(text: string, cefrLevel: CefrLevel) {
    const r = await this.db.query.words.findFirst({
      where: { text: text.trim().toLowerCase(), cefrLevel },
      with: { wordSenses: true },
    });
    return r ? this.toDomain(r) : null;
  }
  async findAll(f: WordFilters) {
    const page = Math.max(f.page ?? 1, 1),
      limit = Math.max(1, Math.min(f.limit ?? 20, 100));
    const conditions: SQL[] = [];
    if (f.search)
      conditions.push(
        ilike(words.text, '%' + f.search.replace(/[\\%_]/g, '\\$&') + '%'),
      );
    if (f.cefrLevel) conditions.push(eq(words.cefrLevel, f.cefrLevel));
    if (f.topic) conditions.push(eq(words.topic, f.topic));
    if (f.excludeIds?.length)
      conditions.push(notInArray(words.id, f.excludeIds));
    const where = and(...conditions);
    return this.db.transaction(
      async (tx) => {
        const rows = await tx
          .select()
          .from(words)
          .where(and(where, f.after ? gt(words.id, f.after) : undefined))
          .orderBy(asc(words.id))
          .limit(limit + 1)
          .offset(f.after ? 0 : (page - 1) * limit);
        const hasNext = rows.length > limit;
        if (hasNext) rows.pop();
        const [c] = await tx
          .select({ total: count() })
          .from(words)
          .where(where);
        const senses = rows.length
          ? await tx
              .select()
              .from(wordSenses)
              .where(
                inArray(
                  wordSenses.wordId,
                  rows.map((r) => r.id),
                ),
              )
          : [];
        return {
          data: rows.map((r) =>
            this.toDomain({
              ...r,
              wordSenses: senses.filter((s) => s.wordId === r.id),
            }),
          ),
          total: c.total,
          page,
          limit,
          totalPage: Math.ceil(c.total / limit),
          nextCursor: hasNext ? rows.at(-1)?.id : undefined,
        };
      },
      { isolationLevel: 'repeatable read', accessMode: 'read only' },
    );
  }
  async create(data: Word) {
    return this.db.transaction(async (tx) => {
      const [r] = await tx.insert(words).values(this.values(data)).returning();
      const senses = await tx
        .insert(wordSenses)
        .values(this.senses(data, r.id))
        .returning();
      return this.toDomain({ ...r, wordSenses: senses });
    });
  }
  async createMany(data: Word[]) {
    await this.db.transaction(async (tx) => {
      for (const w of data) {
        const [r] = await tx.insert(words).values(this.values(w)).returning();
        await tx.insert(wordSenses).values(this.senses(w, r.id));
      }
    });
  }
  async editSenses(id: string, edit: (word: Word) => Word) {
    return this.db.transaction(async (tx) => {
      const [word] = await tx
        .select()
        .from(words)
        .where(eq(words.id, id))
        .for('update');
      if (!word) throw new NotFoundError('Word not found.');
      const previous = this.toDomain({
        ...word,
        wordSenses: await tx
          .select()
          .from(wordSenses)
          .where(eq(wordSenses.wordId, id)),
      });
      const next = edit(previous);
      const removed = previous.sense.filter(
        (s) => !next.sense.some((n) => n.id === s.id),
      );
      if (removed.length) {
        await tx.delete(wordSenses).where(
          inArray(
            wordSenses.id,
            removed.map((s) => s.id!),
          ),
        );
      }
      for (const [index, sense] of next.sense.entries()) {
        if (previous.sense.includes(sense)) continue;
        const values = this.senses(next, id)[index];
        if (sense.id)
          await tx
            .update(wordSenses)
            .set(values)
            .where(eq(wordSenses.id, sense.id));
        else await tx.insert(wordSenses).values(values);
      }
      const [updated] = await tx
        .update(words)
        .set({ updatedAt: new Date() })
        .where(eq(words.id, id))
        .returning();
      return this.toDomain({
        ...updated,
        wordSenses: await tx
          .select()
          .from(wordSenses)
          .where(eq(wordSenses.wordId, id)),
      });
    });
  }
  async update(id: string, data: Word) {
    return this.db.transaction(async (tx) => {
      const [r] = await tx
        .update(words)
        .set(this.values(data))
        .where(eq(words.id, id))
        .returning();
      if (!r) throw new NotFoundError('Word not found.');
      await tx.delete(wordSenses).where(
        and(
          eq(wordSenses.wordId, id),
          notInArray(
            wordSenses.orderIndex,
            data.sense.map((s) => s.orderIndex),
          ),
        ),
      );
      const senses = await tx
        .insert(wordSenses)
        .values(this.senses(data, id))
        .onConflictDoUpdate({
          target: [wordSenses.wordId, wordSenses.orderIndex],
          set: {
            definition: sql`excluded.definition`,
            exampleSentence: sql`excluded.example_sentence`,
            exampleAudioUrl: sql`excluded.example_audio_url`,
            translationUz: sql`excluded.translation_uz`,
            updatedAt: new Date(),
          },
        })
        .returning();
      return this.toDomain({ ...r, wordSenses: senses });
    });
  }
  async delete(id: string) {
    const rows = await this.db
      .delete(words)
      .where(eq(words.id, id))
      .returning({ id: words.id });
    if (!rows.length) throw new NotFoundError('Word not found.');
  }
  private values(w: Word) {
    return {
      text: w.text,
      cefrLevel: w.cefrLevel,
      audioUrl: w.audioUrl ?? null,
      topic: w.topic ?? null,
    };
  }
  private senses(w: Word, id: string) {
    return w.sense.map((s) => ({
      wordId: id,
      definition: s.definition,
      exampleSentence: s.exampleSentence,
      exampleAudioUrl: s.exampleAudioUrl ?? null,
      translationUz: s.translationUz,
      orderIndex: s.orderIndex,
    }));
  }
  private toDomain(r: Row) {
    return new Word({
      id: r.id,
      text: r.text,
      cefrLevel: r.cefrLevel,
      audioUrl: r.audioUrl ?? undefined,
      topic: r.topic ?? undefined,
      sense: r.wordSenses
        .sort((a, b) => a.orderIndex - b.orderIndex)
        .map((s) => new WordSense(s)),
      createdAt: r.createdAt,
      updatedAt: r.updatedAt ?? undefined,
    });
  }
}
