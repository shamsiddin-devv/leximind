const { test } = require('node:test');
const assert = require('node:assert/strict');
const { Pool } = require('pg');
const { randomUUID } = require('node:crypto');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const { migrate } = require('../scripts/migrate.cjs');
test('legacy adoption preserves data, rejects conflicts, and checks migration integrity', async () => {
  const base = process.env.TEST_DATABASE_URL;
  if (!base) throw Error('TEST_DATABASE_URL is required.');
  const admin = new Pool({ connectionString: base });
  const name = 'leximind_test_' + randomUUID().replaceAll('-', '');
  const url = new URL(base);
  url.pathname = '/' + name;
  let pool,
    created = false;
  try {
    await admin.query('CREATE DATABASE "' + name + '"');
    created = true;
    pool = new Pool({ connectionString: url.toString() });
    await pool.query(
      readFileSync(join(__dirname, '../migrations/001_initial.sql'), 'utf8'),
    );
    await pool.query(
      "INSERT INTO users(full_name,email,password_hash) VALUES('Existing','EXISTING@example.com','retained-hash')",
    );
    await assert.rejects(migrate(pool), /Existing schema detected/);
    await migrate(pool, true);
    const { rows } = await pool.query(
      'SELECT u.email,u.password_hash,p.level FROM users u JOIN learner_profiles p ON p.user_id=u.id',
    );
    assert.equal(rows.length, 1);
    assert.equal(rows[0].email, 'existing@example.com');
    assert.equal(rows[0].password_hash, 'retained-hash');
    assert.equal(rows[0].level, 'A1');
    await migrate(pool);
    await pool.query(
      "UPDATE app_migrations SET checksum='invalid' WHERE name='001_initial.sql'",
    );
    await assert.rejects(migrate(pool), /checksum mismatch/);
  } finally {
    if (pool) await pool.end();
    if (created && /^leximind_test_[a-f0-9]{32}$/.test(name))
      await admin.query('DROP DATABASE "' + name + '" WITH (FORCE)');
    await admin.end();
  }
});
