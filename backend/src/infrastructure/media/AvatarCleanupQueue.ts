import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { DatabasePool } from '../db/drizzle/drizzle.provider';

interface CleanupJob {
  publicId: string;
  leaseId: string;
  attempts: number;
}

@Injectable()
export class AvatarCleanupQueue {
  constructor(private readonly pool: DatabasePool) {}

  async reserve(publicId: string) {
    await this.pool.query(
      `INSERT INTO avatar_cleanup_jobs (public_id, next_attempt_at)
       VALUES ($1, now() + interval '15 minutes')`,
      [publicId],
    );
  }

  async claim() {
    const leaseId = randomUUID();
    const { rows } = await this.pool.query<CleanupJob>(
      `WITH next_job AS (
         SELECT public_id FROM avatar_cleanup_jobs
         WHERE next_attempt_at <= now()
         ORDER BY next_attempt_at, public_id
         LIMIT 1 FOR UPDATE SKIP LOCKED
       )
       UPDATE avatar_cleanup_jobs job
       SET next_attempt_at = now() + interval '60 seconds',
           lease_id = $1, attempts = attempts + 1
       FROM next_job
       WHERE job.public_id = next_job.public_id
       RETURNING job.public_id AS "publicId", job.lease_id AS "leaseId", job.attempts`,
      [leaseId],
    );
    return rows[0];
  }

  async complete(job: CleanupJob) {
    await this.pool.query(
      'DELETE FROM avatar_cleanup_jobs WHERE public_id = $1 AND lease_id = $2',
      [job.publicId, job.leaseId],
    );
  }

  async retry(job: CleanupJob) {
    const delaySeconds = Math.min(3600, 15 * 2 ** Math.min(job.attempts, 8));
    await this.pool.query(
      `UPDATE avatar_cleanup_jobs
       SET lease_id = null, next_attempt_at = now() + ($3 * interval '1 second')
       WHERE public_id = $1 AND lease_id = $2`,
      [job.publicId, job.leaseId, delaySeconds],
    );
  }
}
