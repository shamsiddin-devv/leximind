import { Injectable, OnApplicationShutdown, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Pool, defaults, types } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { relations } from './drizzle.relations';

// Timestamp columns without a zone store UTC on both reads and writes.
defaults.parseInputDatesAsUTC = true;
types.setTypeParser(
  1114,
  (value: string) => new Date(value.replace(' ', 'T') + 'Z'),
);
export const DRIZZLE = 'DRIZZLE';
@Injectable()
export class DatabasePool extends Pool implements OnApplicationShutdown {
  constructor(config: ConfigService) {
    super({
      connectionString: config.getOrThrow<string>('DATABASE_URL'),
      max: config.get<number>('DB_POOL_MAX', 10),
      connectionTimeoutMillis: 5000,
      idleTimeoutMillis: 30000,
      statement_timeout: 10000,
      application_name: 'leximind',
      options: '-c timezone=UTC',
    });
    this.on('error', () =>
      new Logger('Database').error('Idle database connection failed.'),
    );
  }
  async onApplicationShutdown() {
    await this.end();
  }
}
export const drizzleProvider = {
  provide: DRIZZLE,
  useFactory: (pool: DatabasePool) => drizzle({ client: pool, relations }),
  inject: [DatabasePool],
};
