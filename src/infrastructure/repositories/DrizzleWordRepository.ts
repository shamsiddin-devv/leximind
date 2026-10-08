import { Inject, Injectable } from '@nestjs/common';
import { DRIZZLE } from '../db/drizzle/drizzle.provider';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { relations } from '../db/drizzle/drizzle.relations';
import { IWordRepository, WordFilters, WordListResult } from 'src/domain/repositories/IWordRepository';
import { WordSense } from 'src/domain/entities/WordSense';
import { CefrLevel, Word } from 'src/domain/entities/Word';
import { words, wordSenses } from '../db/drizzle/drizzle.schema';
import {eq} from 'drizzle-orm';

@Injectable()
export class DrizzleWordRepository implements IWordRepository {
  constructor(
    @Inject(DRIZZLE) private readonly db: NodePgDatabase<typeof relations>,
  ) {}

  async findById(id: string): Promise<Word | null> {
    const row = await this.db.query.words.findFirst({
      where: { id },
      with: { wordSenses: true },
    });
    return this.toDomain(row);
  };

  async findByText(text: string, cefrLevel: CefrLevel): Promise<Word | null> {
    const row = await this.db.query.words.findFirst({
      where: {
        text, 
        cefrLevel
      }
    });
    return this.toDomain(row);
  };

  async findAll(filter: WordFilters): Promise<WordListResult> {
    const page = Math.max(filter.page ?? 1, 1);
    const pageSize = Math.min(filter.limit ?? 20, 100);

    const offset = (page - 1) * pageSize;

    const rows = await this.db.query.words.findMany({
      where: {
        ...(filter.search ? {
          text: {
            ilike: `%${filter.search}%`
          }
        } : {}),

        ...(filter.cefrLevel ? {
          cefrLevel: filter.cefrLevel
        } : {}),

        ...(filter.excludeIds?.length ? {
          id: {
            notIn: filter.excludeIds
          }
        } : {}),
      },
      with: {
        wordSenses: true
      },

      orderBy: ((words, {asc}) => asc(words.id)),

      limit: pageSize,
      offset
    });

    return {
      data: rows.map((row) => this.toDomain(row)),
      total: rows.length,
      page,
      limit: pageSize,
      totalPage: (page / pageSize)
    };
  };

  async create(data: Word): Promise<Word> {
    const result = await this.db.transaction(async (tx) => {
      const insertResult = await tx
        .insert(words)
        .values(this.toPersistence(data));

      const word = insertResult.rows[0];

      for (const s of data.sense) {
        await tx.insert(wordSenses).values({
          wordId: word,
          definition: s.definition,
          exampleSentence: s.exampleSentence,
          orderIndex: s.orderIndex,
          translationUz: s.translationUz,
        });
      }
      return insertResult;
    });
    return this.toDomain(result);
  }

  async update(id: string, data: Word): Promise<Word> {
    const row = await this.db.update(words).set(data).where(eq(words.id, id));
    return this.toDomain(row);
  };

  private toDomain(row): Word {
    const sense = row.sense.map(
      (s) =>
        new WordSense({
          id: s.id,
          wordId: s.wordId,
          definition: s.definition,
          exampleSentence: s.exampleSentence,
          orderIndex: s.orderIndex,
          translationUz: s.translationUz,
        }),
    );

    return new Word({
      id: row.id,
      text: row.text,
      cefrLevel: row.cefrLevel,
      audioUrl: row.auidoUrl ?? undefined,
      sense,
      createdAt: row.createdAt,
    });
  }

  private toPersistence(word: Word): any {
    return {
      id: word.id,
      text: word.text,
      cefrLevel: word.cefrLevel,
      audioUrl: word.audioUrl,
      sense: word.sense,
      createdAt: word.createdAt,
    };
  }
}
