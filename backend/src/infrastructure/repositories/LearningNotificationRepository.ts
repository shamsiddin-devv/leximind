import { Injectable } from '@nestjs/common';
import {
  achievementRules,
  type AchievementProgress,
} from '../../domain/entities/Achievement';
import type {
  NotificationData,
  NotificationType,
} from '../../domain/repositories/INotificationRepository';
import { defaultNotifications } from '../../domain/value-objects/UserUiPreferences';
import { DatabasePool } from '../db/drizzle/drizzle.provider';
import {
  completedWeekNotificationQuery,
  learningAchievementsQuery,
  xpProgressNotificationQuery,
} from './learningAnalyticsQuery';
import { learningNotificationFacts } from './learningNotificationFacts';

interface Check {
  userId: string;
  reservedUntil: string;
}

interface Facts {
  day: string;
  previousWeek: string;
  reviewEnabled: boolean;
  dailyDue: boolean;
  streakAtRisk: number;
  achievements: boolean;
  weekly: boolean;
  progressEnabled: boolean;
  levelProgress: { id: string; level: string } | null;
}

interface Candidate {
  type: NotificationType;
  key: string;
  data: NotificationData;
}

const xpMilestones = [100, 500, 1000, 2500, 5000, 10_000, 25_000, 50_000];

@Injectable()
export class LearningNotificationRepository {
  constructor(private readonly pool: DatabasePool) {}

  async claim() {
    const {
      rows: [job],
    } = await this.pool.query<Check>(`
      WITH due AS (
        SELECT user_id FROM notification_schedules WHERE next_check_at<=now()
        ORDER BY next_check_at,user_id LIMIT 1 FOR UPDATE SKIP LOCKED
      )
      UPDATE notification_schedules s SET next_check_at=now()+interval '2 minutes'
      FROM due WHERE s.user_id=due.user_id
      RETURNING s.user_id AS "userId", s.next_check_at::text AS "reservedUntil"
    `);
    return job;
  }

  async check(job: Check) {
    const { userId } = job;
    const {
      rows: [facts],
    } = await this.pool.query<Facts>(learningNotificationFacts, [
      userId,
      defaultNotifications.review,
    ]);
    if (!facts) return;
    const dueReviews = facts.reviewEnabled
      ? this.pool.query<{ count: number }>(
          `SELECT count(*)::integer FROM cards WHERE user_id=$1 AND paused_at IS NULL
       AND state<>'NEW' AND due<=now() AT TIME ZONE 'UTC'`,
          [userId],
        )
      : undefined;
    const achievements = facts.achievements
      ? this.pool.query<AchievementProgress>(learningAchievementsQuery, [
          userId,
          JSON.stringify(achievementRules),
        ])
      : undefined;
    const weekly = facts.weekly
      ? this.pool.query<{ count: number; minutes: number; words: number }>(
          completedWeekNotificationQuery,
          [userId],
        )
      : undefined;
    const xp = facts.progressEnabled
      ? this.pool.query<{ previous: number; current: number }>(
          xpProgressNotificationQuery,
          [userId],
        )
      : undefined;
    const [reviews, earned, report, xpResult] = await Promise.all([
      dueReviews,
      achievements,
      weekly,
      xp,
    ]);
    const candidates: Candidate[] = [];
    if (facts.dailyDue)
      candidates.push({ type: 'daily', key: facts.day, data: {} });
    const reviewCount = reviews?.rows[0]?.count;
    if (reviewCount)
      candidates.push({
        type: 'review',
        key: facts.day,
        data: { count: reviewCount },
      });
    if (facts.streakAtRisk)
      candidates.push({
        type: 'streak',
        key: facts.day,
        data: { count: facts.streakAtRisk },
      });
    if (facts.levelProgress)
      candidates.push({
        type: 'progress',
        key: facts.levelProgress.id,
        data: { level: facts.levelProgress.level },
      });
    const points = xpResult?.rows[0];
    const milestone =
      points &&
      xpMilestones.findLast(
        (value) => value > points.previous && value <= points.current,
      );
    if (milestone)
      candidates.push({
        type: 'progress',
        key: 'xp:' + milestone,
        data: { count: milestone },
      });
    const yesterday = new Date(Date.parse(facts.day) - 86_400_000)
      .toISOString()
      .slice(0, 10);
    for (const achievement of earned?.rows ?? []) {
      if (achievement.earnedOn && achievement.earnedOn >= yesterday) {
        candidates.push({
          type: 'achievements',
          key: achievement.id,
          data: { achievementId: achievement.id },
        });
      }
    }
    const summary = report?.rows[0];
    if (summary?.count)
      candidates.push({
        type: 'weekly',
        key: facts.previousWeek,
        data: summary,
      });

    await this.pool.query(
      `WITH notified AS (
         INSERT INTO user_notifications (user_id,type,dedupe_key,data)
         SELECT s.user_id,n.type,n.key,n.data
         FROM notification_schedules s
         JOIN learner_profiles p ON p.user_id=s.user_id
         LEFT JOIN user_ui_preferences prefs ON prefs.user_id=s.user_id
         CROSS JOIN jsonb_to_recordset($3::jsonb) n(type text,key text,data jsonb)
         WHERE s.user_id=$1 AND s.next_check_at=$2
           AND CASE WHEN n.type='daily' THEN p.study_reminder_enabled
             ELSE coalesce((prefs.notifications->>n.type)::boolean,n.type='review' AND $4)
           END
         ON CONFLICT (user_id,type,dedupe_key) DO NOTHING
       )
       UPDATE notification_schedules SET next_check_at=now()+interval '10 minutes'
       WHERE user_id=$1 AND next_check_at=$2`,
      [
        userId,
        job.reservedUntil,
        JSON.stringify(candidates),
        defaultNotifications.review,
      ],
    );
  }
}
