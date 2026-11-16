require('dotenv').config({ quiet: true });
const { Pool } = require('pg');
if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL is required.');
  process.exit(1);
}
const email = process.argv[2];
if (!email) {
  console.error('Usage: npm run db:admin -- existing-user@example.com');
  process.exit(1);
}
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
pool
  .query(
    "UPDATE users SET role='admin',updated_at=now() WHERE email=$1 RETURNING id",
    [email.trim().toLowerCase()],
  )
  .then((r) => {
    if (!r.rowCount) throw Error('User not found. Register the account first.');
    console.log('Administrator role granted.');
  })
  .catch((e) => {
    console.error(e.message);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
