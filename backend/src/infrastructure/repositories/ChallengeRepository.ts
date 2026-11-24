import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { PoolClient } from 'pg';
import { DatabasePool } from '../db/drizzle/drizzle.provider';
import {
  IChallengeRepository,
  VocabularyFilter,
  ChallengeTransaction,
} from '../../domain/repositories/IChallengeRepository';
import {
  ChallengeData,
  ChallengeKind,
  ChallengePayload,
  ChallengeResult,
  QuizWord,
} from '../../domain/entities/Challenge';
import type {
  NotebookCount,
  NotebookEntry,
  NotebookMistake,
} from '../../domain/entities/MistakesNotebook';
const columns =
  'id,user_id AS "userId",kind,payload,answers,attempts,created_at AS "createdAt",expires_at AS "expiresAt",completed_at AS "completedAt",result';
const notebookColumns = `id,kind,question,submitted_answer AS "submittedAnswer",
  expected_answer AS "expectedAnswer",reason,occurred_at AS "occurredAt",resolved_at AS "resolvedAt"`;
class PgChallengeTransaction implements ChallengeTransaction {
  constructor(private readonly c: PoolClient) {}
  async get(id: string, userId: string) {
    return (
      (
        await this.c.query<ChallengeData>(
          'SELECT ' +
            columns +
            ' FROM challenges WHERE id=$1 AND user_id=$2 FOR UPDATE',
          [id, userId],
        )
      ).rows[0] ?? null
    );
  }
  async finish(d: ChallengeData, r: ChallengeResult) {
    await this.c.query(
      'UPDATE challenges SET completed_at=$2,result=$3,attempts=$4 WHERE id=$1',
      [
        d.id,
        d.completedAt,
        JSON.stringify(r),
        JSON.stringify(d.attempts ?? []),
      ],
    );
    if (d.kind === 'assessment') {
      await this.c.query(
        'INSERT INTO assessment_result(user_id,resulting_level,correct_count,total_question,taken_at) VALUES($1,$2,$3,$4,$5)',
        [
          d.userId,
          r.resultingLevel,
          r.correctCount,
          r.totalQuestion,
          d.completedAt,
        ],
      );
      await this.c.query(
        'UPDATE learner_profiles SET level=$2,updated_at=now() WHERE user_id=$1',
        [d.userId, r.resultingLevel],
      );
    } else {
      await this.c.query(
        'INSERT INTO game_scores(user_id,game_type,score,"playedAt") VALUES($1,$2,$3,$4)',
        [d.userId, d.kind, r.score, d.completedAt],
      );
      await this.recordMistakes(d, r);
    }
  }

  async saveAttempts(data: ChallengeData) {
    await this.c.query('UPDATE challenges SET attempts=$2 WHERE id=$1', [
      data.id,
      JSON.stringify(data.attempts),
    ]);
  }

  async audioEnabled(userId: string) {
    const { rows } = await this.c.query<{ enabled: boolean }>(
      'SELECT feedback_audio_enabled AS enabled FROM learner_profiles WHERE user_id=$1',
      [userId],
    );
    return rows[0]?.enabled ?? false;
  }

  async recordNotebookMistakes(
    data: ChallengeData,
    mistakes: readonly NotebookMistake[],
  ) {
    if (!mistakes.length) return;
    await this.c.query(
      `INSERT INTO mistake_notebook_entries(user_id,challenge_id,question_index,kind,question,expected_answer,submitted_answer,reason)
       SELECT c.user_id,c.id,f.index,c.kind,c.payload->'questions'->f.index,c.answers->>f.index,f.answer,f.reason
       FROM challenges c CROSS JOIN jsonb_to_recordset($3::jsonb) AS f(index integer,answer text,reason text)
       WHERE c.user_id=$1 AND c.id=$2 AND c.payload->'questions'->f.index->>'prompt' IS NOT NULL
       ON CONFLICT (challenge_id,question_index) DO NOTHING`,
      [data.userId, data.id, JSON.stringify(mistakes)],
    );
  }

