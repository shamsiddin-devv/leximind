import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { DatabasePool } from './drizzle/drizzle.provider';

@Injectable()
export class DatabaseMaintenance implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DatabaseMaintenance.name);
  private interval?: NodeJS.Timeout;
  private running = false;
  constructor(private readonly pool: DatabasePool) {}
  onModuleInit() {
    this.interval = setInterval(() => void this.cleanup(), 15 * 60_000);
    this.interval.unref();
  }
  onModuleDestroy() {
    clearInterval(this.interval);
  }
  private async cleanup() {
    if (this.running) return;
    this.running = true;
    try {
      for (const statement of [
        'DELETE FROM auth_sessions WHERE id IN (SELECT id FROM auth_sessions WHERE expires_at<now() ORDER BY expires_at LIMIT 1000 FOR UPDATE SKIP LOCKED)',
        'DELETE FROM account_actions WHERE token_hash IN (SELECT token_hash FROM account_actions WHERE expires_at<now() ORDER BY expires_at LIMIT 1000 FOR UPDATE SKIP LOCKED)',
        'DELETE FROM rate_limits WHERE key IN (SELECT key FROM rate_limits WHERE expires_at<now() AND (blocked_until IS NULL OR blocked_until<now()) ORDER BY expires_at LIMIT 1000 FOR UPDATE SKIP LOCKED)',
        "DELETE FROM challenges WHERE id IN (SELECT id FROM challenges WHERE completed_at IS NULL AND expires_at<now()-interval '1 day' ORDER BY expires_at LIMIT 1000 FOR UPDATE SKIP LOCKED)",
      ])
        await this.pool.query(statement);
    } catch {
      this.logger.error('Expired record cleanup failed.');
    } finally {
      this.running = false;
    }
  }
}
