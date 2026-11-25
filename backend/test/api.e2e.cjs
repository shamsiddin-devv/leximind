const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID, createHash } = require('node:crypto');
const { readdirSync } = require('node:fs');
const { join } = require('node:path');
const { Pool } = require('pg');
const request = require('supertest');
const { NestFactory } = require('@nestjs/core');
const { generateVAPIDKeys } = require('web-push');
const { migrate } = require('../scripts/migrate.cjs');
process.env.TZ = 'Asia/Tashkent';
const base = process.env.TEST_DATABASE_URL;
if (!base)
  throw Error(
    'Set TEST_DATABASE_URL to a dedicated PostgreSQL test server (CREATEDB required).',
  );
const database = 'leximind_test_' + randomUUID().replaceAll('-', '');
const url = new URL(base);
url.pathname = '/' + database;
let app,
  pool,
  adminPool,
  api,
  emailWorker,
  avatarWorker,
  notificationWorker,
  contract,
  token,
  otherToken,
  userId,
  wordId,
  cardId,
  session,
  created = false;
const password = 'Good876!';
const auth = () => ({ Authorization: 'Bearer ' + token });
const other = () => ({ Authorization: 'Bearer ' + otherToken });
const successfulRoutes = new Set();
const sentAccountEmails = [];
const uploadedAvatars = new Set();
const testVapid = generateVAPIDKeys();
let failAvatarRemoval = false;
let failAvatarUploadResponse = false;
before(async () => {
  adminPool = new Pool({ connectionString: base });
  await adminPool.query('CREATE DATABASE "' + database + '"');
  created = true;
  pool = new Pool({
    connectionString: url.toString(),
    options: '-c timezone=UTC',
  });
  await migrate(pool);
  await migrate(pool);
  process.env.DATABASE_URL = url.toString();
  process.env.NODE_ENV = 'test';
  process.env.PORT = '3000';
  process.env.CORS_ORIGINS = 'http://localhost:5173';
  process.env.TRUSTED_PROXIES = '';
  process.env.SMTP_EMAIL = '';
  process.env.SMTP_PASS = '';
  process.env.EMAIL_API_KEY = 'test-provider-key';
  process.env.EMAIL_FROM = 'LexiMind <test@example.com>';
  process.env.ACCOUNT_ACTION_URL = 'https://example.com/account-action';
  process.env.ACCOUNT_EMAIL_KEY = 'a1'.repeat(32);
  process.env.NOTIFICATION_DELIVERY_ENABLED = 'true';
  process.env.VAPID_SUBJECT = 'mailto:test@example.com';
  process.env.VAPID_PUBLIC_KEY = testVapid.publicKey;
  process.env.VAPID_PRIVATE_KEY = testVapid.privateKey;
  process.env.CLOUDINARY_CLOUD_NAME = 'test';
  process.env.CLOUDINARY_API_KEY = 'test';
  process.env.CLOUDINARY_API_SECRET = 'test';
  const { AppModule } = require('../dist/src/app.module');
  const {
    AccountActionMailer,
  } = require('../dist/src/infrastructure/auth/AccountActionMailer');
  AccountActionMailer.prototype.deliver = async function (email, kind, token, _digest, code) {
    sentAccountEmails.push({ email, kind, token, code });
    return true;
  };
  const {
    AccountEmailWorker,
  } = require('../dist/src/infrastructure/auth/AccountEmailWorker');
  const {
    CloudinaryAvatarStorage,
  } = require('../dist/src/infrastructure/media/CloudinaryAvatarStorage');
  CloudinaryAvatarStorage.prototype.request = async function (action, form) {
    if (action === 'destroy') {
      if (failAvatarRemoval) throw Error('Simulated storage outage');
      return Response.json({ result: uploadedAvatars.delete(form.get('public_id')) ? 'ok' : 'not found' });
    }
    const publicId = form.get('folder') + '/' + form.get('public_id');
    uploadedAvatars.add(publicId);
    if (failAvatarUploadResponse) return Response.json({});
    return Response.json({
      public_id: publicId,
      secure_url: 'https://res.cloudinary.com/test/image/upload/' + publicId + '.jpg',
    });
  };
  const { AvatarCleanupWorker } = require('../dist/src/infrastructure/media/AvatarCleanupWorker');
  const { LearningNotificationWorker } = require('../dist/src/infrastructure/repositories/LearningNotificationWorker');
  const { configureApp } = require('../dist/src/presentation/configure-app');
  app = await NestFactory.create(AppModule, {
    logger: false,
    bodyParser: false,
    abortOnError: false,
  });
  configureApp(app);
  app.use((req, res, next) => {
    res.once('finish', () => {
      if (
        res.statusCode >= 200 &&
        res.statusCode < 300 &&
        typeof req.route?.path === 'string'
      ) {
        const path = req.route.path.replace(/:([A-Za-z][\w]*)/g, '{$1}');
        successfulRoutes.add(req.method.toLowerCase() + ' ' + path);
      }
    });
    next();
  });
  await app.init();
  api = request(app.getHttpServer());
  emailWorker = app.get(AccountEmailWorker);
  avatarWorker = app.get(AvatarCleanupWorker);
  notificationWorker = app.get(LearningNotificationWorker);
});
after(async () => {
  if (app) await app.close();
  if (pool) await pool.end();
  if (adminPool) {
    // Only the database generated and created by this process is ever dropped.
    if (created && /^leximind_test_[a-f0-9]{32}$/.test(database))
      await adminPool.query('DROP DATABASE "' + database + '" WITH (FORCE)');
    await adminPool.end();
  }
});
test('complete API and database lifecycle', async (t) => {
  await t.test('health endpoints and security headers', async () => {
    const r = await api.get('/api/health/ready').expect(200);
    assert.equal(r.body.status, 'ok');
    assert.equal(r.headers['x-content-type-options'], 'nosniff');
    assert.ok(r.headers['x-request-id']);
    assert.match(r.headers['x-trace-id'], /^[0-9a-f]{32}$/);
    const traceId = 'b'.repeat(32);
    await api
      .get('/api/health/live')
      .set('traceparent', '00-' + traceId + '-' + 'c'.repeat(16) + '-01')
      .expect('x-trace-id', traceId)
      .expect(200);
    await api.get('/api/health/live').expect(200);
    const name = '001_initial.sql';
    const { rows } = await pool.query(
      'SELECT checksum FROM app_migrations WHERE name=$1',
      [name],
    );
    try {
      await pool.query(
        "UPDATE app_migrations SET checksum='incorrect' WHERE name=$1",
        [name],
      );
      await api.get('/api/health/ready').expect(503);
      await api.get('/api/health/live').expect(200);
    } finally {
      await pool.query('UPDATE app_migrations SET checksum=$2 WHERE name=$1', [
        name,
        rows[0].checksum,
      ]);
    }
    await api.get('/api/health/ready').expect(200);
  });
  await t.test('requires an account email provider for production readiness', async () => {
    const { ConfigService } = require('@nestjs/config');
    const { ReleaseReadiness } = require('../dist/src/infrastructure/ReleaseReadiness');
    const offline = new ReleaseReadiness(pool, new ConfigService({
      NODE_ENV: 'production',
      ACCOUNT_MAIL_PROVIDER: null,
    }));
    offline.logger = { error() {} };
    offline.onModuleInit();
    assert.equal(await offline.isReady(), false);
    const gmail = new ReleaseReadiness(pool, new ConfigService({
      NODE_ENV: 'production',
      ACCOUNT_MAIL_PROVIDER: 'gmail',
    }));
    gmail.onModuleInit();
    assert.equal(await gmail.isReady(), true);
  });
  await t.test(
    'documents request schemas and rejects malformed or oversized bodies',
    async () => {
      contract = (await api.get('/api/docs-json').expect(200)).body;
      assert.ok(contract.components.schemas.CreateUserDto.properties.password);
      assert.deepEqual(contract.paths['/api/auth/login'].post.security, []);
      assert.ok(
        contract.paths['/api/feedback-audio/{file}'].get.responses['200']
          .content['audio/wav'],
      );
      const malformed = await api
        .post('/api/auth/login')
        .set('Content-Type', 'application/json')
        .send('{')
        .expect(400);
      assert.ok(malformed.headers['x-request-id']);
      await api
        .post('/api/auth/login')
        .send({ email: 'x'.repeat(300000) })
        .expect(413);
    },
  );
  await t.test(
    'rejects anonymous access and invalid registration',
    async () => {
      await api.get('/api/users/me').expect(401);
      await api
        .post('/api/auth/register')
        .send({ fullName: '', email: 'bad', password: 'short', role: 'admin' })
        .expect(400);
      await api
        .post('/api/auth/register')
        .send({
          fullName: 'Test Learner',
          email: 'first@example.com',
          password: 'Short7!',
        })
        .expect(400);
    },
  );
  await t.test(
    'registers normalized user and profile without exposing secrets',
    async () => {
      const r = await api
        .post('/api/auth/register')
        .send({
          fullName: ' First Learner ',
          email: 'FIRST@example.com',
          password,
        })
        .expect(201);
      userId = r.body.id;
      assert.equal(r.body.email, 'first@example.com');
      assert.equal(r.body.fullName, 'First Learner');
      assert.ok(!JSON.stringify(r.body).includes('password'));
      const db = await pool.query(
        'SELECT password_hash FROM users WHERE id=$1',
        [userId],
      );
      assert.ok(db.rows[0].password_hash.startsWith('$2'));
    },
  );
  await t.test('rejects duplicate email and invalid credentials', async () => {
    await api
      .post('/api/auth/register')
      .send({ fullName: 'Again', email: 'first@example.com', password })
      .expect(409);
    await api
      .post('/api/auth/login')
      .send({ email: 'first@example.com', password: 'incorrect' })
      .expect(401);
  });
  await t.test('logs in and stores only a token digest', async () => {
    const r = await api
      .post('/api/auth/login')
      .send({ email: 'first@example.com', password })
      .expect(200);
    token = r.body.accessToken;
    assert.equal(token.length, 43);
    const saved = await pool.query(
      'SELECT token_hash FROM auth_sessions WHERE user_id=$1',
      [userId],
    );
    assert.equal(
      saved.rows[0].token_hash,
      createHash('sha256').update(token).digest('hex'),
    );
    await api.get('/api/users/me').set(auth()).expect(200);
  });
  await t.test('renews remembered sessions and revokes replayed or signed-out refresh tokens', async () => {
    const login = { email: 'first@example.com', password, rememberSession: true };
    const authorize = (session) => ({ Authorization: 'Bearer ' + session.accessToken });
    const { body: initial } = await api.post('/api/auth/login').send(login).expect(200);
    const db = await pool.query('SELECT refresh_token_hash FROM auth_sessions WHERE id=$1', [initial.sessionId]);
    assert.equal(db.rows[0].refresh_token_hash, createHash('sha256').update(initial.refreshToken).digest('hex'));
    assert.ok(Date.parse(initial.refreshExpiresAt) > Date.parse(initial.expiresAt));
    await pool.query("UPDATE auth_sessions SET access_expires_at=now()-interval '1 second' WHERE id=$1", [initial.sessionId]);
    await api.get('/api/users/me').set(authorize(initial)).expect('www-authenticate', 'Bearer error="invalid_token"').expect(401);
    const { body: next } = await api.post('/api/auth/refresh').send({ refreshToken: initial.refreshToken }).expect(200);
    assert.equal(next.sessionId, initial.sessionId);
    assert.equal(next.refreshExpiresAt, initial.refreshExpiresAt);
    assert.notEqual(next.refreshToken, initial.refreshToken);
    await api.get('/api/users/me').set(authorize(next)).expect(200);
    await api.post('/api/auth/refresh').send({ refreshToken: initial.refreshToken }).expect(401);
    await api.get('/api/users/me').set(authorize(next)).expect(401);
    await api.post('/api/auth/refresh').send({ refreshToken: next.refreshToken }).expect(401);
    const { body: signedOut } = await api.post('/api/auth/login').send(login).expect(200);
    await api.post('/api/auth/logout').set(authorize(signedOut)).expect(204);
    await api.post('/api/auth/refresh').send({ refreshToken: signedOut.refreshToken }).expect(401);
  });
  await t.test(
    'forbids user enumeration and catalog mutation for learners',
    async () => {
      await api.get('/api/users').set(auth()).expect(403);
      await api.post('/api/words').set(auth()).send({}).expect(403);
    },
  );
  await t.test(
    'persists and replaces an avatar for the authenticated user',
    async () => {
      const image =
        'data:image/jpeg;base64,' +
        Buffer.from([0xff, 0xd8, 0xff, 0xd9]).toString('base64');
      await api.put('/api/users/me/avatar').send({ image }).expect(401);
      await api
        .put('/api/users/me/avatar')
        .set(auth())
        .send({ image: 'invalid' })
        .expect(400);

      const first = (
        await api
          .put('/api/users/me/avatar')
          .set(auth())
          .send({ image })
          .expect(200)
      ).body;
      assert.match(first.avatarUrl, /\/LexiMind\//);
      const second = (
        await api
          .put('/api/users/me/avatar')
          .set(auth())
          .send({ image })
          .expect(200)
      ).body;
      assert.notEqual(second.avatarUrl, first.avatarUrl);
      failAvatarRemoval = true;
      try {
        await avatarWorker.flush();
      } finally {
        failAvatarRemoval = false;
      }
      assert.equal(uploadedAvatars.size, 2);
      const pending = await pool.query('SELECT attempts, lease_id, next_attempt_at > now() AS deferred FROM avatar_cleanup_jobs');
      assert.deepEqual(pending.rows, [{ attempts: 1, lease_id: null, deferred: true }]);
      await avatarWorker.flush();
      assert.equal(uploadedAvatars.size, 2);
      await pool.query("UPDATE avatar_cleanup_jobs SET next_attempt_at = now() - interval '1 second'");
      await avatarWorker.flush();
      assert.equal(uploadedAvatars.size, 1);
      assert.equal(
        (await api.get('/api/users/me').set(auth()).expect(200)).body.avatarUrl,
        second.avatarUrl,
      );

      const removed = await api
        .delete('/api/users/me/avatar')
        .set(auth())
        .expect(200);
      assert.equal(removed.body.avatarUrl, null);
      await avatarWorker.flush();
      assert.equal(uploadedAvatars.size, 0);
      failAvatarUploadResponse = true;
      try {
        await api.put('/api/users/me/avatar').set(auth()).send({ image }).expect(503);
      } finally {
        failAvatarUploadResponse = false;
      }
      const orphaned = await pool.query('SELECT attempts, lease_id, next_attempt_at > now() AS deferred FROM avatar_cleanup_jobs');
      assert.deepEqual(orphaned.rows, [{ attempts: 0, lease_id: null, deferred: true }]);
      await pool.query("UPDATE avatar_cleanup_jobs SET next_attempt_at = now() - interval '1 second'");
      await avatarWorker.flush();
      assert.equal(uploadedAvatars.size, 0);
    },
  );
  await t.test('persists a formatted bio and structured location without breaking legacy updates', async () => {
    const fields = { bio: 'Learning English', countryCode: 'UZ', city: 'Samarqand' };
    const bioFormat = JSON.stringify([{ insert: fields.bio, attributes: { bold: true, underline: true, color: '#615bfe' } }, { insert: '\n', attributes: { align: 'center', list: 'bullet' } }]);
    await api.patch('/api/users/me').set(auth())
      .send({ city: 'Samarqand' }).expect(400);
    await api.patch('/api/users/me').set(auth())
      .send({ ...fields, bioFormat: JSON.stringify([{ insert: 'wrong\n' }]) }).expect(400);
    await api.patch('/api/users/me').set(auth())
      .send({ ...fields, bioFormat: JSON.stringify([{ insert: fields.bio + '\n', attributes: { link: 'https://example.test' } }]) }).expect(400);
    await api.patch('/api/users/me').set(auth()).send({ ...fields, bioFormat }).expect(200);
    const saved = (await api.get('/api/users/me').set(auth()).expect(200)).body;
    for (const [key, value] of Object.entries({ ...fields, bioFormat })) assert.equal(saved[key], value);
    assert.match(saved.location, /^Samarqand, /);
    const legacy = (await api.patch('/api/users/me').set(auth())
      .send({ location: 'Old town', bio: 'Plain bio' }).expect(200)).body;
    assert.equal(legacy.location, 'Old town');
    assert.equal(legacy.countryCode, null);
    assert.equal(legacy.city, null);
    assert.equal(legacy.bioFormat, null);
    await api.patch('/api/users/me').set(auth()).send({ location: null, bio: null }).expect(200);
  });

  await t.test('validates profile and persists changes', async () => {
    await api
      .patch('/api/profile')
      .set(auth())
      .send({ timezone: '' })
      .expect(400);
    await api
      .patch('/api/users/me')
      .set(auth())
      .send({ fullName: null })
      .expect(400);
    await api
      .patch('/api/profile')
      .set(auth())
      .send({ timezone: null })
      .expect(400);
    await api.get('/api/cards/not-a-uuid').set(auth()).expect(400);
    await api
      .patch('/api/profile')
      .set(auth())
      .send({ timezone: 'Mars/Olympus' })
      .expect(400);
    await api
      .patch('/api/profile')
      .set(auth())
      .send({ level: 'C2' })
      .expect(400);
    const defaults = (await api.get('/api/profile').set(auth()).expect(200)).body;
    assert.equal(defaults.dailyStudyMinutes, 15);
    assert.equal(defaults.studyLevel, null);
    assert.equal(defaults.reviewMode, 'spaced');
    assert.equal(defaults.studyReminderEnabled, false);
    assert.equal(defaults.autoplayPronunciation, false);
    for (const invalid of [
      { dailyStudyMinutes: 4 }, { dailyStudyMinutes: 181 }, { reviewMode: 'ordered' },
      { studyLevel: 'Z9' }, { studyReminderTime: '24:00' }, { studyReminderEnabled: 'true' },
    ]) {
      await api.patch('/api/profile').set(auth()).send(invalid).expect(400);
    }
    const preferences = {
      timezone: 'Asia/Tashkent', dailyNewWords: 3, dailyStudyMinutes: 25,
      studyLevel: 'B1', reviewMode: 'random', studyReminderEnabled: true,
      studyReminderTime: '18:30', autoplayPronunciation: true,
    };
    const r = await api
      .patch('/api/profile')
      .set(auth())
      .send(preferences)
      .expect(200);
    const saved = (await api.get('/api/profile').set(auth()).expect(200)).body;
    for (const [key, value] of Object.entries(preferences)) {
      assert.equal(r.body[key], value);
      assert.equal(saved[key], value);
    }
    assert.equal(saved.level, defaults.level);
    const reset = await api.patch('/api/profile').set(auth()).send({ studyLevel: null, studyReminderEnabled: false }).expect(200);
    assert.equal(reset.body.studyLevel, null);
    assert.equal(reset.body.studyReminderTime, '18:30');
  });
  await t.test('creates catalog words with senses and audio', async () => {
    await pool.query("UPDATE users SET role='admin' WHERE id=$1", [userId]);
    const r = await api
      .post('/api/words')
      .set(auth())
      .send({
        text: ' Apple ',
        cefrLevel: 'A1',
        audioUrl: 'https://example.com/apple.mp3',
        sense: [
          {
            definition: 'A fruit',
            exampleSentence: 'I eat an apple.',
            translationUz: 'olma',
            orderIndex: 0,
          },
        ],
      })
      .expect(201);
    wordId = r.body.id;
    assert.equal(r.body.text, 'apple');
    assert.equal(r.body.sense[0].orderIndex, 0);
    assert.equal(r.body.audioUrl, 'https://example.com/apple.mp3');
    await api.get('/api/words/daily').expect(401);
    const daily = await api.get('/api/words/daily').set(auth()).expect(200);
    assert.equal(daily.body.word.id, wordId);
    assert.equal(daily.body.word.sense[0].translationUz, 'olma');
    await api
      .get('/api/words/' + randomUUID())
      .set(auth())
      .expect(404);
  });
  await t.test('bulk import and accurate paginated count', async () => {
    const words = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'].flatMap((level) =>
      Array.from({ length: 4 }, (_, i) => ({
        text: level.toLowerCase() + '-word-' + i,
        cefrLevel: level,
        sense: [
          {
            definition: 'Definition ' + level + i,
            exampleSentence: 'Example ' + level + i,
            translationUz: 'Tarjima ' + level + i,
            orderIndex: 0,
          },
        ],
      })),
    );
    await api.post('/api/words/bulk').set(auth()).send({ words }).expect(201);
    const r = await api
      .get('/api/words?limit=2&page=2')
      .set(auth())
      .expect(200);
    assert.equal(r.body.total, 25);
    assert.equal(r.body.totalPage, 13);
    assert.equal(r.body.data.length, 2);
    await api.get('/api/words?limit=-1').set(auth()).expect(400);
  });
  await t.test(
    'manages senses atomically and preserves their IDs',
    async () => {
      const wordPath = '/api/words/' + wordId;
      const path = wordPath + '/senses';
      const original = (await api.get(path).set(auth()).expect(200)).body[0];
      const input = {
        definition: 'A fruit',
        exampleSentence: 'Slice the apple.',
        translationUz: 'olma',
        orderIndex: 1,
      };
      const added = (await api.post(path).set(auth()).send(input).expect(201))
        .body;
      const updated = (
        await api
          .put(path + '/' + added.id)
          .set(auth())
          .send({ ...input, orderIndex: 2 })
          .expect(200)
      ).body;
      assert.equal(updated.id, added.id);
      assert.equal(updated.orderIndex, 2);
      await api
        .get(path + '/' + added.id)
        .set(auth())
        .expect(200);
      await api
        .put(wordPath)
        .set(auth())
        .send({
          text: 'apple',
          cefrLevel: 'A1',
          audioUrl: 'https://example.com/apple.mp3',
          sense: [
            { ...input, orderIndex: 0 },
            { ...input, orderIndex: 2 },
          ],
        })
        .expect(200);
      assert.deepEqual(
        (await api.get(path).set(auth()).expect(200)).body.map((s) => s.id),
        [original.id, added.id],
      );
      const deletes = await Promise.all(
        [original.id, added.id].map((id) =>
          api.delete(path + '/' + id).set(auth()),
        ),
      );
      assert.deepEqual(deletes.map((r) => r.status).sort(), [204, 409]);
      assert.equal(
        (await api.get(path).set(auth()).expect(200)).body.length,
        1,
      );
    },
  );
  await t.test('rolls back bulk import on duplicate', async () => {
    const word = {
      text: 'rollback-word',
      cefrLevel: 'A1',
      sense: [
        {
          definition: 'd',
          exampleSentence: 'e',
          translationUz: 't',
          orderIndex: 0,
        },
      ],
    };
    await api
      .post('/api/words/bulk')
      .set(auth())
      .send({ words: [word, word] })
      .expect(409);
    assert.equal(
      (await api.get('/api/words?search=rollback-word').set(auth()).expect(200))
        .body.total,
      0,
    );
  });
  await t.test(
    'cards initialize on server and reject injected owner and schedule',
    async () => {
      await api
        .post('/api/cards')
        .set(auth())
        .send({ wordId, userId, stability: 2 })
        .expect(400);
      const r = await api
        .post('/api/cards')
        .set(auth())
        .send({ wordId })
        .expect(201);
      cardId = r.body.id;
      assert.equal(r.body.wordId, wordId);
      assert.equal(r.body.userId, userId);
      assert.equal(r.body.state, 'NEW');
      await api.get('/api/cards/collection').expect(401);
      const { body: collection } = await api.get('/api/cards/collection?limit=1').set(auth())
        .expect('Cache-Control', 'no-store').expect(200);
      assert.equal(collection.total, 1);
      assert.equal(collection.data[0].id, cardId);
      assert.equal(collection.data[0].text, 'apple');
      assert.equal(collection.data[0].progress, 0);
      assert.equal(collection.data[0].mastered, false);
      assert.deepEqual((await api.get('/api/cards/collection?page=2&limit=1').set(auth()).expect(200)).body, {
        data: [], total: 1,
      });
      await api.post('/api/cards').set(auth()).send({ wordId }).expect(409);
      await api
        .post('/api/cards')
        .set(auth())
        .send({ wordId: randomUUID() })
        .expect(409);
    },
  );
  await t.test('saves onboarding preferences and isolates another account from private data', async () => {
    await api
      .post('/api/auth/register')
      .send({
        fullName: 'Other', email: 'other@example.com', password,
        dailyStudyMinutes: 20, dailyNewWords: 12, studyLevel: 'B2',
      })
      .expect(201);
    otherToken = (
      await api
        .post('/api/auth/login')
        .send({ email: 'other@example.com', password })
        .expect(200)
    ).body.accessToken;
    const { body: preferences } = await api.get('/api/profile').set(other()).expect(200);
    assert.equal(preferences.dailyStudyMinutes, 20);
    assert.equal(preferences.dailyNewWords, 12);
    assert.equal(preferences.studyLevel, 'B2');
    assert.equal(preferences.level, 'A1');
    await api
      .get('/api/cards/' + cardId)
      .set(other())
      .expect(404);
    await api
      .delete('/api/cards/' + cardId)
      .set(other())
      .expect(404);
    assert.equal(
      (await api.get('/api/cards').set(other()).expect(200)).body.total,
      0,
    );
    assert.deepEqual((await api.get('/api/cards/collection').set(other()).expect(200)).body, { data: [], total: 0 });
  });
  await t.test('persists owner-scoped collection entries and never revives deleted imports', async () => {
    const endpoint = '/api/collection-entries';
    const entry = {
      id: randomUUID(),
      createdAt: '2026-01-02T03:04:05.000Z',
      kind: 'phrase',
      text: 'Take care',
      translation: 'Ehtiyot bo‘ling',
      example: 'Take care of yourself.',
      topic: 'Kundalik',
      progress: 30,
    };
    const { id, createdAt, ...draft } = entry;
    await api.get(endpoint).expect(401);
    await api.post(endpoint).set(auth()).send({ entries: [{ ...entry, progress: 101 }] }).expect(400);
    const added = await api.post(endpoint).set(auth()).send({ entries: [entry] }).expect(201);
    assert.deepEqual(added.body, [{ ...entry, pinned: false }]);
    const listing = await api.get(endpoint).set(auth()).expect('Cache-Control', 'no-store').expect(200);
    assert.deepEqual(listing.body, { data: [{ ...entry, pinned: false }], total: 1 });
    assert.deepEqual((await api.get(endpoint).set(other()).expect(200)).body, { data: [], total: 0 });
    await api.put(endpoint + '/' + id).set(other()).send(draft).expect(404);
    await api.delete(endpoint + '/' + id).set(other()).expect(204);
    const changed = { ...draft, text: 'Take great care', progress: 75 };
    assert.deepEqual(
      (await api.put(endpoint + '/' + id).set(auth()).send(changed).expect(200)).body,
      { id, createdAt, ...changed, pinned: false },
    );
    assert.deepEqual(
      (await api.post(endpoint).set(auth()).send({ entries: [entry] }).expect(201)).body,
      [{ id, createdAt, ...changed, pinned: false }],
    );
    const changePin = endpoint + '/pins/personal/' + id;
    const importPins = endpoint + '/pins/import';
    await api.put(changePin).set(other()).send({ pinned: true }).expect(404);
    await api.post(importPins).set(other()).send({ ids: [id] }).expect(204);
    const owned = async () => (await api.get(endpoint).set(auth()).expect(200)).body.data[0];
    assert.equal((await owned()).pinned, false);
    await api.post(importPins).set(auth()).send({ ids: [id] }).expect(204);
    assert.equal((await owned()).pinned, true);
    await api.put(changePin).set(auth()).send({ pinned: false }).expect(204);
    await api.post(importPins).set(auth()).send({ ids: [id] }).expect(204);
    assert.equal((await owned()).pinned, false);

    const catalogPin = endpoint + '/pins/card/' + cardId;
    await api.put(catalogPin).set(other()).send({ pinned: true }).expect(404);
    await api.put(catalogPin).set(auth()).send({ pinned: 'true' }).expect(400);
    await api.put(catalogPin).set(auth()).send({ pinned: true }).expect(204);
    assert.equal((await api.get('/api/cards/collection').set(auth()).expect(200)).body.data.find((item) => item.id === cardId).pinned, true);
    await api.put(catalogPin).set(auth()).send({ pinned: false }).expect(204);

    await api.delete(endpoint + '/' + id).set(auth()).expect(204);
    assert.deepEqual((await api.post(endpoint).set(auth()).send({ entries: [entry] }).expect(201)).body, []);
    assert.deepEqual((await api.get(endpoint).set(auth()).expect(200)).body, { data: [], total: 0 });
    const { rows: [tombstone] } = await pool.query(
      'SELECT text, translation, example, topic, progress, deleted_at IS NOT NULL AS deleted FROM collection_entries WHERE id=$1 AND user_id=$2',
      [id, userId],
    );
    assert.deepEqual(tombstone, { text: '', translation: '', example: '', topic: '', progress: 0, deleted: true });
  });
  await t.test('persists private social links and merges partial edits', async () => {
    const endpoint = '/api/users/me';
    const initial = (await api.get(endpoint).set(auth()).expect(200)).body;
    assert.ok(Number.isFinite(Date.parse(initial.createdAt)));
    assert.deepEqual(initial.socialLinks, {});

    const telegram = 'https://t.me/leximind-test';
    const instagram = 'https://www.instagram.com/leximind-test';
    await api.patch(endpoint).set(auth()).send({ socialLinks: { telegram, instagram } }).expect(200);
    await api.patch(endpoint).set(auth()).send({ socialLinks: { telegram: 'https://example.com/profile' } }).expect(400);
    await api.patch(endpoint).set(auth()).send({ socialLinks: { website: 'http://example.com' } }).expect(400);
    await api.patch(endpoint).set(auth()).send({ socialLinks: { unknown: 'https://example.com' } }).expect(400);

    const website = 'https://example.com/profile';
    await api.patch(endpoint).set(auth()).send({ socialLinks: { website, instagram: null } }).expect(200);
    const saved = (await api.get(endpoint).set(auth()).expect(200)).body;
    assert.deepEqual(saved.socialLinks, { telegram, website });
    assert.equal(saved.createdAt, initial.createdAt);
    assert.deepEqual((await api.get(endpoint).set(other()).expect(200)).body.socialLinks, {});
  });
  await t.test(
    'concurrent session start returns one active session',
    async () => {
      await api.get('/api/review-center').expect(401);
      const overview = (await api.get('/api/review-center').set(auth()).expect(200)).body;
      assert.equal(overview.newCards, 1);
      assert.equal(overview.session, null);
      assert.equal(overview.queues.today.count, 1);
      assert.deepEqual(overview.queues.new.first, { text: 'apple', cefrLevel: 'A1', topic: null });
      assert.equal(overview.queues.learning.count, 0);
      assert.deepEqual(overview.topics, [{ topic: null, total: 1, due: 1 }]);
      const otherOverview = (await api.get('/api/review-center').set(other()).expect(200)).body;
      assert.equal(otherOverview.activeCards, 0);
      assert.deepEqual(otherOverview.topics, []);
      assert.deepEqual(otherOverview.queues.today, { count: 0, first: null });
      await api.post('/api/sessions').set(auth()).send({ queue: 'invalid' }).expect(400);
      await api.post('/api/sessions').set(auth()).send({ queue: 'learning' }).expect(409);
      const responses = await Promise.all([
        api.post('/api/sessions').set(auth()).send({ queue: 'new', limit: 5 }),
        api.post('/api/sessions').set(auth()).send({}),
      ]);
      assert.deepEqual(
        responses.map((r) => r.status),
        [201, 201],
      );
      assert.equal(responses[0].body.id, responses[1].body.id);
      session = responses[0].body;
      assert.equal(session.tasks.length, 1);
      const activeOverview = (await api.get('/api/review-center').set(auth()).expect(200)).body;
      assert.equal(activeOverview.session.id, session.id);
      assert.equal(activeOverview.session.tasks[0].cefrLevel, 'A1');
      const taskPath =
        '/api/sessions/' + session.id + '/tasks/' + session.tasks[0].id;
      await api.get(taskPath).set(other()).expect(404);
      await api.get(taskPath).set(auth()).expect(200);
      const preview = (
        await api
          .get(taskPath + '/review-preview')
          .set(auth())
          .expect(200)
      ).body;
      assert.equal(preview.cardId, cardId);
      assert.deepEqual(preview.options.map((option) => option.rating).sort(), [
        'AGAIN',
        'EASY',
        'GOOD',
        'HARD',
      ]);
      assert.equal(
        (
          await api
            .get('/api/cards/' + cardId)
            .set(auth())
            .expect(200)
        ).body.reps,
        0,
      );
      await api
        .get('/api/sessions/' + session.id)
        .set(other())
        .expect(404);
      await api
        .post('/api/sessions/' + session.id + '/complete')
        .set(auth())
        .expect(409);
    },
  );
  await t.test(
    'rolls back scheduling when review-log persistence fails',
    async () => {
      await pool.query(
        "CREATE FUNCTION fail_review_insert() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'test rollback'; END $$; CREATE TRIGGER fail_review BEFORE INSERT ON review_logs FOR EACH ROW EXECUTE FUNCTION fail_review_insert()",
      );
      try {
        await api
          .post(
            '/api/sessions/' +
              session.id +
              '/tasks/' +
              session.tasks[0].id +
              '/review',
          )
          .set(auth())
          .send({ rating: 'GOOD', responseMs: 100 })
          .expect(500);
        assert.equal(
          (
            await api
              .get('/api/cards/' + cardId)
              .set(auth())
              .expect(200)
          ).body.reps,
          0,
        );
        assert.equal(
          (
            await api
              .get('/api/sessions/' + session.id)
              .set(auth())
              .expect(200)
          ).body.tasks[0].completed,
          false,
        );
      } finally {
        await pool.query(
          'DROP TRIGGER fail_review ON review_logs; DROP FUNCTION fail_review_insert()',
        );
      }
    },
  );
  await t.test(
    'concurrent review applies FSRS exactly once with atomic log',
    async () => {
      const endpoint =
        '/api/sessions/' +
        session.id +
        '/tasks/' +
        session.tasks[0].id +
        '/review';
      const r = await Promise.all([
        api
          .post(endpoint)
          .set(auth())
          .send({ rating: 'GOOD', responseMs: 1200 }),
        api
          .post(endpoint)
          .set(auth())
          .send({ rating: 'GOOD', responseMs: 1200 }),
      ]);
      assert.deepEqual(r.map((x) => x.status).sort(), [200, 409]);
      const c = (
        await api
          .get('/api/cards/' + cardId)
          .set(auth())
          .expect(200)
      ).body;
      assert.equal(c.reps, 1);
      assert.ok(c.stability > 0);
      assert.ok(c.lastReviewedAt);
      assert.ok(Math.abs(Date.parse(c.lastReviewedAt) - Date.now()) < 30_000);
      assert.ok(new Date(c.due) > new Date(c.lastReviewedAt));
      const { body: collection } = await api.get('/api/cards/collection').set(auth()).expect(200);
      assert.equal(collection.data[0].progress, 100);
      assert.equal(
        (
          await pool.query(
            'SELECT count(*)::integer AS n FROM review_logs WHERE card_id=$1',
            [cardId],
          )
        ).rows[0].n,
        1,
      );
    },
  );
  await t.test(
    'completion is idempotent and updates streak and statistics',
    async () => {
      await api
        .post('/api/sessions/' + session.id + '/complete')
        .set(auth())
        .expect(200);
      await api
        .post('/api/sessions/' + session.id + '/complete')
        .set(auth())
        .expect(200);
      assert.equal(
        (await api.get('/api/profile').set(auth()).expect(200)).body.streakDay,
        1,
      );
      const stats = (await api.get('/api/statistics').set(auth()).expect(200))
        .body;
      assert.equal(stats.reviews, 1);
      assert.equal(stats.sessions, 1);
      assert.equal(stats.learnedWords, 1);
      assert.equal(stats.accuracy, 100);
      assert.ok(Number.isInteger(stats.studyMinutes) && stats.studyMinutes >= 0);
      const { rows: historical } = await pool.query(
        `INSERT INTO sessions(user_id,status,started_at,ended_at)
         SELECT $1,'completed',(now() AT TIME ZONE 'UTC') - n * interval '1 day' - interval '5 minutes',
                (now() AT TIME ZONE 'UTC') - n * interval '1 day'
         FROM generate_series(3,5) AS days(n) RETURNING id`,
        [userId],
      );
      try {
        const { body: plan } = await api.get('/api/study-plan').set(auth()).expect(200);
        assert.equal(plan.activity.currentStreak, 1);
        assert.equal(plan.activity.longestStreak, 3);
        assert.equal(new Date(plan.activity.weekStart + 'T12:00:00Z').getUTCDay(), 1);
        assert.ok(plan.activity.completedDays.every((day) =>
          plan.activity.weekStart <= day && day <= plan.activity.today));
        assert.ok(Number.isInteger(plan.activity.studyMinutesToday) && plan.activity.studyMinutesToday >= 0);
        await api.get('/api/statistics/analytics').expect(401);
        const analytics = (await api.get('/api/statistics/analytics').set(auth()).expect(200)).body;
        assert.equal(analytics.today, plan.activity.today);
        assert.equal(analytics.totalXp, 10);
        assert.equal(analytics.activeWords, 1);
        assert.equal(analytics.accuracy, 100);
        assert.deepEqual(analytics.skills, { vocabulary: 100 });
        assert.equal(analytics.weeks.length, 12);
        assert.equal(analytics.weeks.at(-1).date, plan.activity.weekStart);
        assert.equal(analytics.weeks.at(-1).newWords, 1);
        assert.equal(analytics.days.length, 84);
        assert.equal(analytics.months.length, 6);
        assert.equal(analytics.days.filter(({ studySeconds }) => studySeconds === 300).length, 3);
        assert.ok(analytics.studySeconds >= 900);
        const otherAnalytics = (await api.get('/api/statistics/analytics').set(other()).expect(200)).body;
        assert.equal(otherAnalytics.totalXp, 0);
        assert.equal(otherAnalytics.accuracy, null);
        assert.deepEqual(otherAnalytics.skills, {});
        await api.get('/api/learning-calendar').expect(401);
        await api.get('/api/learning-calendar?month=2026-13').set(auth()).expect(400);
        const calendar = (await api.get('/api/learning-calendar').set(auth()).expect(200)).body;
        assert.equal(calendar.today, plan.activity.today);
        assert.equal(calendar.monthStart, calendar.today.slice(0, 7) + '-01');
        const today = calendar.days.find(({ date }) => date === calendar.today);
        assert.equal(today.active, true);
        assert.equal(today.sessions, 1);
        assert.equal(today.newWords, 1);
        assert.equal(today.xp, 10);
        const otherCalendar = (await api.get('/api/learning-calendar').set(other()).expect(200)).body;
        assert.ok(otherCalendar.days.every(({ active }) => !active));
        const leapCalendar = (await api.get('/api/learning-calendar?month=2024-02').set(auth()).expect(200)).body;
        assert.equal(leapCalendar.monthStart, '2024-02-01');
        assert.equal(leapCalendar.days.length, 29);
        assert.equal(leapCalendar.days.at(-1).date, '2024-02-29');
        await api.get('/api/achievements').expect(401);
        const achievements = (await api.get('/api/achievements').set(auth()).expect(200)).body;
        assert.equal(achievements.length, 12);
        const byId = new Map(achievements.map((item) => [item.id, item]));
        assert.equal(byId.get('first-step').rewardXp, 50);
        assert.equal(byId.get('perfect-session').earnedOn, calendar.today);
        assert.equal(byId.get('streak-30').progress, 3);
        assert.equal(byId.get('streak-30').earnedOn, null);
        assert.equal(byId.get('words-1000').progress, 1);
        assert.equal(byId.get('social').progress, 0);
        const otherAchievements = (await api.get('/api/achievements').set(other()).expect(200)).body;
        assert.ok(otherAchievements.every(({ earnedOn }) => earnedOn === null));
      } finally {
        await pool.query('DELETE FROM sessions WHERE user_id=$1 AND id=ANY($2::uuid[])',
          [userId, historical.map(({ id }) => id)]);
      }
      assert.equal(
        (await api.get('/api/reviews').set(auth()).expect(200)).body.total,
        1,
      );
    },
  );
  await t.test(
    'assessment hides answers and scores on server exactly once',
    async () => {
      const c = (await api.post('/api/assessments').set(auth()).expect(201))
        .body;
      assert.equal(c.payload.questions.length, 18);
      assert.equal(c.answers, undefined);
      await api
        .post('/api/assessments/' + c.id + '/submit')
        .set(other())
        .send({ answers: Array(18).fill('') })
        .expect(404);
      const { rows } = await pool.query(
        'SELECT answers FROM challenges WHERE id=$1',
        [c.id],
      );
      const endpoint = '/api/assessments/' + c.id + '/submit';
      const results = await Promise.all([
        api.post(endpoint).set(auth()).send({ answers: rows[0].answers }),
        api.post(endpoint).set(auth()).send({ answers: rows[0].answers }),
      ]);
      assert.deepEqual(results.map((x) => x.status).sort(), [200, 409]);
      assert.equal(
        results.find((x) => x.status === 200).body.resultingLevel,
        'C2',
      );
      assert.equal(
        (await api.get('/api/profile').set(auth()).expect(200)).body.level,
        'C2',
      );
      const levelAward = (await api.get('/api/achievements').set(auth()).expect(200)).body
        .find(({ id }) => id === 'level-b2');
      assert.equal(levelAward.progress, 6);
      assert.match(levelAward.earnedOn, /^\d{4}-\d{2}-\d{2}$/);
    },
  );
  await t.test(
    'all five game types score answers and persist history',
    async () => {
      for (const kind of [
        'word_span',
        'sequence_memory',
        'meaning_match',
        'visual_grid',
        'word_rush',
      ]) {
        const c = (
          await api
            .post('/api/games')
            .set(auth())
            .send({ gameType: kind })
            .expect(201)
        ).body;
        const { rows } = await pool.query(
          'SELECT answers FROM challenges WHERE id=$1',
          [c.id],
        );
        const r = await api
          .post('/api/games/' + c.id + '/submit')
          .set(auth())
          .send({ answers: rows[0].answers })
          .expect(200);
        assert.equal(r.body.score, r.body.totalQuestion * 10);
      }
      assert.equal(
        (await api.get('/api/games').set(auth()).expect(200)).body.total,
        5,
      );
    },
  );
  await t.test('expired challenge cannot produce a score', async () => {
    const c = (
      await api
        .post('/api/games')
        .set(auth())
        .send({ gameType: 'sequence_memory' })
        .expect(201)
    ).body;
    await pool.query(
      "UPDATE challenges SET expires_at=now()-interval '1 minute' WHERE id=$1",
      [c.id],
    );
    await api
      .post('/api/games/' + c.id + '/submit')
      .set(auth())
      .send({ answers: c.payload.stimulus })
      .expect(409);
  });
  await t.test(
    'serves private review, assessment and game records by ID',
    async () => {
      for (const [path, total] of [
        ['/api/reviews', 1],
        ['/api/assessment-results', 1],
        ['/api/game-scores', 5],
      ]) {
        const history = (await api.get(path).set(auth()).expect(200)).body;
        assert.equal(history.total, total);
        const id = history.data[0].id;
        await api
          .get(path + '/' + id)
          .set(auth())
          .expect(200);
        await api
          .get(path + '/' + id)
          .set(other())
          .expect(404);
      }
    },
  );
  await t.test(
    'cancels a session, pauses its card and preserves learning history',
    async () => {
      const cardPath = '/api/cards/' + cardId;
      await api.patch(cardPath).set(other()).send({ paused: true }).expect(404);
      await api.delete(cardPath).set(auth()).expect(409);
      await api
        .delete('/api/words/' + wordId)
        .set(auth())
        .expect(409);

      const { rows } = await pool.query(
        'SELECT id FROM words WHERE id<>$1 LIMIT 1',
        [wordId],
      );
      const queued = (
        await api
          .post('/api/cards')
          .set(auth())
          .send({ wordId: rows[0].id })
          .expect(201)
      ).body;
      const queuedPath = '/api/cards/' + queued.id;
      const path =
        '/api/sessions/' +
        (await api.post('/api/sessions').set(auth()).send({}).expect(201)).body
          .id;
      await api
        .patch(queuedPath)
        .set(auth())
        .send({ paused: true })
        .expect(409);
      const active = (await api.get('/api/study-plan').set(auth()).expect(200))
        .body;
      assert.equal(active.nextAction, 'RESUME_SESSION');
      assert.equal(active.forecast.length, 7);
      assert.equal(active.dueNow, 1);
      await api
        .post(path + '/cancel')
        .set(other())
        .expect(404);
      const cancelled = (
        await api
          .post(path + '/cancel')
          .set(auth())
          .expect(200)
      ).body;
      assert.equal(cancelled.status, 'cancelled');
      const repeated = (
        await api
          .post(path + '/cancel')
          .set(auth())
          .expect(200)
      ).body;
      assert.equal(repeated.endedAt, cancelled.endedAt);
      const historyPath = '/api/sessions?status=cancelled&limit=1';
      const { body: filtered } = await api.get(historyPath).set(auth()).expect(200);
      assert.equal(filtered.total, 1);
      assert.deepEqual(filtered.data.map(({ id }) => id), [cancelled.id]);
      const { body: nextPage } = await api.get(historyPath + '&page=2').set(auth()).expect(200);
      assert.deepEqual(nextPage, { total: 1, data: [] });
      const { body: otherHistory } = await api.get(historyPath).set(other()).expect(200);
      assert.deepEqual(otherHistory, { total: 0, data: [] });
      await api.get('/api/sessions?status=unknown').set(auth()).expect(400);
      await api
        .post(path + '/complete')
        .set(auth())
        .expect(409);
      assert.ok(
        (
          await api
            .patch(queuedPath)
            .set(auth())
            .send({ paused: true })
            .expect(200)
        ).body.pausedAt,
      );
      assert.equal(
        (await api.get('/api/cards/due').set(auth()).expect(200)).body.total,
        0,
      );
      await api.post('/api/sessions').set(auth()).send({}).expect(409);
      assert.equal(
        (await api.get('/api/study-plan').set(auth()).expect(200)).body
          .nextAction,
        'CAUGHT_UP',
      );
      assert.equal(
        (
          await api
            .patch(queuedPath)
            .set(auth())
            .send({ paused: false })
            .expect(200)
        ).body.pausedAt,
        null,
      );
      assert.equal(
        (await api.get('/api/study-plan').set(auth()).expect(200)).body
          .nextAction,
        'START_SESSION',
      );
      const updatedProfile = await api
        .patch('/api/profile')
        .set(auth())
        .send({ dailyNewWords: 1 })
        .expect(200);
      assert.equal(updatedProfile.body.timezone, 'Asia/Tashkent');
      const limited = (await api.get('/api/study-plan').set(auth()).expect(200))
        .body;
      assert.equal(limited.dailyNewReviewed, 1);
      assert.equal(limited.availableNow, 0);
      assert.equal(limited.nextAction, 'DAILY_NEW_LIMIT_REACHED');
      await api.post('/api/sessions').set(auth()).send({}).expect(409);
      assert.equal(
        (await api.get('/api/reviews').set(auth()).expect(200)).body.total,
        1,
      );
    },
  );
  await t.test(
    'generates Easy Vocabulary-inspired prompts and keeps answers server-side',
    async () => {
      for (const gameType of [
        'type_word',
        'finish_sentence',
        'build_sentence',
        'word_dictation',
      ]) {
        const round = (
          await api
            .post('/api/games')
            .set(auth())
            .send({ gameType })
            .expect(201)
        ).body;
        assert.ok(round.payload.questions.length);
        assert.equal(round.payload.wordIds, undefined);
        const question = round.payload.questions[0];
        if (gameType === 'finish_sentence')
          assert.match(question.prompt, /____/);
        if (gameType === 'build_sentence')
          assert.equal(question.input, 'tokens');
        if (gameType === 'word_dictation')
          assert.equal(question.audioUrl, 'https://example.com/apple.mp3');
        assert.equal(round.answers, undefined);
      }
    },
  );

  await t.test(
    'plays error-specific feedback once and clears a recovered word',
    async () => {
      await pool.query('DELETE FROM rate_limits');
      const round = (
        await api
          .post('/api/games')
          .set(auth())
          .send({ gameType: 'finish_sentence' })
          .expect(201)
      ).body;
      const path = '/api/games/' + round.id + '/attempts';
      await api
        .post(path)
        .set(other())
        .send({ index: 0, answer: 'apple' })
        .expect(404);
      assert.equal(
        (await api.get('/api/profile').set(auth()).expect(200)).body
          .feedbackAudioEnabled,
        true,
      );
      const requests = await Promise.all([
        api.post(path).set(auth()).send({ index: 0, answer: 'appel' }),
        api.post(path).set(auth()).send({ index: 0, answer: 'appel' }),
      ]);
      assert.deepEqual(
        requests.map((response) => response.status),
        [200, 200],
      );
      const first = requests.find((response) => !response.body.replayed).body;
      const duplicate = requests.find(
        (response) => response.body.replayed,
      ).body;
      assert.equal(first.expectedAnswer, 'apple');
      assert.equal(first.feedback.mistake, 'typo');
      assert.match(first.sound.url, /^\/api\/feedback-audio\/(bruh|dexter)\.wav\?v=4$/);
      assert.equal(duplicate.sound, undefined);
      assert.equal(duplicate.result.score, 0);
      await api.get('/api/mistakes-notebook').expect(401);
      await api.get('/api/mistakes-notebook?onlyOpen=invalid').set(auth()).expect(400);
      const { body: notebook } = await api.get('/api/mistakes-notebook?category=grammar&onlyOpen=true')
        .set(auth()).expect('Cache-Control', 'no-store').expect(200);
      const matching = notebook.data.filter(({ submittedAnswer }) => submittedAnswer === 'appel');
      assert.equal(matching.length, 1);
      const [mistake] = matching;
      assert.equal(mistake.expectedAnswer, 'apple');
      assert.equal(mistake.resolvedAt, null);
      const mistakePath = '/api/mistakes-notebook/' + mistake.id;
      assert.equal((await api.get('/api/mistakes-notebook').set(other()).expect(200)).body.total, 0);
      await api.patch(mistakePath).set(other()).send({ resolved: true }).expect(404);
      await api.post(mistakePath + '/retry').set(other()).send({ answer: 'apple' }).expect(404);
      assert.deepEqual((await api.post(mistakePath + '/retry').set(auth()).send({ answer: 'appel' }).expect(200)).body,
        { correct: false, resolvedAt: null });
      assert.ok((await api.patch(mistakePath).set(auth()).send({ resolved: true }).expect(200)).body.resolvedAt);
      assert.equal((await api.get('/api/mistakes-notebook?onlyOpen=true').set(auth()).expect(200)).body.data
        .some(({ id }) => id === mistake.id), false);
      assert.equal((await api.patch(mistakePath).set(auth()).send({ resolved: false }).expect(200)).body.resolvedAt, null);
      const { body: retried } = await api.post(mistakePath + '/retry').set(auth()).send({ answer: 'Apple' }).expect(200);
      assert.equal(retried.correct, true);
      assert.ok(retried.resolvedAt);
      assert.equal(
        (
          await pool.query(
            'SELECT misses FROM game_mistakes WHERE user_id=$1 AND word_id=$2',
            [userId, wordId],
          )
        ).rows[0].misses,
        1,
      );
      await api
        .post('/api/games')
        .set(other())
        .send({ gameType: 'mistake_words' })
        .expect(409);
      const successRound = (
        await api
          .post('/api/games')
          .set(auth())
          .send({ gameType: 'finish_sentence' })
          .expect(201)
      ).body;
      const success = (
        await api
          .post('/api/games/' + successRound.id + '/attempts')
          .set(auth())
          .send({ index: 0, answer: 'apple' })
          .expect(200)
      ).body;
      assert.equal(success.feedback.correct, true);
      assert.deepEqual(success.sound, {
        id: 'encourage',
        url: '/api/feedback-audio/encourage.wav?v=4',
      });
      const practice = (
        await api
          .post('/api/games')
          .set(auth())
          .send({ gameType: 'mistake_words' })
          .expect(201)
      ).body;
      const recovered = (
        await api
          .post('/api/games/' + practice.id + '/attempts')
          .set(auth())
          .send({ index: 0, answer: 'apple' })
          .expect(200)
      ).body;
      assert.equal(recovered.sound.id, 'romanceeeeeeeeeeeeee');
      assert.equal(recovered.result.score, 10);
      await api
        .post('/api/games')
        .set(auth())
        .send({ gameType: 'mistake_words' })
        .expect(409);
      const { body: translationRound } = await api
        .post('/api/games').set(auth()).send({ gameType: 'meaning_match' }).expect(201);
      const { rows: [{ answers }] } = await pool.query(
        'SELECT answers FROM challenges WHERE id=$1', [translationRound.id],
      );
      const translationAttempts = '/api/games/' + translationRound.id + '/attempts';
      const optionAt = (index) => translationRound.payload.questions[index].options
        .find((option) => option !== answers[index]);
      const { body: firstWrong } = await api.post(translationAttempts).set(auth())
        .send({ index: 0, answer: optionAt(0) }).expect(200);
      const { body: secondWrong } = await api.post(translationAttempts).set(auth())
        .send({ index: 1, answer: optionAt(1) }).expect(200);
      assert.ok(['faah', 'bruh', 'shocked'].includes(firstWrong.sound.id));
      assert.ok(['black-suit-spider-man', 'shocked', 'chicken-on-tree-screaming'].includes(secondWrong.sound.id));
      assert.notEqual(firstWrong.sound.id, secondWrong.sound.id);
      await api
        .patch('/api/profile')
        .set(auth())
        .send({ feedbackAudioEnabled: false })
        .expect(200);
      const mutedRound = (
        await api
          .post('/api/games')
          .set(auth())
          .send({ gameType: 'type_word' })
          .expect(201)
      ).body;
      const mutedPath = '/api/games/' + mutedRound.id + '/attempts';
      await api
        .post(mutedPath)
        .set(auth())
        .send({ index: 1, answer: 'x' })
        .expect(409);
      const muted = (
        await api
          .post(mutedPath)
          .set(auth())
          .send({ index: 0, answer: '' })
          .expect(200)
      ).body;
      assert.equal(muted.feedback.mistake, 'skipped');
      assert.equal(muted.sound, undefined);
      assert.equal(muted.result, null);
      const resumed = (
        await api
          .get('/api/games/' + mutedRound.id)
          .set(auth())
          .expect(200)
      ).body;
      assert.equal(resumed.nextIndex, 1);
      assert.equal(resumed.attempts[0].mistake, 'skipped');
      assert.equal(resumed.payload.wordIds, undefined);
      const { rows: [partialMistake] } = await pool.query(
        'SELECT id,reason,submitted_answer FROM mistake_notebook_entries WHERE challenge_id=$1', [mutedRound.id]);
      assert.equal(partialMistake.reason, 'skipped');
      assert.equal(partialMistake.submitted_answer, '');
      await pool.query('DELETE FROM challenges WHERE id=$1', [mutedRound.id]);
      assert.equal((await api.get('/api/mistakes-notebook?category=spelling').set(auth()).expect(200)).body.data
        .some(({ id }) => id === partialMistake.id), true);
    },
  );

  await t.test(
    'serves every configured feedback sound and matches its manifest checksum',
    async () => {
      const { soundIds } = require('../dist/src/domain/entities/GameFeedback');
      const manifest = require('../assets/feedback-audio/sources.json');
      const files = readdirSync(
        join(__dirname, '..', 'assets', 'feedback-audio'),
      )
        .filter((file) => file.endsWith('.wav'))
        .map((file) => file.slice(0, -4))
        .sort();
      assert.deepEqual(files, Object.keys(manifest).sort());
      assert.deepEqual(files, [...soundIds].sort());
      for (const id of soundIds) {
        const response = await api
          .get('/api/feedback-audio/' + id + '.wav')
          .buffer(true)
          .parse((stream, callback) => {
            const chunks = [];
            stream.on('data', (chunk) => chunks.push(chunk));
            stream.on('end', () => callback(null, Buffer.concat(chunks)));
            stream.on('error', callback);
          })
          .expect(200);
        const wav = response.body;
        assert.equal(
          createHash('sha256').update(wav).digest('hex'),
          manifest[id].sha256,
        );
        assert.match(response.headers['content-type'], /audio\/(?:x-)?wav/);
        assert.equal(wav.toString('ascii', 0, 4), 'RIFF');
        assert.equal(wav.readUInt16LE(20), 1);
        assert.equal(wav.readUInt32LE(24), 48000);
        assert.equal(wav.readUInt16LE(34), 16);
        assert.equal(wav.readUInt32LE(40), wav.length - 44);
        const seconds = wav.readUInt32LE(40) / wav.readUInt32LE(28);
        assert.ok(
          seconds > 0 && seconds <= 5.5,
          id + ' is at most 5.5 seconds',
        );
        assert.equal(Number(seconds.toFixed(3)), manifest[id].durationSeconds);
        if (manifest[id].clipLimitSeconds)
          assert.equal(
            wav.readInt16LE(wav.length - 2),
            0,
            id + ' fades to zero',
          );
        let peak = 0;
        for (let index = 44; index < wav.length; index += 2)
          peak = Math.max(peak, Math.abs(wav.readInt16LE(index)));
        assert.ok(peak > 1_000 && peak < 23_000, id + ' has audible headroom');
      }
      await api
        .get('/api/feedback-audio/bruh.wav')
        .set('Range', 'bytes=0-43')
        .expect(206);
      await api.get('/api/feedback-audio/unknown.wav').expect(404);
      for (const id of ['spider', 'chicken', 'vine-boom', 'patrick-jane']) {
        await api.get('/api/feedback-audio/' + id + '.wav').expect(404);
      }
      await api
        .get('/api/feedback-audio/bruh.wav')
        .set('Range', 'bytes=999999999-')
        .expect('Content-Type', /application\/json/)
        .expect('Cache-Control', 'no-store')
        .expect(416);
    },
  );

  await t.test(
    'completes account, catalog, bulk card and learning history routes',
    async () => {
      await api.patch('/api/users/me').set(auth())
        .send({ email: 'renamed@example.com' }).expect(400);
      await api.patch('/api/users/me').set(auth())
        .send({ email: 'renamed@example.com', currentPassword: 'wrong' }).expect(400);
      const responses = await Promise.all([
        api
          .patch('/api/users/me')
          .set(auth())
          .send({ fullName: 'Renamed Learner' }),
        api
          .patch('/api/users/me')
          .set(auth())
          .send({ email: 'renamed@example.com', currentPassword: password }),
      ]);
      assert.deepEqual(
        responses.map((response) => response.status),
        [200, 200],
      );
      const updated = (
        await api
          .get('/api/users/' + userId)
          .set(auth())
          .expect(200)
      ).body;
      assert.equal(updated.fullName, 'Renamed Learner');
      assert.equal(updated.email, 'renamed@example.com');
      const users = (
        await api.get('/api/users?page=1&limit=1').set(auth()).expect(200)
      ).body;
      assert.equal(users.data.length, 1);
      assert.ok(users.total >= 2);

      const word = (
        await api
          .post('/api/words')
          .set(auth())
          .send({
            text: 'temporary practice',
            cefrLevel: 'A2',
            sense: [
              {
                definition: 'A short exercise',
                exampleSentence: 'Try some temporary practice.',
                translationUz: 'vaqtinchalik mashq',
                orderIndex: 0,
              },
            ],
          })
          .expect(201)
      ).body;
      await api
        .get('/api/words/' + word.id)
        .set(auth())
        .expect(200);
      await api
        .post('/api/cards/bulk')
        .set(auth())
        .send({ wordIds: [word.id] })
        .expect(201);
      const cards = (
        await api
          .get('/api/cards?wordId=' + word.id)
          .set(auth())
          .expect(200)
      ).body;
      assert.equal(cards.data.length, 1);
      await api
        .delete('/api/cards/' + cards.data[0].id)
        .set(auth())
        .expect(204);
      await api
        .delete('/api/words/' + word.id)
        .set(auth())
        .expect(204);
      await api
        .get('/api/words/' + word.id)
        .set(auth())
        .expect(404);
      assert.ok(
        (await api.get('/api/sessions').set(auth()).expect(200)).body.total >=
          2,
      );
      assert.equal(
        (await api.get('/api/assessments').set(auth()).expect(200)).body.total,
        1,
      );
    },
  );

  await t.test('password change revokes all active sessions', async () => {
    await api
      .patch('/api/users/me/password')
      .set(other())
      .send({
        currentPassword: 'wrong-password',
        newPassword: 'Change8!',
      })
      .expect(400);
    await api
      .patch('/api/users/me/password')
      .set(other())
      .send({
        currentPassword: password,
        newPassword: 'Change8!',
      })
      .expect(200);
    await api.get('/api/users/me').set(other()).expect(401);
    otherToken = (
      await api
        .post('/api/auth/login')
        .send({
          email: 'other@example.com',
          password: 'Change8!',
        })
        .expect(200)
    ).body.accessToken;
  });
  await t.test('logout invalidates bearer token immediately', async () => {
    await api.post('/api/auth/logout').set(other()).expect(204);
    await api.get('/api/users/me').set(other()).expect(401);
  });
  await t.test('shared throttling blocks repeated bad logins', async () => {
    await pool.query('DELETE FROM rate_limits');
    for (let i = 0; i < 10; i++)
      await api
        .post('/api/auth/login')
        .set('X-Forwarded-For', '192.0.2.' + (i + 1))
        .send({ email: 'absent@example.com', password: 'wrong' })
        .expect(401);
    await api
      .post('/api/auth/login')
      .set('X-Forwarded-For', '192.0.2.250')
      .send({ email: 'absent@example.com', password: 'wrong' })
      .expect(429);
  });
  await t.test('filters catalog and plays sentence dictation', async () => {
    const created = (
      await api
        .post('/api/words')
        .set(auth())
        .send({
          text: 'cucumber',
          cefrLevel: 'A1',
          topic: 'food',
          sense: [
            {
              orderIndex: 0,
              definition: 'a green vegetable',
              translationUz: 'bodring',
              exampleSentence: 'Please slice the cucumber.',
              exampleAudioUrl: 'https://example.com/sentence.wav',
            },
          ],
        })
        .expect(201)
    ).body;
    assert.equal(created.topic, 'food');
    const words = (
      await api
        .get('/api/words?topic=food&cefrLevel=A1')
        .set(auth())
        .expect(200)
    ).body;
    assert.deepEqual(
      words.data.map((word) => word.id),
      [created.id],
    );
    const first = (await api.get('/api/words?limit=1').set(auth()).expect(200))
      .body;
    const next = (
      await api
        .get('/api/words?limit=1&after=' + first.nextCursor)
        .set(auth())
        .expect(200)
    ).body;
    assert.notEqual(first.data[0].id, next.data[0].id);
    await pool.query('DELETE FROM rate_limits');
    const beforeDictation = (await api.get('/api/statistics/analytics').set(auth()).expect(200)).body;
    const round = (
      await api
        .post('/api/games')
        .set(auth())
        .send({
          gameType: 'sentence_dictation',
          topic: 'food',
          cefrLevel: 'A1',
        })
        .expect(201)
    ).body;
    assert.equal(
      round.payload.questions[0].audioUrl,
      'https://example.com/sentence.wav',
    );
    const result = (
      await api
        .post('/api/games/' + round.id + '/submit')
        .set(auth())
        .send({ answers: ['Please slice the cucumber'] })
        .expect(200)
    ).body;
    assert.equal(result.correctCount, 1);
    const afterDictation = (await api.get('/api/statistics/analytics').set(auth()).expect(200)).body;
    assert.equal(afterDictation.totalXp, beforeDictation.totalXp + result.score);
    assert.equal(afterDictation.skills.listening, 100);
    await api.get('/api/topics').expect(401);
    const topics = (await api.get('/api/topics').set(auth()).expect(200)).body;
    assert.deepEqual(topics.find(({ topic }) => topic === 'food'), { topic: 'food', total: 1, learned: 1, cefrLevel: 'A1' });
    const topicPractice = (await api.post('/api/games').set(auth())
      .send({ gameType: 'type_word', topic: 'food' }).expect(201)).body;
    assert.deepEqual(topicPractice.payload.questions.map(({ prompt }) => prompt), ['bodring']);
    const plan = (await api.get('/api/study-plan').set(auth()).expect(200)).body;
    assert.ok(plan.activity.gameKindsToday.includes('sentence_dictation'));
    const learner = (await api.post('/api/auth/login')
      .send({ email: 'other@example.com', password: 'Change8!' }).expect(200)).body;
    const otherPlan = (await api.get('/api/study-plan')
      .set('Authorization', 'Bearer ' + learner.accessToken).expect(200)).body;
    assert.ok(!otherPlan.activity.gameKindsToday.includes('sentence_dictation'));
    const otherTopics = (await api.get('/api/topics')
      .set('Authorization', 'Bearer ' + learner.accessToken).expect(200)).body;
    assert.equal(otherTopics.find(({ topic }) => topic === 'food').learned, 0);
  });

  await t.test(
    'verifies email and resets a password with single use tokens',
    async () => {
      const current = (await api.get('/api/users/me').set(auth()).expect(200))
        .body;
      const details = {
        bio: 'I learn English every day.',
        location: 'Toshkent',
        gender: 'other',
        phoneNumber: '+998901234567',
      };
      await api.patch('/api/users/me').set(auth())
        .send({ phoneNumber: 'abc' }).expect(400);
      const saved = (await api.patch('/api/users/me').set(auth())
        .send(details).expect(200)).body;
      for (const key of Object.keys(details)) assert.equal(saved[key], details[key]);
      assert.equal(saved.hasProfileBadge, false);
      await api
        .post('/api/auth/email-verification/request')
        .send({ email: 'absent@example.com' })
        .expect(202);
      await emailWorker.flush();
      assert.equal(sentAccountEmails.length, 0);
      await api
        .post('/api/auth/email-verification/request')
        .send({ email: current.email })
        .expect(202);
      await emailWorker.flush();
      const verification = sentAccountEmails.find(
        (mail) => mail.kind === 'verify_email',
      );
      await api
        .post('/api/auth/email-verification/confirm')
        .send({ token: verification.token })
        .expect(204);
      await api
        .post('/api/auth/email-verification/confirm')
        .send({ token: verification.token })
        .expect(400);
      assert.ok(
        (await api.get('/api/users/me').set(auth()).expect(200)).body
          .emailVerifiedAt,
      );
      const verified = (await api.get('/api/users/me').set(auth()).expect(200)).body;
      assert.equal(verified.hasProfileBadge, true);
      const incomplete = (await api.patch('/api/users/me').set(auth())
        .send({ gender: 'undisclosed' }).expect(200)).body;
      assert.equal(incomplete.hasProfileBadge, false);
      const restored = (await api.patch('/api/users/me').set(auth())
        .send({ gender: details.gender }).expect(200)).body;
      assert.equal(restored.hasProfileBadge, true);
      await api
        .post('/api/auth/password-reset/request')
        .send({ email: current.email })
        .expect(202);
      await emailWorker.flush();
      const reset = sentAccountEmails.find(
        (mail) => mail.kind === 'reset_password',
      );
      const password = 'Reset88!';
      await api
        .post('/api/auth/password-reset/confirm')
        .send({ token: reset.token, password })
        .expect(204);
      await api
        .post('/api/auth/password-reset/confirm')
        .send({ token: reset.token, password })
        .expect(400);
      await api.get('/api/users/me').set(auth()).expect(401);
      token = (
        await api
          .post('/api/auth/login')
          .send({ email: current.email, password })
          .expect(200)
      ).body.accessToken;
    },
  );

  await t.test('confirms account actions with expiring single-use email codes', async () => {
    await pool.query('DELETE FROM rate_limits');
    const email = 'otp-learner@example.com';
    const login = { email, password: 'Original8!' };
    await api.post('/api/auth/register').send({ ...login, fullName: 'Email code learner' }).expect(201);
    const { accessToken } = (await api.post('/api/auth/login').send(login).expect(200)).body;
    const account = { Authorization: 'Bearer ' + accessToken };
    const verifyRoute = '/api/auth/email-verification';
    const resetRoute = '/api/auth/password-reset';
    const mails = (kind) => sentAccountEmails.filter((mail) => mail.email === email && mail.kind === kind);

    await api.post(verifyRoute + '/request').send({ email }).expect(202);
    await api.post(verifyRoute + '/request').send({ email }).expect(202);
    await emailWorker.flush();
    assert.equal(mails('verify_email').length, 1);
    const [verification] = mails('verify_email');
    assert.match(verification.code, /^[0-9]{6}$/);
    const wrong = verification.code === '000000' ? '000001' : '000000';
    for (let i = 0; i < 5; i += 1) {
      await api.post(verifyRoute + '/confirm-code').send({ email, code: wrong }).expect(400);
    }
    await api.post(verifyRoute + '/confirm-code').send({ email, code: verification.code }).expect(400);
    assert.equal((await api.get('/api/users/me').set(account).expect(200)).body.emailVerifiedAt, null);
    await pool.query(
      "UPDATE account_actions SET otp_expires_at=now()-interval '1 second' WHERE email=$1 AND kind='verify_email'",
      [email],
    );
    await api.post(verifyRoute + '/request').send({ email }).expect(202);
    await emailWorker.flush();
    const fresh = mails('verify_email')[1];
    await api.post(verifyRoute + '/confirm-code').send({ email: email.toUpperCase(), code: fresh.code }).expect(204);
    await api.post(verifyRoute + '/confirm').send({ token: fresh.token }).expect(400);
    assert.ok((await api.get('/api/users/me').set(account).expect(200)).body.emailVerifiedAt);

    await api.post(resetRoute + '/request').send({ email }).expect(202);
    await emailWorker.flush();
    const [reset] = mails('reset_password');
    assert.match(reset.code, /^[0-9]{6}$/);
    const body = { email, code: reset.code, password: 'Changed88!' };
    await api.post(resetRoute + '/confirm-code').send(body).expect(204);
    await api.post(resetRoute + '/confirm-code').send(body).expect(400);
    await api.post(resetRoute + '/confirm').send({ token: reset.token, password: body.password }).expect(400);
    await api.get('/api/users/me').set(account).expect(401);
    await api.post('/api/auth/login').send({ email, password: body.password }).expect(200);
  });

  await t.test('exposes route-template metrics to admins', async () => {
    await api.get('/api/ops/metrics').expect(401);
    const response = await api.get('/api/ops/metrics').set(auth()).expect(200);
    assert.match(
      response.text,
      /leximind_http_request_duration_seconds_bucket/,
    );
    assert.ok(!response.text.includes(userId));
  });

  await t.test('lists and revokes only the caller’s device sessions', async () => {
    await api.get('/api/auth/sessions').expect(401);
    otherToken = (await api.post('/api/auth/login')
      .send({ email: 'other@example.com', password: 'Change8!' }).expect(200)).body.accessToken;
    const { email } = (await api.get('/api/users/me').set(auth()).expect(200)).body;
    const agent = 'Mozilla/5.0 (Windows NT 10.0) Chrome/132.0';
    const second = (await api.post('/api/auth/login').set('User-Agent', agent)
      .send({ email, password: 'Reset88!' }).expect(200)).body;
    const secondAuth = { Authorization: 'Bearer ' + second.accessToken };
    const devices = (await api.get('/api/auth/sessions').set(auth()).expect(200)).body;
    assert.equal(devices.length, 2);
    assert.equal(devices.filter((device) => device.current).length, 1);
    const otherDevice = devices.find((device) => device.userAgent === agent);
    assert.equal(otherDevice.current, false);
    assert.deepEqual(Object.keys(otherDevice).sort(), ['createdAt', 'current', 'expiresAt', 'id', 'userAgent']);
    await api.delete('/api/auth/sessions/' + otherDevice.id).set(other()).expect(204);
    await api.get('/api/users/me').set(secondAuth).expect(200);
    await api.delete('/api/auth/sessions/' + otherDevice.id).set(auth()).expect(204);
    await api.get('/api/users/me').set(secondAuth).expect(401);
    const remaining = (await api.get('/api/auth/sessions').set(auth()).expect(200)).body;
    assert.equal(remaining.length, 1);
    assert.equal(remaining[0].current, true);
  });

  await t.test('syncs UI preferences across sessions and cleans private banners', async () => {
    const address = { email: 'preferences@example.com', password: 'Local88!', fullName: 'Preferences test' };
    const { body: owner } = await api.post('/api/auth/register').send(address).expect(201);
    const connect = async () => {
      const { body } = await api.post('/api/auth/login')
        .send({ email: address.email, password: address.password }).expect(200);
      return { Authorization: 'Bearer ' + body.accessToken };
    };
    const first = await connect();
    const second = await connect();
    const endpoint = '/api/users/me/ui-preferences';
    const shared = '/api/users/shared/' + owner.id;
    await api.get(endpoint).expect(401);
    await api.patch(endpoint).send({ notifications: { review: false } }).expect(401);
    assert.deepEqual((await api.get(endpoint).set(first).expect(200)).body, {
      appearance: null, notifications: null, interfaceSettings: null,
    });
    assert.deepEqual((await api.get(endpoint).set(other()).expect(200)).body, {
      appearance: null, notifications: null, interfaceSettings: null,
    });
    await api.patch(endpoint).set(first).send({ appearance: { banner: 'https://example.com/a.jpg' } }).expect(400);
    await api.patch(endpoint).set(first).send({ appearance: { image: 'data:image/jpeg;base64,abcd' } }).expect(400);
    await api.patch(endpoint).set(first).send({ appearance: { metrics: [null, null, null, null, null, null] } }).expect(400);
    await api.patch(endpoint).set(first).send({ notifications: { review: null } }).expect(400);
    await api.patch(endpoint).set(first).send({ interfaceSettings: { language: 'fr' } }).expect(400);
    await api.patch(endpoint).set(first).send({ interfaceSettings: { appearance: { accent: 'url(example.com)' } } }).expect(400);
    await api.patch(endpoint).set(first).send({ interfaceSettings: { appearance: { accent: 'DEFAULT' } } }).expect(400);
    await api.patch(endpoint).set(first).send({ interfaceSettings: { sidebarCollapsed: null } }).expect(400);
    const { body: initial } = await api.patch(endpoint).set(first).send({
      initialize: true,
      appearance: { layout: 'vertical', banner: '/profile-banners/dunes.jpg' },
      notifications: { review: false },
      interfaceSettings: {
        language: 'ru', themeMode: 'dark', sidebarCollapsed: true,
        appearance: { accent: '#123ABC', density: 'compact' },
      },
    }).expect(200);
    assert.equal(initial.appearance.layout, 'vertical');
    assert.equal(initial.appearance.statsStyle, 'grid');
    const { body: updated } = await api.patch(endpoint).set(second).send({
      appearance: { position: 'right', overlay: 42, content: { bio: false } },
      notifications: { streak: true },
      interfaceSettings: { appearance: { textSize: 'large', animations: false, reducedMotion: true } },
    }).expect(200);
    assert.deepEqual(updated.interfaceSettings, {
      language: 'ru', themeMode: 'dark', sidebarCollapsed: true,
      appearance: { accent: '#123ABC', density: 'compact', textSize: 'large', animations: false, reducedMotion: true },
    });
    assert.deepEqual(updated.appearance.content, { bio: false, email: true, charts: true, achievements: true });
    assert.equal(updated.appearance.banner, '/profile-banners/dunes.jpg');
    assert.equal(updated.notifications.review, false);
    const { body: afterOldImport } = await api.patch(endpoint).set(first).send({
      initialize: true, appearance: { layout: 'horizontal' }, notifications: { streak: false },
      interfaceSettings: { themeMode: 'light', appearance: { accent: '#aaaaaa' } },
    }).expect(200);
    assert.deepEqual(afterOldImport, updated);
    assert.deepEqual((await api.get(endpoint).set(second).expect(200)).body, updated);

    await api.get(shared).expect(404);
    await api.patch('/api/users/me').set(first).send({ profilePublic: true, profileSharing: true }).expect(200);
    const { body: stockProfile } = await api.get(shared).expect(200);
    assert.deepEqual(stockProfile.appearance, {
      banner: '/profile-banners/dunes.jpg', position: 'right', height: 'medium', overlay: 42,
    });
    assert.equal('notifications' in stockProfile, false);
    assert.equal('interfaceSettings' in stockProfile, false);
    const { previewNews, publishNews } = require('../scripts/publish-news.cjs');
    const announcement = { slug: 'new-exercises-test', title: 'Yangi mashqlar', body: 'Yangi tinglash mashqlari qo‘shildi.' };
    assert.equal((await previewNews(pool, announcement)).recipients, 0);
    assert.equal((await publishNews(pool, announcement)).published, 0);
    await api.patch(endpoint).set(first).send({ notifications: { news: true } }).expect(200);
    assert.deepEqual(await previewNews(pool, announcement), {
      ...announcement, preview: true, alreadyPublished: false, recipients: 1,
    });
    const duplicate = await Promise.all([
      publishNews(pool, announcement),
      publishNews(pool, announcement),
    ]);
    assert.equal(duplicate.reduce((count, report) => count + report.published, 0), 1);
    assert.equal(duplicate.filter((report) => report.alreadyPublished).length, 1);
    const { body: inbox } = await api.get('/api/notifications').set(second).expect(200);
    assert.deepEqual(inbox.data.find(({ type }) => type === 'news')?.data, announcement);
    const { body: otherNews } = await api.get('/api/notifications').set(other()).expect(200);
    assert.equal(otherNews.data.some(({ type }) => type === 'news'), false);
    await assert.rejects(publishNews(pool, { ...announcement, title: 'Boshqa matn' }), /boshqa matnga/);
    await pool.query("DELETE FROM user_notifications WHERE user_id=$1 AND type='news'", [owner.id]);
    assert.equal((await publishNews(pool, announcement)).published, 0);

    const image = 'data:image/jpeg;base64,/9j/2Q==';
    const { body: uploaded } = await api.patch(endpoint).set(first).send({ appearance: { image } }).expect(200);
    assert.match(uploaded.appearance.banner, /^https:\/\/res\.cloudinary\.com\/test\/image\/upload\/LexiMind\/banners\//);
    assert.equal(uploaded.appearance.layout, 'vertical');
    assert.equal((await api.get(shared).expect(200)).body.appearance.banner, uploaded.appearance.banner);

    await api.patch(endpoint).set(first).send({ appearance: { banner: '/profile-cover.jpg' } }).expect(200);
    const { rows: [oldBanner] } = await pool.query('SELECT public_id FROM avatar_cleanup_jobs WHERE public_id LIKE $1', ['LexiMind/banners/%']);
    assert.ok(oldBanner);
    await avatarWorker.flush();
    assert.equal(uploadedAvatars.has(oldBanner.public_id), false);

    await api.patch(endpoint).set(first).send({ appearance: { image } }).expect(200);
    await api.delete('/api/users/me').set(first).send({ currentPassword: address.password }).expect(204);
    const { rowCount } = await pool.query('SELECT user_id FROM user_ui_preferences WHERE user_id = $1', [owner.id]);
    assert.equal(rowCount, 0);
    const { rows: [deletedBanner] } = await pool.query('SELECT public_id FROM avatar_cleanup_jobs WHERE public_id LIKE $1', ['LexiMind/banners/%']);
    assert.ok(deletedBanner);
    await avatarWorker.flush();
    assert.equal(uploadedAvatars.has(deletedBanner.public_id), false);
  });

  await t.test('honors sharing and field-level privacy in public profiles', async () => {
    const endpoint = '/api/users/shared/' + userId;
    const leaderboard = '/api/leaderboard';
    await api.get(endpoint).expect(404);
    await api.get(leaderboard).expect(401);
    await api.get(leaderboard + '?period=unsupported').set(auth()).expect(400);
    const { body: privateRanking } = await api.get(leaderboard).set(auth()).expect('Cache-Control', 'no-store').expect(200);
    assert.ok(privateRanking.own.xp > 0);
    assert.equal(privateRanking.own.rank, null);
    assert.equal(privateRanking.entries.some(({ id }) => id === userId), false);
    await api.patch('/api/users/me').set(auth()).send({ profilePublic: null }).expect(400);
    await api.patch('/api/users/me').set(auth()).send({ profilePublic: true }).expect(200);
    await api.get(endpoint).expect(404);

    const { body: saved } = await api.patch('/api/users/me').set(auth())
      .send({
        profileSharing: true, publicCefr: true, publicStatistics: true,
        bio: 'Learning English one word at a time.',
        socialLinks: { instagram: 'https://instagram.com/leximind-test' },
      }).expect(200);
    assert.deepEqual(saved.privacy, {
      profilePublic: true, profileSharing: true, publicStatistics: true, publicCefr: true,
      publicBio: false, publicSocialLinks: false,
    });
    assert.deepEqual((await api.get('/api/users/me').set(auth()).expect(200)).body.privacy, saved.privacy);
    const { body: shared } = await api.get(endpoint).expect('Cache-Control', 'no-store').expect(200);
    assert.deepEqual(Object.keys(shared).sort(), ['avatarUrl', 'fullName', 'hasProfileBadge', 'level', 'statistics']);
    assert.deepEqual(Object.keys(shared.statistics).sort(), [
      'accuracy', 'learnedWords', 'sessions', 'streakDay', 'studySeconds', 'weeklyXp', 'xp',
    ]);
    assert.equal(shared.statistics.weeklyXp.length, 12);

    await api.patch('/api/users/me').set(auth()).send({ publicBio: true }).expect(200);
    const { body: sharedBio } = await api.get(endpoint).expect(200);
    assert.deepEqual(sharedBio, { ...shared, bio: saved.bio });

    await api.patch('/api/users/me').set(auth()).send({ publicBio: false, publicSocialLinks: true }).expect(200);
    const { body: sharedLinks } = await api.get(endpoint).expect(200);
    assert.equal(sharedLinks.socialLinks.instagram, 'https://instagram.com/leximind-test');
    assert.deepEqual(sharedLinks, { ...shared, socialLinks: saved.socialLinks });

    const { body: publicRanking } = await api.get(leaderboard + '?period=all').set(other()).expect(200);
    const rankedUser = publicRanking.entries.find(({ id }) => id === userId);
    assert.ok(rankedUser);
    assert.equal(rankedUser.rank, 1);
    assert.equal(rankedUser.canViewProfile, true);
    assert.equal(rankedUser.xp, shared.statistics.xp);
    assert.deepEqual(Object.keys(rankedUser).sort(), [
      'avatarUrl', 'canViewProfile', 'fullName', 'hasProfileBadge', 'id', 'rank', 'streak', 'xp',
    ]);
    for (const period of ['month', 'week', 'today']) {
      const { body: partial } = await api.get(leaderboard + '?period=' + period).set(auth()).expect(200);
      assert.ok(partial.own.xp <= publicRanking.entries[0].xp);
    }

    await api.patch('/api/users/me').set(auth())
      .send({ publicCefr: false, publicStatistics: false, publicSocialLinks: false }).expect(200);
    const { body: limited } = await api.get(endpoint).expect(200);
    assert.deepEqual(Object.keys(limited).sort(), ['avatarUrl', 'fullName', 'hasProfileBadge']);
    const { body: hiddenRanking } = await api.get(leaderboard).set(other()).expect(200);
    assert.equal(hiddenRanking.entries.some(({ id }) => id === userId), false);
    await api.patch('/api/users/me').set(auth()).send({ profileSharing: false }).expect(200);
    await api.get(endpoint).expect(404);
    await api.patch('/api/users/me').set(auth())
      .send({ profileSharing: true, profilePublic: false }).expect(200);
    await api.get(endpoint).expect(404);
  });

  await t.test('credits a referral only once after email verification', async () => {
    await pool.query('DELETE FROM rate_limits');
    const endpoint = '/api/referrals';
    const readXp = async (headers) =>
      (await api.get('/api/statistics/analytics').set(headers).expect(200)).body;
    const summary = async (headers = auth()) =>
      (await api.get(endpoint).set(headers).expect('Cache-Control', 'no-store').expect(200)).body;
    const before = await readXp(auth());

    await api.get(endpoint).expect(401);
    await api.get('/api/friends').set(auth()).expect(404);
    const invite = await summary();
    assert.equal(invite.rewardXp, 50);
    assert.equal(invite.registered, 0);
    assert.notEqual((await summary(other())).code, invite.code);
    const registration = {
      fullName: 'Referred learner',
      email: 'referred@example.com',
      password: 'Referral8!',
      referralCode: invite.code,
    };
    await api.post('/api/auth/register').send({ ...registration, referralCode: 'broken' }).expect(400);
    await api.post('/api/auth/register').send(registration).expect(201);
    await api.post('/api/auth/register').send(registration).expect(409);

    const pending = await summary();
    assert.equal(pending.pending, 1);
    assert.equal(pending.rewarded, 0);
    assert.equal((await readXp(auth())).totalXp, before.totalXp);
    assert.deepEqual(Object.keys(pending.recent[0]).sort(), ['id', 'registeredAt', 'rewardXp', 'rewardedAt']);
    assert.equal((await summary(other())).registered, 0);

    const verify = '/api/auth/email-verification';
    await api.post(verify + '/request').send({ email: registration.email }).expect(202);
    await emailWorker.flush();
    const mail = sentAccountEmails.find(({ email, kind }) => email === registration.email && kind === 'verify_email');
    assert.ok(mail);
    const responses = await Promise.all([
      api.post(verify + '/confirm-code').send({ email: registration.email, code: mail.code }),
      api.post(verify + '/confirm-code').send({ email: registration.email, code: mail.code }),
    ]);
    assert.deepEqual(responses.map(({ status }) => status).sort(), [204, 400]);
    await api.post(verify + '/confirm').send({ token: mail.token }).expect(400);

    const earned = await summary();
    assert.equal(earned.rewarded, 1);
    assert.equal(earned.pending, 0);
    assert.equal(earned.earnedXp, 50);
    assert.ok(earned.recent[0].rewardedAt);
    const after = await readXp(auth());
    assert.equal(after.totalXp, before.totalXp + 50);
    assert.equal(after.studySeconds, before.studySeconds);
    assert.equal(after.weeks.at(-1).xp, before.weeks.at(-1).xp + 50);
    const { body: standings } = await api.get('/api/leaderboard?period=all').set(auth()).expect(200);
    assert.equal(standings.own.xp, after.totalXp);
    const { body: achievements } = await api.get('/api/achievements').set(auth()).expect(200);
    assert.equal(achievements.find(({ id }) => id === 'social').progress, 1);
    const { body: device } = await api.post('/api/auth/login')
      .send({ email: registration.email, password: registration.password }).expect(200);
    await api.delete('/api/users/me').set('Authorization', 'Bearer ' + device.accessToken)
      .send({ currentPassword: registration.password }).expect(204);
    assert.equal((await summary()).earnedXp, 50);
  });

  await t.test('keeps notifications usable without exposing historical friendship requests', async () => {
    const endpoint = '/api/notifications';
    const { id: actorId } = (await api.get('/api/users/me').set(other()).expect(200)).body;
    const { rows } = await pool.query(
      "INSERT INTO user_notifications (user_id,actor_id,type,dedupe_key,data) VALUES ($1,$2,'friend_request','legacy-test','{}'),($1,NULL,'news','referral-test-news','{}') RETURNING id,type",
      [userId, actorId],
    );
    try {
      await api.get(endpoint).expect(401);
      const visible = rows.find(({ type }) => type === 'news').id;
      const legacy = rows.find(({ type }) => type === 'friend_request').id;
      const inbox = (await api.get(endpoint).set(auth()).expect(200)).body;
      assert.ok(inbox.data.some(({ id }) => id === visible));
      assert.ok(!inbox.data.some(({ id }) => id === legacy));
      await api.patch(endpoint + '/' + visible + '/read').set(other()).expect(204);
      await api.patch(endpoint + '/' + visible + '/read').set(auth()).expect(204);
      const read = (await api.get(endpoint).set(auth()).expect(200)).body;
      assert.ok(read.data.find(({ id }) => id === visible).readAt);
      await api.patch(endpoint + '/read-all').set(auth()).expect(204);
      assert.equal((await api.get(endpoint).set(auth()).expect(200)).body.unreadCount, 0);
    } finally {
      await pool.query('DELETE FROM user_notifications WHERE id=ANY($1::uuid[])', [rows.map(({ id }) => id)]);
    }
  });

  await t.test('signs out other devices while preserving the current account session', async () => {
    const { email } = (await api.get('/api/users/me').set(auth()).expect(200)).body;
    const { body: device } = await api.post('/api/auth/login')
      .send({ email, password: 'Reset88!' }).expect(200);
    await api.delete('/api/auth/sessions/others').expect(401);
    await api.delete('/api/auth/sessions/others').set(auth()).expect(204);
    await api.get('/api/users/me').set('Authorization', 'Bearer ' + device.accessToken).expect(401);
    await api.get('/api/users/me').set(other()).expect(200);
    const { body: remaining } = await api.get('/api/auth/sessions').set(auth()).expect(200);
    assert.equal(remaining.length, 1);
    assert.equal(remaining[0].current, true);
  });

  await t.test('creates personalized learning notifications once with real activity', async () => {
    const email = 'notification-test@example.com';
    const { body: learner } = await api.post('/api/auth/register')
      .send({ email, password, fullName: 'Notifications learner' }).expect(201);
    // Pick a real zone where both afternoon checks are due, independent of the test runner clock.
    const zone = (await pool.query(
      `SELECT name FROM pg_timezone_names WHERE name NOT LIKE 'posix/%'
       AND (now() AT TIME ZONE name)::time BETWEEN time '19:00' AND time '22:00'
       ORDER BY name LIMIT 1`,
    )).rows[0].name;
    await pool.query(
      `UPDATE learner_profiles SET timezone=$2, streak_day=1,
        study_reminder_enabled=true, study_reminder_time='18:00',
        last_session_at=(((now() AT TIME ZONE $2)::date-1)::timestamp+interval '12 hours')
          AT TIME ZONE $2 AT TIME ZONE 'UTC' WHERE user_id=$1`,
      [learner.id, zone],
    );
    await pool.query(
      `INSERT INTO user_ui_preferences (user_id, notifications)
       VALUES ($1,'{"review":true,"streak":true,"achievements":true,"progress":true,"weekly":true}')`,
      [learner.id],
    );
    const { rows: [card] } = await pool.query(
      `INSERT INTO cards(user_id,word_id,stability,difficulty,due,reps,state,lapses)
       VALUES ($1,$2,2,4,now() AT TIME ZONE 'UTC'-interval '1 hour',1,'REVIEW',0) RETURNING id`,
      [learner.id, wordId],
    );
    const { rows: [yesterday] } = await pool.query(
      `INSERT INTO sessions (user_id, status, started_at, ended_at)
       SELECT user_id, 'completed', last_session_at-interval '10 minutes', last_session_at
       FROM learner_profiles WHERE user_id=$1 RETURNING id`,
      [learner.id],
    );
    await pool.query(
      `INSERT INTO session_tasks(session_id,card_id,format,order_index,completed,correct)
       VALUES ($1,$2,'meaning_match',0,true,true)`,
      [yesterday.id, card.id],
    );
    await pool.query(
      `INSERT INTO sessions (user_id,status,started_at,ended_at)
       SELECT $1,'completed', moment-interval '15 minutes', moment FROM (
         SELECT (date_trunc('week',now() AT TIME ZONE $2)-interval '5 days')
           AT TIME ZONE $2 AT TIME ZONE 'UTC' AS moment
       ) t`,
      [learner.id, zone],
    );
    await pool.query(
      `INSERT INTO assessment_result (user_id,resulting_level,correct_count,total_question,taken_at)
       VALUES ($1,'B1',8,10,now() AT TIME ZONE 'UTC'-interval '4 minutes')`,
      [learner.id],
    );
    await pool.query(
      `INSERT INTO challenges (user_id, kind, payload, answers, expires_at, completed_at, result, created_at)
       SELECT user_id, 'sequence_memory', '{}', '[]',
        (last_session_at AT TIME ZONE 'UTC') + interval '1 hour',
        last_session_at AT TIME ZONE 'UTC', '{"score":90,"correctCount":7,"totalQuestion":7}',
        (last_session_at AT TIME ZONE 'UTC') - interval '1 minute'
       FROM learner_profiles WHERE user_id=$1`,
      [learner.id],
    );
    const work = async () => {
      await pool.query('UPDATE notification_schedules SET next_check_at=now() WHERE user_id=$1', [learner.id]);
      await notificationWorker.flush();
      return (await pool.query(
        'SELECT type,data FROM user_notifications WHERE user_id=$1 ORDER BY type,id',
        [learner.id],
      )).rows;
    };
    const first = await work();
    assert.deepEqual(first.find((row) => row.type === 'review')?.data, { count: 1 });
    assert.deepEqual(first.find((row) => row.type === 'streak')?.data, { count: 1 });
    assert.ok(first.some((row) => row.type === 'progress' && row.data.level === 'B1'));
    assert.ok(first.some((row) => row.type === 'progress' && row.data.count === 100));
    assert.ok(first.some((row) => row.type === 'daily'));
    assert.ok(first.some((row) => row.type === 'achievements' && row.data.achievementId === 'perfect-session'));
    assert.ok(first.some((row) => row.type === 'weekly' && row.data.minutes >= 15));
    assert.deepEqual(await work(), first);
  });
  await t.test('uses provider idempotency and treats expired push endpoints as gone', async (transportTest) => {
    const { NotificationTransport } = require('../dist/src/infrastructure/notifications/NotificationTransport');
    const transport = app.get(NotificationTransport);
    const pending = {
      id: randomUUID(),
      notificationId: randomUUID(),
      channel: 'email',
      expiresAt: new Date(Date.now() + 60_000),
    };
    const target = { userId, type: 'weekly', email: 'synthetic@example.com', data: { count: 3, minutes: 18, words: 7 } };
    let payload;
    let emails = 0;
    transportTest.mock.method(globalThis, 'fetch', async (url, init) => {
      assert.equal(url, 'https://api.resend.com/emails');
      assert.equal(init.headers['Idempotency-Key'], 'leximind-notification/' + pending.id);
      if (payload !== undefined) assert.equal(init.body, payload);
      payload = init.body;
      assert.match(payload, /https:\/\/example\.com\/settings\/notifications/);
      assert.match(payload, /3 ta mashq, 18 daqiqa/);
      emails += 1;
      return emails === 1
        ? new Response(null, { status: 429, headers: { 'Retry-After': '90' } })
        : new Response(null, { status: 200 });
    });
    assert.deepEqual(await transport.deliver(pending, target), { status: 'retry', afterSeconds: 90 });
    assert.deepEqual(await transport.deliver(pending, target), { status: 'sent' });
    assert.equal(emails, 2);

    const endpoint = 'https://web.push.apple.com/test_endpoint_secret';
    const tag = pending.notificationId.replaceAll('-', '');
    const push = transportTest.mock.method(transport, 'sendPush', async (destination, payload, options) => {
      assert.equal(destination.endpoint, endpoint);
      assert.equal(options.topic, tag);
      assert.equal(JSON.parse(payload).tag, tag);
      assert.ok(!payload.includes(target.email));
      throw { statusCode: 410 };
    });
    assert.deepEqual(await transport.deliver({ ...pending, channel: 'push' }, {
      ...target, endpoint, p256dh: generateVAPIDKeys().publicKey, auth: Buffer.alloc(16, 6).toString('base64url'),
    }), { status: 'gone' });
    assert.equal(push.mock.callCount(), 1);
  });

  await t.test('validates push ownership and retries opted-in deliveries', async () => {
    const endpoint = '/api/notifications/push-subscriptions';
    const { NotificationDeliveryWorker } = require('../dist/src/infrastructure/notifications/NotificationDeliveryWorker');
    const { NotificationDeliveryRepository } = require('../dist/src/infrastructure/notifications/NotificationDeliveryRepository');
    const { NotificationTransport } = require('../dist/src/infrastructure/notifications/NotificationTransport');
    const worker = app.get(NotificationDeliveryWorker);
    const queue = app.get(NotificationDeliveryRepository);
    const transport = app.get(NotificationTransport);
    const calls = [];
    const original = transport.deliver;
    let pushStatus = 'retry';
    transport.deliver = async (job, target) => {
      calls.push([job.channel, target.userId, job.notificationId]);
      return { status: job.channel === 'push' ? pushStatus : 'sent' };
    };
    try {
      await api.get('/api/notifications/delivery').expect(401);
      const { body: availability } = await api.get('/api/notifications/delivery').set(auth()).expect(200);
      assert.deepEqual(availability, { pushPublicKey: testVapid.publicKey, emailAvailable: true, deviceIds: [] });
      const push = {
        endpoint: 'https://fcm.googleapis.com/fcm/send/leximind_test_endpoint',
        keys: { p256dh: generateVAPIDKeys().publicKey, auth: Buffer.alloc(16, 8).toString('base64url') },
      };
      const register = (payload = push, headers = auth()) => api.post(endpoint).set(headers).send(payload);
      await api.post(endpoint).send(push).expect(401);
      await register({ ...push, endpoint: 'https://127.0.0.1/push/private_endpoint' }).expect(400);
      await register({ ...push, endpoint: 'https://fcm.googleapis.com.example.com/fcm/send/leximind_test_endpoint' }).expect(400);
      await register({ ...push, keys: { ...push.keys, p256dh: Buffer.alloc(65).toString('base64url') } }).expect(400);
      const { body: first } = await register().expect(201);
      assert.deepEqual((await register().expect(201)).body, first);
      const deliveryFor = async (headers) => (await api.get('/api/notifications/delivery').set(headers).expect(200)).body.deviceIds;
      assert.deepEqual(await deliveryFor(auth()), [first.id]);
      assert.deepEqual(await deliveryFor(other()), []);
      await api.delete(endpoint + '/' + first.id).set(other()).expect(204);
      assert.equal((await pool.query('SELECT id FROM notification_push_subscriptions WHERE id=$1', [first.id])).rowCount, 1);
      await register({ ...push, keys: { ...push.keys, auth: Buffer.alloc(16, 9).toString('base64url') } }, other()).expect(409);
      const { body: moved } = await register(push, other()).expect(201);
      assert.notEqual(moved.id, first.id);
      assert.deepEqual(await deliveryFor(auth()), []);
      assert.deepEqual(await deliveryFor(other()), [moved.id]);
      const { body: subscription } = await register().expect(201);
      assert.notEqual(subscription.id, moved.id);

      const updatePrefs = (patch) => pool.query(
        `INSERT INTO user_ui_preferences(user_id,notifications) VALUES ($1,$2::jsonb)
         ON CONFLICT (user_id) DO UPDATE
           SET notifications=coalesce(user_ui_preferences.notifications,'{}') || excluded.notifications`,
        [userId, JSON.stringify(patch)],
      );
      await updatePrefs({ push: true, email: true, weekly: true, review: true });
      await pool.query('UPDATE users SET email_verified_at=now() WHERE id=$1', [userId]);
      await pool.query('UPDATE user_notifications SET read_at=now() WHERE user_id=$1', [userId]);
      const createNotice = async (type) => (await pool.query(
        'INSERT INTO user_notifications(user_id,type,dedupe_key) VALUES($1,$2,$3) RETURNING id',
        [userId, type, randomUUID()],
      )).rows[0].id;
      const getJobs = async (id) => (await pool.query(
        'SELECT channel,attempts,outcome,available_at>now() AS deferred FROM notification_delivery_jobs WHERE notification_id=$1 ORDER BY channel',
        [id],
      )).rows;
      const weekly = await createNotice('weekly');
      await Promise.all([queue.enqueue(['email', 'push']), queue.enqueue(['email', 'push'])]);
      await worker.flush();
      let jobs = await getJobs(weekly);
      assert.deepEqual(jobs.map(({ channel, outcome }) => [channel, outcome]), [['email', 'delivered'], ['push', null]]);
      assert.equal(jobs[1].attempts, 1);
      assert.equal(jobs[1].deferred, true);
      await pool.query("UPDATE notification_delivery_jobs SET available_at=now() WHERE notification_id=$1 AND channel='push'", [weekly]);
      pushStatus = 'sent';
      await worker.flush();
      jobs = await getJobs(weekly);
      assert.equal(jobs[1].attempts, 2);
      assert.equal(jobs[1].outcome, 'delivered');
      assert.equal(calls.filter(([channel]) => channel === 'email').length, 1);
      assert.equal(calls.filter(([channel]) => channel === 'push').length, 2);
      assert.ok(calls.every(([, owner, notice]) => owner === userId && notice === weekly));

      const review = await createNotice('review');
      await queue.enqueue(['push']);
      await updatePrefs({ push: false });
      await worker.flush();
      assert.equal((await getJobs(review))[0].outcome, 'skipped');
      assert.equal(calls.length, 3);

      await updatePrefs({ push: true });
      pushStatus = 'gone';
      await createNotice('review');
      await queue.enqueue(['push']);
      await worker.flush();
      assert.equal((await pool.query('SELECT id FROM notification_push_subscriptions WHERE id=$1', [subscription.id])).rowCount, 0);
      const { body: restored } = await register().expect(201);
      await api.delete(endpoint + '/' + restored.id).set(auth()).expect(204);
      assert.equal((await pool.query('SELECT id FROM notification_push_subscriptions WHERE id=$1', [restored.id])).rowCount, 0);
    } finally {
      transport.deliver = original;
    }
  });

  await t.test('deleting account cascades personal state', async () => {
    await api.delete('/api/users/me').set(auth()).expect(400);
    await api.delete('/api/users/me').set(auth())
      .send({ currentPassword: 'wrong' }).expect(400);
    const image =
      'data:image/jpeg;base64,' +
      Buffer.from([0xff, 0xd8, 0xff, 0xd9]).toString('base64');
    await api.put('/api/users/me/avatar').set(auth()).send({ image }).expect(200);
    assert.equal(uploadedAvatars.size, 1);
    await api.delete('/api/users/me').set(auth())
      .send({ currentPassword: 'Reset88!' }).expect(204);
    assert.equal((await pool.query('SELECT public_id FROM avatar_cleanup_jobs')).rowCount, 1);
    await avatarWorker.flush();
    assert.equal(uploadedAvatars.size, 0);
    assert.equal((await pool.query('SELECT public_id FROM avatar_cleanup_jobs')).rowCount, 0);
    assert.equal(
      (await pool.query('SELECT id FROM user_notifications WHERE user_id=$1 OR actor_id=$1', [userId])).rowCount,
      0,
    );
    assert.equal((await pool.query('SELECT request_id FROM friendship_rewards WHERE user_id=$1', [userId])).rowCount, 0);
    assert.equal((await pool.query('SELECT id FROM friendships WHERE requester_id=$1 OR recipient_id=$1', [userId])).rowCount, 0);
    assert.equal((await pool.query('SELECT id FROM referrals WHERE referrer_id=$1', [userId])).rowCount, 0);
    assert.equal(
      (await pool.query('SELECT count(*)::integer AS n FROM collection_entries WHERE user_id=$1', [userId])).rows[0].n,
      0,
    );
    assert.equal(
      (
        await pool.query(
          'SELECT count(*)::integer AS n FROM auth_sessions WHERE user_id=$1',
          [userId],
        )
      ).rows[0].n,
      0,
    );
    assert.equal(
      (
        await pool.query(
          'SELECT count(*)::integer AS n FROM cards WHERE user_id=$1',
          [userId],
        )
      ).rows[0].n,
      0,
    );
  });
  await t.test(
    'exercises a successful request for every documented API operation',
    () => {
      const operations = Object.entries(contract.paths).flatMap(
        ([path, methods]) =>
          Object.keys(methods)
            .filter((method) =>
              ['get', 'post', 'patch', 'put', 'delete'].includes(method),
            )
            .map((method) => method + ' ' + path),
      );
      const missing = operations.filter(
        (operation) => !successfulRoutes.has(operation),
      );
      assert.equal(operations.length, 96);
      assert.deepEqual(missing, []);
    },
  );
});
