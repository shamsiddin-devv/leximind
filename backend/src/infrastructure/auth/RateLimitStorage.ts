import { Injectable } from '@nestjs/common';
import { ThrottlerStorage } from '@nestjs/throttler';
import { DatabasePool } from '../db/drizzle/drizzle.provider';
@Injectable()
export class RateLimitStorage implements ThrottlerStorage {
  constructor(private readonly pool: DatabasePool) {}
  async increment(
    key: string,
    ttl: number,
    limit: number,
    blockDuration: number,
  ) {
    const { rows } = await this.pool.query<{
      hits: number;
      expires_at: Date;
      blocked_until: Date | null;
    }>(
      `INSERT INTO rate_limits(key,hits,expires_at) VALUES($1,1,now()+$2::double precision*interval '1 millisecond') ON CONFLICT(key) DO UPDATE SET hits=CASE WHEN rate_limits.expires_at<=now() AND (rate_limits.blocked_until IS NULL OR rate_limits.blocked_until<=now()) THEN 1 ELSE rate_limits.hits+1 END, expires_at=CASE WHEN rate_limits.expires_at<=now() AND (rate_limits.blocked_until IS NULL OR rate_limits.blocked_until<=now()) THEN now()+$2::double precision*interval '1 millisecond' ELSE rate_limits.expires_at END, blocked_until=CASE WHEN rate_limits.blocked_until>now() THEN rate_limits.blocked_until WHEN rate_limits.expires_at>now() AND rate_limits.hits+1>$3 THEN now()+$4::double precision*interval '1 millisecond' ELSE NULL END RETURNING hits,expires_at,blocked_until`,
      [key, ttl, limit, blockDuration],
    );
    const r = rows[0],
      now = Date.now();
    return {
      totalHits: r.hits,
      timeToExpire: Math.max(
        0,
        Math.ceil((r.expires_at.getTime() - now) / 1000),
      ),
      isBlocked: !!r.blocked_until && r.blocked_until.getTime() > now,
      timeToBlockExpire: r.blocked_until
        ? Math.max(0, Math.ceil((r.blocked_until.getTime() - now) / 1000))
        : 0,
    };
  }
}
