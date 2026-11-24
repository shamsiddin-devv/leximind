import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { soundIds } from '../domain/entities/GameFeedback';
import { DatabasePool } from './db/drizzle/drizzle.provider';

function sha256(value: string | Buffer) {
  return createHash('sha256').update(value).digest('hex');
}

@Injectable()
export class ReleaseReadiness implements OnModuleInit {
  private readonly logger = new Logger(ReleaseReadiness.name);
  private readonly migrations = new Map<string, Set<string>>();
  private readonly audioDirectory = resolve('assets', 'feedback-audio');
  private audioAvailable = false;
  private accountEmailAvailable = true;

  constructor(
    private readonly pool: DatabasePool,
    private readonly config: ConfigService,
  ) {}

  onModuleInit() {
    if (
      this.config.get('NODE_ENV') === 'production' &&
      !this.config.get('ACCOUNT_MAIL_PROVIDER')
    ) {
      this.accountEmailAvailable = false;
      this.logger.error('Production account email delivery is not configured.');
    }
    try {
      const directory = resolve('migrations');
      for (const name of readdirSync(directory).filter((name) =>
        /^\d+.*\.sql$/.test(name),
      )) {
        const sql = readFileSync(resolve(directory, name), 'utf8');
        const lf = sql.replace(/\r\n/g, '\n');
        this.migrations.set(
          name,
          new Set([sha256(lf), sha256(lf.replace(/\n/g, '\r\n'))]),
        );
      }
    } catch {
      this.migrations.clear();
      this.logger.error('Release migration files could not be verified.');
    }
    try {
      const manifest = JSON.parse(
        readFileSync(resolve(this.audioDirectory, 'sources.json'), 'utf8'),
      ) as Record<string, { sha256?: string }>;
      if (Object.keys(manifest).length !== soundIds.length) {
        throw new Error('Feedback manifest does not match the active cues.');
      }
      for (const id of soundIds) {
        const file = readFileSync(resolve(this.audioDirectory, id + '.wav'));
        if (
          file.length <= 44 ||
          file.toString('ascii', 0, 4) !== 'RIFF' ||
          sha256(file) !== manifest[id]?.sha256
        )
          throw new Error('Invalid feedback audio.');
      }
      this.audioAvailable = true;
    } catch {
      this.logger.error('Release feedback audio files could not be verified.');
    }
  }

  async isReady() {
    if (
      !this.accountEmailAvailable ||
      !this.audioAvailable ||
      !this.migrations.size
    )
      return false;
    const { rows } = await this.pool.query<{ name: string; checksum: string }>(
      'SELECT name, checksum FROM app_migrations WHERE name=ANY($1::text[])',
      [[...this.migrations.keys()]],
    );
    return (
      rows.length === this.migrations.size &&
      rows.every((row) => this.migrations.get(row.name)?.has(row.checksum))
    );
  }
}
