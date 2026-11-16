require('dotenv').config({ quiet: true });
const { Pool } = require('pg');
const { readdirSync, readFileSync } = require('node:fs');
const { join } = require('node:path');
const { createHash } = require('node:crypto');
async function migrate(pool, adopt = false) {
  const c = await pool.connect();
  try {
    await c.query('SELECT pg_advisory_lock(927481)');
    await c.query(
      'CREATE TABLE IF NOT EXISTS app_migrations(name text PRIMARY KEY,checksum text NOT NULL,applied_at timestamptz NOT NULL DEFAULT now())',
    );
    const dir = join(__dirname, '..', 'migrations');
    for (const name of readdirSync(dir)
      .filter((n) => /^\d+.*\.sql$/.test(n))
      .sort()) {
      const sql = readFileSync(join(dir, name), 'utf8').replace(/\r\n/g, '\n');
      const hash = (text) => createHash('sha256').update(text).digest('hex');
      const checksum = hash(sql);
      const applied = await c.query(
        'SELECT checksum FROM app_migrations WHERE name=$1',
        [name],
      );
      if (applied.rowCount) {
        if (
          ![checksum, hash(sql.replace(/\n/g, '\r\n'))].includes(
            applied.rows[0].checksum,
          )
        )
          throw Error('Migration checksum mismatch: ' + name);
        continue;
      }
      await c.query('BEGIN');
      try {
        const exists =
          name === '001_initial.sql' &&
          (await c.query("SELECT to_regclass('public.users') AS t")).rows[0].t;
        if (exists && !adopt)
          throw Error(
            'Existing schema detected. Back up and verify legacy schema, then run npm run db:migrate -- --adopt-existing.',
          );
        if (!exists) await c.query(sql);
        else {
          const expected = [
            'assessment_result',
            'cards',
            'game_scores',
            'learner_profiles',
            'review_logs',
            'sessions',
            'session_tasks',
            'users',
            'word_senses',
            'words',
          ];
          for (const t of expected) {
            if (
              !(await c.query('SELECT to_regclass($1) AS t', ['public.' + t]))
                .rows[0].t
            )
              throw Error('Legacy table missing: ' + t);
          }
        }
        await c.query(
          'INSERT INTO app_migrations(name,checksum) VALUES($1,$2)',
          [name, checksum],
        );
        await c.query('COMMIT');
        console.log('Applied ' + name);
      } catch (e) {
        await c.query('ROLLBACK');
        throw e;
      }
    }
  } finally {
    await c.query('SELECT pg_advisory_unlock(927481)');
    c.release();
  }
}
module.exports = { migrate };
if (require.main === module) {
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL is required.');
    process.exit(1);
  }
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  migrate(pool, process.argv.includes('--adopt-existing'))
    .catch((e) => {
      console.error(e.message);
      process.exitCode = 1;
    })
    .finally(() => pool.end());
}
