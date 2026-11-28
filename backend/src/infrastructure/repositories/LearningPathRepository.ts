import { Injectable } from '@nestjs/common';
import type { PoolClient } from 'pg';
import { DatabasePool } from '../db/drizzle/drizzle.provider';
import { CEFR_LEVELS, type CefrLevel } from '../../domain/entities/Word';
import { ConflictError } from '../../domain/errors/ConflictError';
import { NotFoundError } from '../../domain/errors/NotFoundError';
import type {
  ILearningPathRepository,
  StudyVocabularyFilters,
  StudyWord,
} from '../../domain/repositories/ILearningPathRepository';
import {
  resolveCourseProgress,
  type CourseLessonPosition,
} from '../../domain/services/CourseProgress';

const vocabularyRows = `
  SELECT w.id,w.text,w.cefr_level AS "cefrLevel",w.topic,w.audio_url AS "audioUrl",c.id AS "cardId",
    CASE WHEN c.id IS NULL OR c.state='NEW' THEN 'new'
      WHEN c.paused_at IS NULL AND c.due <= now() THEN 'due'
      WHEN c.state='REVIEW' THEN 'mastered'
      ELSE 'learning' END AS status,
    EXISTS (SELECT 1 FROM course_lesson_words cw JOIN user_course_lessons ul
      ON ul.lesson_id=cw.lesson_id AND ul.user_id=$1 WHERE cw.word_id=w.id) AS "fromLesson"
  FROM words w LEFT JOIN cards c ON c.word_id=w.id AND c.user_id=$1
  WHERE w.cefr_level <= $2::cefr_level
`;

@Injectable()
export class LearningPathRepository implements ILearningPathRepository {
  constructor(private readonly pool: DatabasePool) {}

