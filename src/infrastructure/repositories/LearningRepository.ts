import { Injectable } from '@nestjs/common';
import { PoolClient } from 'pg';
import { DatabasePool } from '../db/drizzle/drizzle.provider';
import {
  ILearningRepository,
  LearningTransaction,
  Profile,
  SessionTask,
  ReviewEntry,
  AssessmentResult,
  GameScore,
  StudySnapshot,
} from '../../domain/repositories/ILearningRepository';
import { SessionData } from '../../domain/entities/LearningSession';
import { Card } from '../../domain/entities/Card';
import { IReviewRating } from '../../domain/services/IReviewRatingService';
import { NotFoundError } from '../../domain/errors/NotFoundError';
const sessionColumns =
  'id,user_id AS "userId",status,started_at AS "startedAt",ended_at AS "endedAt"';
const profileColumns =
  'user_id AS "userId",level,timezone,streak_day AS "streakDay",daily_new_words AS "dailyNewWords",feedback_audio_enabled AS "feedbackAudioEnabled",xp_multiplier AS "xpMultiplier",last_session_at AS "lastSessionAt"';
const cardColumns =
  'id,user_id AS "userId",word_id AS "wordId",stability,difficulty,due,reps,lapses,state,last_review_at AS "lastReviewedAt",paused_at AS "pausedAt",created_at AS "createdAt"';
const reviewColumns =
  'r.id,r.card_id AS "cardId",r.rating,r.response_ms AS "responseMs",r.reviewed_at AS "reviewedAt"';
const assessmentColumns =
  'id,resulting_level AS "resultingLevel",correct_count AS "correctCount",total_question AS "totalQuestion",taken_at AS "takenAt"';
