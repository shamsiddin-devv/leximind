import { Injectable } from '@nestjs/common';
import type {
  IReferralRepository,
  ReferralSummary,
} from '../../domain/repositories/IReferralRepository';
import { DatabasePool } from '../db/drizzle/drizzle.provider';

@Injectable()
export class ReferralRepository implements IReferralRepository {
  constructor(private readonly pool: DatabasePool) {}

  async summary(userId: string) {
    const { rows } = await this.pool.query<ReferralSummary>(
      `WITH visible AS (
         SELECT id, registered_at, rewarded_at, reward_xp FROM referrals
         WHERE referrer_id=$1 AND (referred_user_id IS NOT NULL OR rewarded_at IS NOT NULL)
       ), totals AS (
         SELECT count(*)::integer AS registered,
           count(*) FILTER (WHERE rewarded_at IS NULL)::integer AS pending,
           count(*) FILTER (WHERE rewarded_at IS NOT NULL)::integer AS rewarded,
           coalesce(sum(reward_xp) FILTER (WHERE rewarded_at IS NOT NULL), 0)::float8 AS "earnedXp"
         FROM visible
       ), recent AS (
         SELECT id, registered_at AS "registeredAt", rewarded_at AS "rewardedAt", reward_xp AS "rewardXp"
         FROM visible ORDER BY registered_at DESC, id DESC LIMIT 20
       )
       SELECT u.referral_code AS code, totals.*,
         coalesce((SELECT jsonb_agg(to_jsonb(recent) ORDER BY "registeredAt" DESC, id DESC) FROM recent), '[]') AS recent
       FROM users u CROSS JOIN totals WHERE u.id=$1`,
      [userId],
    );
    return rows[0];
  }
}