  private async transaction<T>(
    run: (client: PoolClient) => Promise<T>,
    write = false,
  ): Promise<T> {
    const client = await this.pool.connect();
    try {
      await client.query(
        write ? 'BEGIN' : 'BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY',
      );
      const result = await run(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  private async load(client: PoolClient, userId: string, lock = false) {
    const {
      rows: [profile],
    } = await client.query<{ level: CefrLevel }>(
      'SELECT coalesce(study_level, level) AS level FROM learner_profiles WHERE user_id=$1' +
        (lock ? ' FOR UPDATE' : ''),
      [userId],
    );
    if (!profile) throw new NotFoundError('Learner profile not found.');
    const { rows: lessons } = await client.query<CourseLessonPosition>(
      'SELECT id, level FROM course_lessons ORDER BY position',
    );
    const { rows } = await client.query<{ lessonId: string }>(
      'SELECT lesson_id AS "lessonId" FROM user_course_lessons WHERE user_id=$1',
      [userId],
    );
    const completed = new Set(rows.map((row) => row.lessonId));
    return { level: profile.level, lessons, completed };
  }

  getProgress(userId: string) {
    return this.transaction(async (client) => {
      const { level, lessons, completed } = await this.load(client, userId);
      return resolveCourseProgress(level, lessons, completed);
    });
  }

  completeLessons(userId: string, lessonIds: readonly string[]) {
    return this.transaction(async (client) => {
      const { level, lessons, completed } = await this.load(
        client,
        userId,
        true,
      );
      const requested = new Set(lessonIds);
      if (lessonIds.some((id) => !lessons.some((lesson) => lesson.id === id)))
        throw new NotFoundError('Lesson not found.');
      const finished: string[] = [];
      for (const lesson of lessons) {
        if (!requested.has(lesson.id) || completed.has(lesson.id)) continue;
        const progress = resolveCourseProgress(level, lessons, completed);
        if (
          CEFR_LEVELS.indexOf(lesson.level) >= CEFR_LEVELS.indexOf(level) &&
          progress.nextLessonId !== lesson.id
        ) {
          throw new ConflictError('Finish the preceding lesson first.');
        }
        completed.add(lesson.id);
        finished.push(lesson.id);
      }
      if (finished.length) {
        await client.query(
          'INSERT INTO user_course_lessons(user_id,lesson_id) SELECT $1,id FROM unnest($2::text[]) AS t(id)',
          [userId, finished],
        );
        await client.query(
          `
          INSERT INTO cards(user_id,word_id,stability,difficulty,due,reps,state,lapses)
          SELECT DISTINCT $1::uuid,word_id,0,0,now(),0,'NEW'::card_state,0
          FROM course_lesson_words WHERE lesson_id=ANY($2::text[])
          ON CONFLICT (user_id,word_id) DO NOTHING
        `,
          [userId, finished],
        );
      }
      return resolveCourseProgress(level, lessons, completed);
    }, true);
  }

  private async addSenses(
    client: PoolClient,
    words: Omit<StudyWord, 'sense'>[],
    withParts = false,
  ): Promise<StudyWord[]> {
    if (!words.length) return [];
    const { rows } = await client.query<
      StudyWord['sense'][number] & { wordId: string }
    >(
      `
      SELECT s.word_id AS "wordId",s.translation_uz AS "translationUz",s.definition,
        s.example_sentence AS "exampleSentence",s.example_audio_url AS "exampleAudioUrl"
        ${
          withParts
            ? `,(SELECT ref->>'part' FROM english_dictionary_reference d,
           LATERAL jsonb_array_elements(d.senses) AS refs(ref)
           WHERE d.headword=w.text AND ref->>'definition'=s.definition LIMIT 1) AS part`
            : ''
        }
      FROM word_senses s JOIN words w ON w.id=s.word_id
      WHERE s.word_id=ANY($1::uuid[]) ORDER BY s.order_index
    `,
      [words.map((word) => word.id)],
    );
    return words.map((word) => ({
      ...word,
      sense: rows
        .filter((row) => row.wordId === word.id)
        .map(
          ({
            translationUz,
            definition,
            exampleSentence,
            exampleAudioUrl,
            part,
          }) => ({
            translationUz,
            definition,
            exampleSentence,
            exampleAudioUrl,
            part,
          }),
        ),
    }));
  }

  listVocabulary(userId: string, filters: StudyVocabularyFilters) {
    return this.transaction(async (client) => {
      const { level, lessons, completed } = await this.load(client, userId);
      const progress = resolveCourseProgress(level, lessons, completed);
      const search = filters.search?.trim().replace(/[\\%_]/g, '\\$&');
      const query =
        vocabularyRows +
        `
        AND ($3::cefr_level IS NULL OR w.cefr_level=$3)
        AND ($4::text IS NULL OR w.text ILIKE $4 OR EXISTS (
          SELECT 1 FROM word_senses s WHERE s.word_id=w.id AND s.translation_uz ILIKE $4))
        AND ($5::text IS NULL OR w.topic=$5)
      `;
      const values = [
        userId,
        progress.unlockedLevel,
        filters.suggested ? progress.activeLevel : (filters.cefrLevel ?? null),
        search ? '%' + search + '%' : null,
        filters.topic ?? null,
        filters.status ?? null,
        filters.fromLessons ?? false,
      ];
      const predicate =
        'WHERE ($6::text IS NULL OR status=$6) AND (NOT $7::boolean OR "fromLesson")';
      const {
        rows: [{ total }],
      } = await client.query<{ total: number }>(
        `SELECT count(*)::int AS total FROM (${query}) vocabulary ${predicate}`,
        values,
      );
      const { rows } = await client.query<Omit<StudyWord, 'sense'>>(
        `
        SELECT * FROM (${query}) vocabulary ${predicate}
        ORDER BY ("cefrLevel"=$8::cefr_level) DESC, "fromLesson" DESC, text, id LIMIT $9 OFFSET $10
      `,
        [
          ...values,
          progress.activeLevel,
          filters.limit,
          (filters.page - 1) * filters.limit,
        ],
      );
      return { data: await this.addSenses(client, rows), total, progress };
    });
  }

  getVocabularyWord(userId: string, wordId: string) {
    return this.transaction(async (client) => {
      const { level, lessons, completed } = await this.load(client, userId);
      const { unlockedLevel } = resolveCourseProgress(
        level,
        lessons,
        completed,
      );
      const { rows } = await client.query<Omit<StudyWord, 'sense'>>(
        vocabularyRows + ' AND w.id=$3',
        [userId, unlockedLevel, wordId],
      );
      const [word] = await this.addSenses(client, rows, true);
      if (!word) throw new NotFoundError('Word not found.');
      return word;
    });
  }
}