const scoreColumns = 'id,game_type AS "gameType",score,"playedAt"';
const firstReviewsToday = `
  SELECT count(*)::integer
  FROM cards c
  JOIN learner_profiles p ON p.user_id=c.user_id
  JOIN LATERAL (
    SELECT reviewed_at FROM review_logs WHERE card_id=c.id ORDER BY reviewed_at LIMIT 1
  ) first_review ON true
  WHERE c.user_id=$1
    AND (first_review.reviewed_at AT TIME ZONE 'UTC' AT TIME ZONE p.timezone)::date
        = (now() AT TIME ZONE p.timezone)::date
`;
class PgLearningTransaction implements LearningTransaction {
  constructor(private readonly c: PoolClient) {}
  async profile(userId: string) {
    const r = await this.c.query<Profile>(
      'SELECT ' +
        profileColumns +
        ' FROM learner_profiles WHERE user_id=$1 FOR UPDATE',
      [userId],
    );
    if (!r.rows[0]) throw new NotFoundError('Profile not found.');
    return r.rows[0];
  }
  async updateProfile(p: Profile) {
    await this.c.query(
      'UPDATE learner_profiles SET timezone=$2,daily_new_words=$3,streak_day=$4,last_session_at=$5,feedback_audio_enabled=$6,updated_at=now() WHERE user_id=$1',
      [
        p.userId,
        p.timezone,
        p.dailyNewWords,
        p.streakDay,
        p.lastSessionAt,
        p.feedbackAudioEnabled,
      ],
    );
    return p;
  }
  async activeSession(userId: string) {
    return (
      (
        await this.c.query<SessionData>(
          'SELECT ' +
            sessionColumns +
            " FROM sessions WHERE user_id=$1 AND status='in_progress'",
          [userId],
        )
      ).rows[0] ?? null
    );
  }
  async session(id: string, userId: string) {
    return (
      (
        await this.c.query<SessionData>(
          'SELECT ' +
            sessionColumns +
            ' FROM sessions WHERE id=$1 AND user_id=$2 FOR UPDATE',
          [id, userId],
        )
      ).rows[0] ?? null
    );
  }
  async tasks(id: string) {
    return (
      await this.c.query<SessionTask>(
        `SELECT t.id,t.session_id AS "sessionId",t.card_id AS "cardId",
                t.order_index AS "orderIndex",t.completed,t.correct,w.id AS "wordId",
                w.text,s.definition,s.translation_uz AS "translationUz"
         FROM session_tasks t
         JOIN sessions owner ON owner.id=t.session_id
         JOIN cards c ON c.id=t.card_id AND c.user_id=owner.user_id
         JOIN words w ON w.id=c.word_id
         JOIN LATERAL (
           SELECT definition,translation_uz FROM word_senses
           WHERE word_id=w.id ORDER BY order_index LIMIT 1
         ) s ON true
         WHERE t.session_id=$1 ORDER BY t.order_index`,
        [id],
      )
    ).rows;
  }
  async dueCards(userId: string, limit: number, newLimit: number) {
    const r = await this.c.query<ConstructorParameters<typeof Card>[0]>(
      `SELECT ${cardColumns} FROM cards
       WHERE user_id=$1 AND paused_at IS NULL AND due<=now()
         AND (state<>'NEW' OR id IN (
           SELECT id FROM cards
           WHERE user_id=$1 AND paused_at IS NULL AND state='NEW' AND due<=now()
           ORDER BY due,id LIMIT GREATEST(0,$3::integer-(${firstReviewsToday}))
         ))
       ORDER BY (state='NEW'),due,id LIMIT $2 FOR UPDATE`,
      [userId, limit, newLimit],
    );
    return r.rows.map(
      (row) =>
        new Card({ ...row, lastReviewedAt: row.lastReviewedAt ?? undefined }),
    );
  }
  async createSession(userId: string, cardIds: string[]) {
    const s = (
      await this.c.query<SessionData>(
        "INSERT INTO sessions(user_id,status,ended_at) VALUES($1,'in_progress',NULL) RETURNING " +
          sessionColumns,
        [userId],
      )
    ).rows[0];
    await this.c.query(
      "INSERT INTO session_tasks(session_id,card_id,format,order_index,completed) SELECT $1,id,'flashcard',n-1,false FROM unnest($2::uuid[]) WITH ORDINALITY AS t(id,n)",
      [s.id, cardIds],
    );
    return s;
  }
  async card(id: string, userId: string) {
    const r = (
      await this.c.query<ConstructorParameters<typeof Card>[0]>(
        'SELECT ' +
          cardColumns +
          ' FROM cards WHERE id=$1 AND user_id=$2 FOR UPDATE',
        [id, userId],
      )
    ).rows[0];
    return r
      ? new Card({ ...r, lastReviewedAt: r.lastReviewedAt ?? undefined })
      : null;
  }
  async saveReview(
    c: Card,
    rating: IReviewRating,
    responseMs: number,
    now: Date,
  ) {
    await this.c.query(
      'UPDATE cards SET stability=$2,difficulty=$3,due=$4,reps=$5,lapses=$6,state=$7,last_review_at=$8,updated_at=now() WHERE id=$1',
      [c.id, c.stability, c.difficulty, c.due, c.reps, c.lapses, c.state, now],
    );
    await this.c.query(
      'INSERT INTO review_logs(card_id,rating,response_ms,reviewed_at) VALUES($1,$2,$3,$4)',
      [c.id, rating, responseMs, now],
    );
  }
  async completeTask(id: string, correct: boolean) {
    await this.c.query(
      'UPDATE session_tasks SET completed=true,correct=$2,updated_at=now() WHERE id=$1',
      [id, correct],
    );
  }
  async completeSession(s: SessionData) {
    await this.c.query(
      'UPDATE sessions SET status=$2,ended_at=$3,updated_at=now() WHERE id=$1',
      [s.id, s.status, s.endedAt],
    );
  }
}
@Injectable()
export class LearningRepository implements ILearningRepository {
  constructor(private readonly pool: DatabasePool) {}
  async transaction<T>(work: (tx: LearningTransaction) => Promise<T>) {
    const c = await this.pool.connect();
    try {
      await c.query('BEGIN');
      const result = await work(new PgLearningTransaction(c));
      await c.query('COMMIT');
      return result;
    } catch (e) {
      await c.query('ROLLBACK');
      throw e;
    } finally {
      c.release();
    }
  }
  async history(userId: string, page: number, limit: number) {
    const data = (
      await this.pool.query<SessionData>(
        'SELECT ' +
          sessionColumns +
          ' FROM sessions WHERE user_id=$1 ORDER BY started_at DESC,id LIMIT $2 OFFSET $3',
        [userId, limit, (page - 1) * limit],
      )
    ).rows;
    const { rows } = await this.pool.query<{ total: number }>(
      'SELECT count(*)::integer AS total FROM sessions WHERE user_id=$1',
      [userId],
    );
    return { data, total: rows[0].total };
  }
  async reviews(userId: string, page: number, limit: number) {
    const data = (
      await this.pool.query<ReviewEntry>(
        'SELECT ' +
          reviewColumns +
          ' FROM review_logs r JOIN cards c ON c.id=r.card_id WHERE c.user_id=$1 ORDER BY r.reviewed_at DESC,r.id LIMIT $2 OFFSET $3',
        [userId, limit, (page - 1) * limit],
      )
    ).rows;
    const { rows } = await this.pool.query<{ total: number }>(
      'SELECT count(*)::integer AS total FROM review_logs r JOIN cards c ON c.id=r.card_id WHERE c.user_id=$1',
      [userId],
    );
    return { data, total: rows[0].total };
  }
  async reviewById(userId: string, id: string) {
    const { rows } = await this.pool.query<ReviewEntry>(
      'SELECT ' +
        reviewColumns +
        ' FROM review_logs r JOIN cards c ON c.id=r.card_id WHERE c.user_id=$1 AND r.id=$2',
      [userId, id],
    );
    return rows[0] ?? null;
  }

