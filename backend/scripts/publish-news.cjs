const { readFileSync, statSync } = require('node:fs');
const { Pool } = require('pg');

const usage = 'Foydalanish: npm run db:news -- <release.json> [--apply]';
const newsOptIn = `notifications @> '{"news":true}'`;

class AnnouncementInputError extends Error {}

function validateAnnouncement(input) {
  const keys = ['slug', 'title', 'body'];
  if (
    !input ||
    typeof input !== 'object' ||
    Array.isArray(input) ||
    Object.keys(input).length !== keys.length ||
    !keys.every((key) => typeof input[key] === 'string')
  ) {
    throw new AnnouncementInputError(
      'JSON faylda slug, title va body matn bo‘lishi kerak.',
    );
  }
  const { slug } = input;
  const title = input.title.trim();
  const body = input.body.trim();
  if (slug.length > 80 || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    throw new AnnouncementInputError(
      'Slug 80 belgigacha bo‘lgan lotincha kichik harf, raqam va tirelardan tuzilishi kerak.',
    );
  }
  if (
    !title ||
    title.length > 100 ||
    !body ||
    body.length > 500 ||
    /[\x00-\x1f\x7f]/.test(title) ||
    /[\x00-\x09\x0b-\x1f\x7f]/.test(body)
  ) {
    throw new AnnouncementInputError(
      'Sarlavha 1–100 belgi va xabar 1–500 belgi bo‘lishi kerak.',
    );
  }
  return { slug, title, body };
}

function announcementFromFile(path) {
  let input;
  try {
    const file = statSync(path);
    if (!file.isFile() || file.size > 8 * 1024) {
      throw new AnnouncementInputError('8 KiB gacha bo‘lgan JSON fayl kerak.');
    }
    input = JSON.parse(readFileSync(path, 'utf8'));
  } catch (error) {
    if (error instanceof AnnouncementInputError) throw error;
    throw new AnnouncementInputError(
      'Xabar faylini o‘qib bo‘lmadi. UTF-8 formatdagi JSON faylni tekshiring.',
    );
  }
  return validateAnnouncement(input);
}

function checkExisting(existing, announcement) {
  if (
    existing &&
    (existing.title !== announcement.title ||
      existing.body !== announcement.body)
  ) {
    throw new AnnouncementInputError(
      'Bu slug boshqa matnga tegishli. Yangi xabar uchun boshqa slug kiriting.',
    );
  }
  return Boolean(existing);
}

async function previewNews(pool, input) {
  const announcement = validateAnnouncement(input);
  const {
    rows: [info],
  } = await pool.query(
    `SELECT (SELECT count(*)::integer FROM user_ui_preferences WHERE ${newsOptIn}) AS recipients,
        (SELECT to_jsonb(a) FROM notification_announcements a WHERE slug=$1) AS existing`,
    [announcement.slug],
  );
  const alreadyPublished = checkExisting(info.existing, announcement);
  return {
    ...announcement,
    preview: true,
    alreadyPublished,
    recipients: alreadyPublished ? 0 : info.recipients,
  };
}

async function publishNews(pool, input) {
  const announcement = validateAnnouncement(input);
  const { slug, title, body } = announcement;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const registered = await client.query(
      `INSERT INTO notification_announcements (slug, title, body) VALUES ($1,$2,$3)
       ON CONFLICT (slug) DO NOTHING RETURNING slug`,
      [slug, title, body],
    );
    if (registered.rowCount === 0) {
      const {
        rows: [existing],
      } = await client.query(
        'SELECT title,body FROM notification_announcements WHERE slug=$1',
        [slug],
      );
      checkExisting(existing, announcement);
      await client.query('COMMIT');
      return { slug, alreadyPublished: true, published: 0 };
    }

    const inserted = await client.query(
      `INSERT INTO user_notifications (user_id,type,dedupe_key,data)
       SELECT user_id,'news',$1,$2::jsonb
       FROM user_ui_preferences WHERE ${newsOptIn}
       ON CONFLICT (user_id,type,dedupe_key) DO NOTHING`,
      [slug, JSON.stringify(announcement)],
    );
    await client.query(inserted.rowCount ? 'COMMIT' : 'ROLLBACK');
    return { slug, alreadyPublished: false, published: inserted.rowCount };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function main(args) {
  if (args.length === 1 && args[0] === '--help') {
    console.log(usage);
    return;
  }
  if (
    args.length < 1 ||
    args.length > 2 ||
    args[0].startsWith('--') ||
    (args.length === 2 && args[1] !== '--apply')
  ) {
    throw new AnnouncementInputError(usage);
  }
  const announcement = announcementFromFile(args[0]);
  require('dotenv').config({ quiet: true });
  if (!process.env.DATABASE_URL)
    throw new AnnouncementInputError('DATABASE_URL sozlanishi kerak.');

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    application_name: 'leximind_news',
    connectionTimeoutMillis: 5000,
    statement_timeout: 300_000,
    options: '-c lock_timeout=5000',
  });
  try {
    const output =
      args.length === 2
        ? await publishNews(pool, announcement)
        : await previewNews(pool, announcement);
    console.log(JSON.stringify(output, null, 2));
  } finally {
    await pool.end();
  }
}

if (require.main === module) {
  main(process.argv.slice(2)).catch((error) => {
    console.error(
      error instanceof AnnouncementInputError
        ? error.message
        : 'Xabar operatsiyasi bajarilmadi. Baza ulanishi va migratsiyalarni tekshiring.',
    );
    process.exitCode = 1;
  });
}

module.exports = { previewNews, publishNews };