  private async recordMistakes(d: ChallengeData, r: ChallengeResult) {
    if (!d.payload.wordIds?.length || !r.feedback) return;
    const missed = d.payload.wordIds.filter(
      (_, index) => !r.feedback?.[index]?.correct,
    );
    const recovered = d.payload.wordIds.filter((id) => !missed.includes(id));
    // Serialize concurrent rounds for the same learner before modifying their queue.
    await this.c.query(
      'SELECT user_id FROM learner_profiles WHERE user_id=$1 FOR UPDATE',
      [d.userId],
    );
    if (missed.length) {
      await this.c.query(
        `INSERT INTO game_mistakes(user_id,word_id,misses,last_missed_at)
         SELECT $1,id,1,clock_timestamp() FROM words WHERE id=ANY($2::uuid[]) ORDER BY id FOR KEY SHARE
         ON CONFLICT (user_id,word_id) DO UPDATE
         SET misses=game_mistakes.misses+1,last_missed_at=GREATEST(game_mistakes.last_missed_at,excluded.last_missed_at)`,
        [d.userId, missed],
      );
    }
    if (d.kind === 'mistake_words' && recovered.length) {
      await this.c.query(
        'DELETE FROM game_mistakes WHERE user_id=$1 AND word_id=ANY($2::uuid[]) AND last_missed_at<=$3',
        [d.userId, recovered, d.createdAt],
      );
    }
  }
}
@Injectable()
export class ChallengeRepository implements IChallengeRepository {
  constructor(private readonly pool: DatabasePool) {}
  async vocabulary(
    kind: ChallengeKind,
    userId: string,
    filter: VocabularyFilter = {},
  ) {
    if (kind === 'sequence_memory' || kind === 'visual_grid') return [];
    const fields =
      'w.id,w.text,w.cefr_level AS level,w.audio_url AS "audioUrl",s.translation_uz AS translation,s.definition,s.example_sentence AS "exampleSentence",s.example_audio_url AS "exampleAudioUrl"';
    const sense =
      'JOIN LATERAL (SELECT translation_uz,definition,example_sentence,example_audio_url FROM word_senses WHERE word_id=w.id ORDER BY order_index LIMIT 1) s ON true';
    if (kind === 'mistake_words') {
      return (
        await this.pool.query<QuizWord>(
          `SELECT ${fields} FROM game_mistakes m JOIN words w ON w.id=m.word_id ${sense}
         WHERE m.user_id=$1 AND ($2::cefr_level IS NULL OR w.cefr_level=$2)
           AND ($3::text IS NULL OR w.topic=$3)
         ORDER BY m.last_missed_at DESC,w.id LIMIT 30`,
          [userId, filter.cefrLevel ?? null, filter.topic ?? null],
        )
      ).rows;
    }
    const eligible = `candidate.cefr_level=levels.level
      AND ($2::cefr_level IS NULL OR candidate.cefr_level=$2)
      AND ($3::text IS NULL OR candidate.topic=$3)
      AND ($1 <> 'word_dictation' OR candidate.audio_url LIKE 'https://%')
      AND ($1 <> 'sentence_dictation' OR EXISTS (
        SELECT 1 FROM word_senses s0 WHERE s0.word_id=candidate.id
          AND s0.example_audio_url LIKE 'https://%'
      ))`;
    return (
      await this.pool.query<QuizWord>(
        `SELECT ${fields}
         FROM unnest(enum_range(NULL::cefr_level)) AS levels(level)
         CROSS JOIN LATERAL (
           (SELECT * FROM words candidate WHERE ${eligible} AND candidate.id >= $4::uuid
            ORDER BY candidate.id LIMIT 100)
           UNION ALL
           (SELECT * FROM words candidate WHERE ${eligible} AND candidate.id < $4::uuid
            ORDER BY candidate.id LIMIT 100)
           LIMIT 100
         ) w
         JOIN LATERAL (
           SELECT translation_uz,definition,example_sentence,example_audio_url
           FROM word_senses WHERE word_id=w.id
             AND ($1 <> 'sentence_dictation' OR example_audio_url LIKE 'https://%')
           ORDER BY order_index LIMIT 1
         ) s ON true`,
        [kind, filter.cefrLevel ?? null, filter.topic ?? null, randomUUID()],
      )
    ).rows;
  }
  async create(
    userId: string,
    kind: ChallengeKind,
    payload: ChallengePayload,
    answers: string[],
    expiresAt: Date,
  ) {
    return (
      await this.pool.query<ChallengeData>(
        'INSERT INTO challenges(user_id,kind,payload,answers,expires_at) VALUES($1,$2,$3,$4,$5) RETURNING ' +
          columns,
        [
          userId,
          kind,
          JSON.stringify(payload),
          JSON.stringify(answers),
          expiresAt,
        ],
      )
    ).rows[0];
  }
  async transaction<T>(work: (tx: ChallengeTransaction) => Promise<T>) {
    const c = await this.pool.connect();
    try {
      await c.query('BEGIN');
      const r = await work(new PgChallengeTransaction(c));
      await c.query('COMMIT');
      return r;
    } catch (e) {
      await c.query('ROLLBACK');
      throw e;
    } finally {
      c.release();
    }
  }
  async history(
    userId: string,
    assessment: boolean,
    page: number,
    limit: number,
  ) {
    const data = (
      await this.pool.query(
        `SELECT id,kind,result,completed_at AS "completedAt" FROM challenges WHERE user_id=$1 AND (kind='assessment')=$2 AND completed_at IS NOT NULL ORDER BY completed_at DESC,id LIMIT $3 OFFSET $4`,
        [userId, assessment, limit, (page - 1) * limit],
      )
    ).rows;
    const c = await this.pool.query<{ total: number }>(
      `SELECT count(*)::integer AS total FROM challenges WHERE user_id=$1 AND (kind='assessment')=$2 AND completed_at IS NOT NULL`,
      [userId, assessment],
    );
    return { data, total: c.rows[0].total };
  }
  async notebook(
    userId: string,
    page: number,
    limit: number,
    kinds: readonly ChallengeKind[] | null,
    onlyOpen: boolean,
  ) {
    const [entries, counts] = await Promise.all([
      this.pool.query<NotebookEntry>(
        `SELECT ${notebookColumns} FROM mistake_notebook_entries
         WHERE user_id=$1 AND ($2::text[] IS NULL OR kind=ANY($2))
           AND (NOT $3::boolean OR resolved_at IS NULL)
         ORDER BY occurred_at DESC,id LIMIT $4 OFFSET $5`,
        [userId, kinds, onlyOpen, limit, (page - 1) * limit],
      ),
      this.pool.query<NotebookCount>(
        `SELECT kind,count(*)::integer AS total,
           count(*) FILTER(WHERE resolved_at IS NOT NULL)::integer AS resolved
         FROM mistake_notebook_entries WHERE user_id=$1 GROUP BY kind`,
        [userId],
      ),
    ]);
    return { entries: entries.rows, counts: counts.rows };
  }
  async notebookEntry(userId: string, id: string) {
    const { rows } = await this.pool.query<NotebookEntry>(
      `SELECT ${notebookColumns} FROM mistake_notebook_entries WHERE user_id=$1 AND id=$2`,
      [userId, id],
    );
    return rows[0] ?? null;
  }
  async setNotebookResolved(userId: string, id: string, resolved: boolean) {
    const { rows } = await this.pool.query<{ resolvedAt: Date | null }>(
      `UPDATE mistake_notebook_entries
       SET resolved_at=CASE WHEN $3 THEN coalesce(resolved_at, now()) ELSE NULL END
       WHERE user_id=$1 AND id=$2 RETURNING resolved_at AS "resolvedAt"`,
      [userId, id, resolved],
    );
    return rows[0] ?? null;
  }
}