  async assessmentResults(userId: string, page: number, limit: number) {
    const { rows } = await this.pool.query<AssessmentResult>(
      'SELECT ' +
        assessmentColumns +
        ' FROM assessment_result WHERE user_id=$1 ORDER BY taken_at DESC,id LIMIT $2 OFFSET $3',
      [userId, limit, (page - 1) * limit],
    );
    const totals = await this.pool.query<{ total: number }>(
      'SELECT count(*)::integer AS total FROM assessment_result WHERE user_id=$1',
      [userId],
    );
    return { data: rows, total: totals.rows[0].total };
  }

  async assessmentResult(userId: string, id: string) {
    const { rows } = await this.pool.query<AssessmentResult>(
      'SELECT ' +
        assessmentColumns +
        ' FROM assessment_result WHERE user_id=$1 AND id=$2',
      [userId, id],
    );
    return rows[0] ?? null;
  }

  async gameScores(userId: string, page: number, limit: number) {
    const { rows } = await this.pool.query<GameScore>(
      'SELECT ' +
        scoreColumns +
        ' FROM game_scores WHERE user_id=$1 ORDER BY "playedAt" DESC,id LIMIT $2 OFFSET $3',
      [userId, limit, (page - 1) * limit],
    );
    const totals = await this.pool.query<{ total: number }>(
      'SELECT count(*)::integer AS total FROM game_scores WHERE user_id=$1',
      [userId],
    );
    return { data: rows, total: totals.rows[0].total };
  }

  async gameScore(userId: string, id: string) {
    const { rows } = await this.pool.query<GameScore>(
      'SELECT ' + scoreColumns + ' FROM game_scores WHERE user_id=$1 AND id=$2',
      [userId, id],
    );
    return rows[0] ?? null;
  }

  async studySnapshot(userId: string) {
    const { rows } = await this.pool.query<StudySnapshot>(
      `WITH context AS (
         SELECT timezone, daily_new_words, (now() AT TIME ZONE timezone)::date AS today,
                now() AT TIME ZONE 'UTC' AS utc_now
         FROM learner_profiles WHERE user_id=$1
       ), active_cards AS (
         SELECT due,state FROM cards WHERE user_id=$1 AND paused_at IS NULL
       ), scheduled AS (
         SELECT (c.due AT TIME ZONE 'UTC' AT TIME ZONE ctx.timezone)::date AS day, count(*)::integer AS count
         FROM active_cards c CROSS JOIN context ctx
         WHERE c.due > ctx.utc_now
           AND c.due < ((ctx.today + 7)::timestamp AT TIME ZONE ctx.timezone AT TIME ZONE 'UTC')
         GROUP BY 1
       ), difficult AS (
         SELECT w.id AS "wordId", w.text, count(*)::integer AS "againCount"
         FROM cards c JOIN review_logs r ON r.card_id=c.id JOIN words w ON w.id=c.word_id
         CROSS JOIN context ctx
         WHERE c.user_id=$1 AND c.paused_at IS NULL AND r.rating='AGAIN'
           AND r.reviewed_at >= ctx.utc_now - interval '30 days'
           AND r.reviewed_at <= ctx.utc_now
         GROUP BY w.id, w.text ORDER BY "againCount" DESC, w.id LIMIT 5
       )
       SELECT ctx.timezone,
              (SELECT id FROM sessions WHERE user_id=$1 AND status='in_progress') AS "activeSessionId",
              (SELECT count(*)::integer FROM active_cards) AS "activeCards",
              (SELECT count(*)::integer FROM active_cards WHERE due<=ctx.utc_now) AS "dueNow",
              (SELECT count(*)::integer FROM active_cards WHERE due<=ctx.utc_now AND state='NEW') AS "dueNew",
              ctx.daily_new_words AS "dailyNewLimit",
              (${firstReviewsToday}) AS "dailyNewReviewed",
              (SELECT jsonb_agg(jsonb_build_object('date',(ctx.today+i)::text,'count',coalesce(s.count,0)) ORDER BY i)
               FROM generate_series(0,6) AS days(i)
               LEFT JOIN scheduled s ON s.day=ctx.today+i) AS forecast,
              coalesce((SELECT jsonb_agg(to_jsonb(d) ORDER BY d."againCount" DESC,d."wordId") FROM difficult d),'[]'::jsonb) AS "difficultWords"
       FROM context ctx`,
      [userId],
    );
    return rows[0] ?? null;
  }

  async statistics(userId: string) {
    return (
      await this.pool.query<{
        cards: number;
        due: number;
        reviews: number;
        sessions: number;
      }>(
        "SELECT (SELECT count(*)::integer FROM cards WHERE user_id=$1) AS cards,(SELECT count(*)::integer FROM cards WHERE user_id=$1 AND paused_at IS NULL AND due<=now()) AS due,(SELECT count(*)::integer FROM review_logs r JOIN cards c ON c.id=r.card_id WHERE c.user_id=$1) AS reviews,(SELECT count(*)::integer FROM sessions WHERE user_id=$1 AND status='completed') AS sessions",
        [userId],
      )
    ).rows[0];
  }
}
