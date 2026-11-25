require('dotenv').config({ quiet: true });
const { Pool } = require('pg');
if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL is required.');
  process.exit(1);
}
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
(async () => {
  const c = await pool.connect();
  try {
    await c.query('BEGIN');
    await c.query('DELETE FROM auth_sessions WHERE expires_at<now()');
    await c.query('DELETE FROM account_actions WHERE expires_at<now()');
    await c.query(
      'DELETE FROM phone_verification_challenges WHERE expires_at<now()',
    );
    await c.query(
      'DELETE FROM rate_limits WHERE expires_at<now() AND (blocked_until IS NULL OR blocked_until<now())',
    );
    await c.query(
      "DELETE FROM challenges WHERE completed_at IS NULL AND expires_at<now()-interval '1 day'",
    );
    await c.query('COMMIT');
    console.log(
      'Expired authentication, throttling, and abandoned challenge records removed.',
    );
  } catch (e) {
    await c.query('ROLLBACK');
    throw e;
  } finally {
    c.release();
  }
})()
  .catch((e) => {
    console.error(e.message);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
