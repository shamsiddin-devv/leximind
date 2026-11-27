# LexiMind backend

NestJS API for vocabulary learning, FSRS spaced repetition, learner profiles, placement practice and eleven learning games. Node.js 24 and PostgreSQL 18 are the tested runtime versions.

## Local setup

1. Run `npm ci` in `backend/`. For the web application, run `npm ci` and `npm run dev` in `frontend/`.
2. Copy `.env.example` to `.env` **only for a new installation**. Keep an existing `.env` and set `DATABASE_URL` to the intended PostgreSQL database.
3. Run `npm run db:migrate` against an empty database.
4. Run `npm run start:dev`. The API prefix is `/api`; interactive documentation is at `/api/docs`, with OpenAPI JSON at `/api/docs-json` in development/test.
5. Register an account, then grant catalog administration locally using `npm run db:admin -- your-email@example.com`. Public registration always creates a learner.

For a compiled release: `npm run build`, then `npm run start:prod`. Production disables Swagger. Health endpoints are `/api/health/live` and `/api/health/ready`. Readiness checks the migration version and database availability.

The repository's original `.env` is intentionally unchanged. No existing database is migrated by tests or application startup.

## Existing database migration

The historical Drizzle migration only altered foreign keys and could not initialize an empty database. The executable migration chain now lives in `migrations/`:

- `001_initial.sql` recreates the original schema for new installations.
- `002_production.sql` adds auth sessions, shared throttling, challenges, uniqueness/check constraints, indexes, normalized identities and fixes session timestamps/order indexes.
- `003_learning_lifecycle.sql` adds card pause state and cancelled sessions. It prevents deletion of vocabulary still referenced by cards. Existing rows are preserved.
- `004_practice_feedback.sql` adds five practice modes, per-question attempts, the learner audio preference, and a private mistake queue.
- `005_operational_indexes.sql` adds indexes for card-to-word relationships, game history, and cleanup of expired rounds.

For an existing installation, back up the database, verify that it matches the original schema, and test a restore in staging. Then run `npm run db:migrate -- --adopt-existing`. This explicitly records the baseline and applies the upgrade. Duplicate normalized emails/words, duplicate profiles, duplicate active sessions, invalid sense indexes or scheduling data stop the migration instead of being silently deleted. Correct such historical records before retrying. Legacy timestamp columns are interpreted as UTC; convert historical local timestamps before adoption if necessary.

Migrations use a PostgreSQL advisory lock, a transaction per migration, and SHA-256 checksums. Never edit an applied migration; add a new numbered SQL file and update readiness to the new required version. SQL migrations are authoritative for constraints and indexes; the Drizzle schema supplies application types. Do not use `drizzle-kit push` against production. Historical files under `src/infrastructure/db/drizzle/migrations/` are retained for reference and are not executed by the new runner.

## API workflows

All routes below use `/api`. Authentication is required except registration, login and health. Send `Authorization: Bearer <accessToken>`. IDs are UUIDs, unknown body/query fields are rejected, optional fields accept omission but not `null`, and bulk requests are bounded.

| Area | Routes | Behavior |
| --- | --- | --- |
| Authentication | `POST /auth/register`, `POST /auth/login`, `POST /auth/logout` | Register, issue a session, revoke the current session |
| Account | `GET/PATCH/DELETE /users/me`, `PATCH /users/me/password` | Own account; password changes revoke all sessions |
| Administration | `GET /users`, `GET /users/:id` | Admin only, paginated user list |
| Vocabulary | `GET /words`, `GET /words/:id`, `GET /words/daily` | Search, CEFR filter, pagination and a catalog word selected for the current UTC day |
| Catalog management | `POST /words`, `POST /words/bulk`, `PUT/DELETE /words/:id` | Admin only; words and senses saved atomically |
| Word senses | `GET/POST /words/:wordId/senses`, `GET/PUT/DELETE /words/:wordId/senses/:id` | Admin writes; edits preserve the sense ID and each word keeps at least one sense |
| Cards | `GET/POST /cards`, `POST /cards/bulk`, `GET /cards/due`, `GET/PATCH/DELETE /cards/:id` | Owner scoped; PATCH accepts `{"paused":true}` or `{"paused":false}` |
| Learner | `GET/PATCH /profile`, `GET /statistics` | Timezone, daily target and learning totals |
| Sessions | `POST/GET /sessions`, `GET /sessions/:id` | Start/resume due-card session and view history |
| Tasks | `GET /sessions/:id/tasks/:taskId`, `GET /sessions/:id/tasks/:taskId/review-preview` | Read the task and preview each FSRS rating's next due date for a pending, due task |
| Reviews | `POST /sessions/:id/tasks/:taskId/review`, `GET /reviews`, `GET /reviews/:id` | Apply FSRS and save review history atomically |
| Session lifecycle | `POST /sessions/:id/complete`, `POST /sessions/:id/cancel` | Both actions are safe to retry. Cancelling preserves submitted reviews and gives no streak credit. |
| Assessment | `POST/GET /assessments`, `POST /assessments/:id/submit` | Server-issued questions and scoring |
| Games | `POST/GET /games`, `GET /games/:id`, `POST /games/:id/submit`, `POST /games/:id/attempts` | Ten challenge types, resumable attempts, and server scoring |
| Feedback audio | `GET /feedback-audio/:file` | Public, cacheable PCM cues selected by the server for learners who enable them |
| Stored results | `GET /assessment-results`, `GET /assessment-results/:id`, `GET /game-scores`, `GET /game-scores/:id` | Owner-only views of stored results, including records created before the challenge workflow |
| Study plan | `GET /study-plan` | Today's actionable queue, next seven local calendar days, and difficult words |
| Referrals | `GET /referrals`, `referralCode` in `POST /auth/register` | Personal referral link, verification status, and bonus XP |
| Notifications | `GET /notifications`, `PATCH /notifications/:id/read`, `PATCH /notifications/read-all` | Account-specific notification history and unread count |
| Notification delivery | `GET /notifications/delivery`, `POST /notifications/push-subscriptions`, `DELETE /notifications/push-subscriptions/:id` | Channel status and browser subscriptions associated with the current session |

### Joining through a referral

The link on the Referrals page takes new users to `/register?ref=…`. When a user who signed up through that link verifies their email, the referrer receives 50 XP once. The reward counts toward learning statistics, the calendar, and the leaderboard. The page does not disclose referred users' personal information. Migration `026_referrals.sql` assigns referral codes to existing accounts. XP previously awarded for friendships remains in the totals.

### Setting up notifications

Run `npm run db:migrate` in the backend directory. Migrations `021–024` add notification history, scheduling, push subscriptions, the delivery queue, interface settings, and protection against publishing the same announcement twice. Daily practice reminders and streak notifications use the learner's time zone.

- The backend generates in-app notifications automatically while it is running. See the [operator guide](backend/docs/NEWS.md) for instructions on publishing announcements.
- Web Push requires `NOTIFICATION_DELIVERY_ENABLED=true`, `VAPID_SUBJECT`, `VAPID_PUBLIC_KEY`, and `VAPID_PRIVATE_KEY` on the server. The frontend must run over HTTPS, and the learner must enable push notifications in both the app and their browser or device settings.
- Learning emails go to verified email addresses. Configure `EMAIL_API_KEY`, `EMAIL_FROM`, `ACCOUNT_ACTION_URL`, and `ACCOUNT_EMAIL_KEY` together. The sender domain must be verified in Resend.
- In staging, verify delivery with a real push subscription and a verified test email address. Check retry behavior and queue status as well. Local automated tests simulate transport responses.

Pagination uses `page` (default 1) and `limit` (default 20, max 100). Cards also accept `pageSize`. Card ownership is always derived from authentication; passing a `userId` is rejected. Word search accepts `search`, `cefrLevel` and repeated `excludeIds` parameters. List ordering is deterministic. Card and word lists include total counts and total pages; histories return `data` and `total`.

Example bodies:

```json
// POST /auth/register
{"fullName":"Learner","email":"learner@example.com","password":"a-long-private-password"}

// POST /words (admin)
{"text":"apple","cefrLevel":"A1","sense":[{"definition":"A fruit","exampleSentence":"I eat an apple.","translationUz":"olma","orderIndex":0}]}

// POST /words/bulk: {"words":[<word objects>]}
// POST /cards: {"wordId":"<uuid>"}
// POST /cards/bulk: {"wordIds":["<uuid>"]}
// POST /sessions
{"limit":20}

// POST /sessions/:id/tasks/:taskId/review
{"rating":"GOOD","responseMs":1500}

// PATCH /profile
{"timezone":"Asia/Tashkent","dailyNewWords":10}

// POST /games
{"gameType":"meaning_match"}

// POST /assessments/:id/submit or /games/:id/submit
{"answers":["answer for question 1","answer for question 2",""]}
```

### Learning rules

The original repository had no product specification for sessions, assessments or games. The following explicit defaults are implemented and tested:

- Cards start `NEW` and due immediately. Scheduling fields cannot be edited through HTTP. Reviews accept `AGAIN`, `HARD`, `GOOD`, `EASY`; FSRS uses 0.9 retention, no fuzz and no short-term learning steps.
- One active session per learner. Starting again returns the active session. Only due cards are selected, with the learner's daily new-word allowance. The daily allowance counts the first review on the learner's local calendar date.
- A task may be reviewed once. Session/card row locks prevent duplicate reviews; card changes, task completion and review log commit together. A completed session increments the streak at most once per local calendar day, including DST changes. Review grades are self-reported learning feedback.
- Assessment uses 18 questions, three at each CEFR level; the catalog must contain at least three words at every level and four distinct translations overall. Two correct answers out of three pass a level, with consecutive levels required. This is a **vocabulary placement estimate**, not a standardized CEFR certification.
- `meaning_match`: up to 10 multiple-choice vocabulary questions. `word_rush`: up to 20 questions, 60-second expiry. Both require four distinct translations.
- `word_span`: seven words recalled in order. `sequence_memory`: seven digits recalled in order. `visual_grid`: six cell positions in a 4×4 grid, using zero-based string indices. Memory stimuli include `previewMs: 5000`; the frontend must hide the stimulus after preview. These are practice games, with no competitive anti-cheat guarantee.
- Other challenges expire after ten minutes. Submit one string per expected answer, using `""` for skipped answers. The server calculates ten points per correct answer; clients cannot submit scores, correct counts or levels. Replays and expired submissions return 409. Completed result history is retained.
- A card with any task or review history returns 409 on deletion. Pause it to hide it from due queues and future sessions. A pending task in an active session must be completed or the session cancelled before its card can be paused. A word with cards also returns 409 on deletion. Account deletion still cascades to personal data.
- Nested sense updates keep the sense's UUID even when its order changes. A full word replacement matches existing senses by `orderIndex`. If moving a sense, use its nested endpoint to preserve its identity.
- The study plan separates `dueNow` from `availableNow`, which applies the daily new-word allowance. `nextAction` is `RESUME_SESSION`, `START_SESSION`, `DAILY_NEW_LIMIT_REACHED`, `ADD_OR_RESUME_CARDS`, or `CAUGHT_UP`. `forecast` groups currently scheduled future reviews into seven local calendar dates, including the rest of today. It excludes the already-due queue and any rescheduling caused by future reviews. `difficultWords` ranks up to five active words by `AGAIN` ratings in the past 30 days.

## New games and feedback audio by mistake type

The practice mechanics adapt [Easy Vocabulary's public game descriptions](https://easy-vocabulary.com/index.html) to LexiMind's vocabulary catalog. Questions draw on the project's words, Uzbek translations, definitions, example sentences, and audio URLs. The original five games are still available.

| `gameType` | Exercise |
| --- | --- |
| `type_word` | Type the English word from its translation and definition |
| `finish_sentence` | Type the missing English word in a sentence |
| `build_sentence` | Arrange shuffled words into a sentence |
| `word_dictation` | Listen to the catalog's HTTPS pronunciation audio and type the word |
| `mistake_words` | Practice words from the learner's personal mistake queue |

Send `{"gameType":"finish_sentence"}` in a `POST /api/games` request. The question contains either `input: "text"` or `input: "tokens"`. For sentence-building exercises, the frontend joins the selected words with single spaces before submitting them. The question's `audioUrl` is for pronunciation, and the response's `sound.url` is for feedback.

Send `{"index":0,"answer":"appel"}` to `POST /api/games/:id/attempts`. The backend returns the grade, error type, correct answer for that question, and an audio URL if feedback audio is enabled. The last question automatically saves the result. Resubmitting an index returns the previous grade with `replayed: true` and omits the audio URL. After refreshing the page, use `GET /api/games/:id` to retrieve the next index and previous grades. The original `/submit` flow is also available and returns one overall cue for the result. If a round was started with individual attempts, finish it through the same endpoint.

The profile setting for feedback audio is off by default. To enable it, send `{"feedbackAudioEnabled":true}` to `PATCH /api/profile`. When a response includes `sound.url`, the frontend resolves it against the API origin and plays the clip in response to the learner's answer. Moving to the next question stops the previous clip. The answer feedback also appears as text.

| Condition | Cue IDs | Recordings |
| --- | --- | --- |
| Spelling error | `bruh`, `dexter` | BRUH and Dexter |
| Incorrect word or sequence order | `shocked`, `black-suit-spider-man` | Shocked sound and Black Suit Spider-Man |
| Incomplete sentence | `alert`, `galaxy` | Metal Gear alert and Galaxy |
| Skipped question | `huh-cat`, `hub-intro-sound` | HUH? Cat and Hub Intro Sound |
| Incorrect translation | `faah`, `bruh`, `shocked` | FAAAH, BRUH, or Shocked sound |
| Incorrect word in dictation | `huh-cat`, `alert`, `dexter` | HUH? Cat, Metal Gear alert, or Dexter |
| Consecutive mistakes | Expanded pool for the error type | For example, consecutive spelling errors can also play Metal Gear alert |
| Correct answer | `encourage`, `romanceeeeeeeeeeeeee` | Du bist gut genug or Romance |

Rounds rotate through each cue pool from different starting points. The same clip does not play on two consecutive answers. A memory round plays a single cue at the end. Incorrect order, incomplete answers, and skipped rounds are tracked separately.

`assets/feedback-audio/sources.json` lists each clip's name, known source or imported MP3 filename, duration, and measured peak amplitude.

The 12 recordings are mono 48 kHz, 16-bit PCM WAV files. Clips are at most 5.5 seconds long, and longer clips fade out. The manifest records the SHA-256 checksum, duration, and peak amplitude for each WAV file. If the original MP3s are available, run `node scripts/restore-feedback-audio.cjs <ffmpeg> <mp3-directory> <output-directory>` to process them again.

Tests check audio format, amplitude, HTTP delivery, and range responses. Versioned URLs prevent the browser from using stale cached clips. Distortion already present in compressed source files may remain after processing.

### Media storage

Horizontal and vertical WebP versions of the nine preset banners are stored in the frontend's `public` directory. The gallery loads thumbnails on demand. Previously saved banner selections still resolve through their original identifiers.

To serve game audio from an external CDN, set `VITE_FEEDBACK_AUDIO_BASE_URL=https://assets.example.com/feedback-audio/` in the frontend build environment. Upload the WAV files to that location using the same filenames as on the server, after confirming that you have the rights to use and redistribute them. For a public bucket on Cloudflare R2 Standard, connect a production domain and set `Content-Type: audio/wav` and a cache header on the objects. If the CDN is unavailable or unconfigured, the frontend fetches audio from the LexiMind API. [R2 free allowance](https://developers.cloudflare.com/r2/pricing/) · [Public buckets and custom domains](https://developers.cloudflare.com/r2/buckets/public-buckets/)

The mistake queue is populated from vocabulary questions in completed games. Answering a word correctly in `mistake_words` removes it from the queue. Errors that occur later in a concurrent round are retained. If the catalog has no suitable example sentences or pronunciation recordings, the corresponding mode returns `409`.

### Comparison with Easy Vocabulary

The [English-language games menu](https://easy-vocabulary.com/game/games.html?lang=en) groups exercises by level and topic. The public catalog also includes picture selection, matching pairs, word searches, verb tense exercises, and pronunciation imitation. LexiMind's word dictation uses recordings of individual words. Sentence dictation requires a separate audio URL for each example sentence. Filtering word selection by topic and CEFR level would be a useful next improvement.

## Deploying on Render

[`render.yaml`](render.yaml) creates a free Node.js backend in Frankfurt and a Render Static Site for the React frontend. An SPA rewrite supports direct visits to `/register`, `/account-action`, and referral links. Deployments are started manually. [Render Blueprint](https://render.com/docs/blueprint-spec)

1. Create a separate cloud PostgreSQL database for LexiMind. For example, Neon Free offers 1 GB per project. Render Free PostgreSQL expires after 30 days. You do not need to copy existing local users into this database. [Neon Free](https://neon.com/blog/neon-free-plan-1-gb-per-project) · [Render Free](https://render.com/docs/free)
2. Set `DATABASE_URL` on the backend to the new PostgreSQL connection URL with TLS. Set `CORS_ORIGINS` to the frontend's HTTPS origin and `ACCOUNT_ACTION_URL` to its `/account-action` page. At startup, the backend applies migrations and seeds the starter vocabulary.
3. Verify a sender in Brevo and set `BREVO_API_KEY` and `BREVO_FROM_EMAIL` in the Render backend environment. Generate a new `ACCOUNT_EMAIL_KEY` with `node -p "require('node:crypto').randomBytes(32).toString('hex')"`. Render Free blocks Gmail's SMTP ports. Brevo and Resend can send one-time codes through their HTTPS APIs. [Brevo transactional email guide](https://developers.brevo.com/docs/send-a-transactional-email)
4. Set `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, and `CLOUDINARY_API_SECRET` on the backend only. Set `VITE_API_BASE_URL` on the frontend to the backend's HTTPS URL ending in `/api`.
5. Run the extended vocabulary import below once against the cloud database. At the public URL, check API readiness, `/register?ref=…`, one-time code delivery, and media loading. Render Free spins down idle services, and background tasks run while the service is active. [Render Free](https://render.com/docs/free)

### Extended English vocabulary

The importer uses the [Princeton WordNet 3.0 archive](https://raw.githubusercontent.com/nltk/nltk_data/gh-pages/packages/corpora/wordnet.zip), [UzWordnet 1.0](https://raw.githubusercontent.com/LDKR-Group/UzWordnet/4b983edc3e922e5565d8ac5affed37143646f6fa/files/uzwordnet.json), [CEFR-J 1.5](https://raw.githubusercontent.com/openlanguageprofiles/olp-en-cefrj/d4e45b75b38f27b30dfc5c44d8c571aec7e7092f/cefrj-vocabulary-profile-1.5.csv), and [Octanove C1/C2 1.0](https://raw.githubusercontent.com/openlanguageprofiles/olp-en-cefrj/d4e45b75b38f27b30dfc5c44d8c571aec7e7092f/octanove-vocabulary-profile-c1c2-1.0.csv). Extract the WordNet ZIP archive and pass the directory containing `data.noun`, `data.verb`, `data.adj`, `data.adv`, and `index.sense`.

```sh
npm run db:migrate
npm run db:seed:vocabulary
npm run db:import:vocabulary -- /data/wordnet /data/uzwordnet.json /data/cefr.csv /data/advanced.csv
```

Run the command from `backend/` with `DATABASE_URL` pointing to the intended database. Append `--inspect` to preview coverage before writing to the database. WordNet headwords go into a reference table. Words with a matching Uzbek definition and CEFR level go into the learning catalog. The import preserves existing learning entries and can be rerun without creating duplicates. See the [vocabulary sources file](frontend/public/vocabulary-sources.txt) for sources and license terms.

## Architecture

`domain/` contains entities, invariants, value objects and repository/service contracts. `application/` orchestrates use cases through these contracts and has no NestJS, SQL or HTTP dependency. `infrastructure/` implements persistence, hashing, token generation and FSRS. `presentation/` handles validated DTOs, authorization, explicit response serialization, controllers and dependency composition.

The bounded areas are identity, vocabulary, spaced repetition and challenges. `LearningSession` controls completion; `Card` controls scheduling invariants; `Challenge` owns result calculation. Transaction-scoped ports keep multi-record operations atomic without exposing SQL clients to application code. Architecture tests enforce inward dependencies. HTTP status mapping lives in the presentation exception filter rather than domain errors.

## Security and operations

- Passwords require 8 characters minimum and at most 72 UTF-8 bytes, are bcrypt-hashed at cost 12, and are never serialized. Unicode inputs cannot silently exceed bcrypt's byte limit.
- Access tokens are cryptographically random 256-bit opaque bearer tokens. Only SHA-256 digests are stored. Sessions expire after seven days by default (`AUTH_TTL_SECONDS`, allowed 300–2592000). Logout and password changes revoke database-backed sessions immediately. Password change/login races are serialized on the user record.
- Authorization is global with explicit public routes. Admin role is checked against the database on every request. Store bearer tokens securely; only serve the API over HTTPS outside local development.
- PostgreSQL-backed fixed-window rate limits are shared across replicas: 120 requests/minute per route/IP by default, registration 5, login 10, assessment creation 5 and game creation 10. Deploy an ingress/WAF with its own edge rate limit for internet-facing traffic. The application does not trust forwarded IP headers by default; account for this when configuring a reverse proxy.
- Helmet headers, exact-origin CORS, 256 KB body limit, DTO validation, parameterized SQL, sanitized errors and request IDs are enabled. Logs contain route templates, status and elapsed time; credentials, tokens, request bodies and SQL parameters are excluded.
- `DB_POOL_MAX` defaults to 10 per replica. Connection timeout is 5 seconds and statement timeout 10 seconds. Shutdown closes the pool. Use PostgreSQL TLS with certificate verification, least-privilege runtime credentials, backups and restore drills in the target environment.
- Run `npm run db:cleanup` periodically using your deployment scheduler to remove expired auth/rate-limit records and abandoned challenges. This command does not delete completed learning history.

## Docker files

`backend/Dockerfile` uses separate build and runtime dependency stages, Node 24, a non-root user and readiness health checks. `backend/compose.yaml` defines PostgreSQL, a one-shot migration service and the API with a read-only filesystem, dropped capabilities and resource limits. PostgreSQL has no published host port. The API binds its published port to loopback for use behind a TLS reverse proxy.

Set `POSTGRES_PASSWORD` and `COMPOSE_DATABASE_URL` consistently; use host `db` in the latter and percent-encode special password characters. `docker compose config --quiet` validates configuration without starting anything. `docker compose up --build` is an operator action when deployment is desired. No container deployment was performed during this implementation. The local verification checked Compose syntax; the CI workflow includes an image build.

## Verification

```sh
npm run check
npm audit --omit=dev
```

`npm run check` runs strict TypeScript checking, ESLint, domain/architecture unit tests, a release build, and PostgreSQL integration/API tests. Set `TEST_DATABASE_URL` to a dedicated test server with a role that can create databases. Tests create random `leximind_test_*` databases and drop only databases created by that run; they never use the application's `.env` database as the test database. CI provisions PostgreSQL 18 automatically.

Integration coverage includes real HTTP validation and authorization, authentication, transaction rollback, concurrent session creation/reviews/submissions, all game types, password revocation, rate limiting, fresh migrations and legacy migration adoption/checksums. This verifies functional behavior, not a production capacity target; load testing and operational monitoring must use the actual deployment topology.

The implementation audit reported zero production dependency vulnerabilities. Development tooling still has upstream low/moderate advisories (Jest/Nest CLI glob/deepmerge chains); they are excluded from the runtime image and must be tracked during toolchain upgrades. Breaking automatic upgrades were not forced.

Reference documentation: [NestJS validation](https://docs.nestjs.com/techniques/validation), [rate limiting](https://docs.nestjs.com/security/rate-limiting), [authorization](https://docs.nestjs.com/security/authorization).

### Operations and verification

- The readiness check compares the checksums of all SQL migrations in the release with the records in the database. Startup also verifies the SHA-256 checksums of the 12 active audio files. If an audio file or migration does not match, `/api/health/ready` returns 503. Liveness reports the process status independently.
- When using a reverse proxy, list only trusted proxy IP addresses or CIDR ranges that you control in `TRUSTED_PROXIES`. With an empty setting, the application ignores externally supplied `X-Forwarded-For` headers.
- Integration tests exercise the operations documented in Swagger over HTTP. They also check access across accounts, concurrent profile updates, notification delivery, audio range requests, and migration checksum failures.
- Run `npm run db:migrate` to apply the new indexes. Previous migrations are retained.

### Post-audit updates

- `006_catalog_and_account_actions.sql` requires permission to enable the PostgreSQL `pg_trgm` extension. The `account_actions` table stores one-time email actions. `npm run db:seed:vocabulary` inserts 30 starter words and their meanings, preserving existing catalog entries on subsequent runs.
- `GET /api/words` accepts `topic` for topic filtering and `after` for cursor-based pagination. Send the returned `nextCursor` in the next request. Restart pagination when filters change. The original `page` parameter remains available. Words and their senses are read from the same database snapshot.
- `POST /api/games` also accepts `topic` and `cefrLevel`. Vocabulary-based modes draw a fresh sample from the matching catalog entries each time. The `sentence_dictation` mode uses the HTTPS recording at `exampleAudioUrl` that an admin adds to a word sense. Starter vocabulary entries have no audio.
- For email verification and password resets, set `SMTP_EMAIL` in `backend/.env` to the Gmail address and `SMTP_PASS` to its Google App Password. `ACCOUNT_EMAIL_KEY` is a 32-byte hex-encoded key that protects one-time codes and the email queue. Enable two-step verification to obtain a Google App Password. Generate the key once with `node -p "require('node:crypto').randomBytes(32).toString('hex')"` and store it securely.
- A six-digit code is valid for ten minutes and is locked after five incorrect attempts. To include a link in the email, set `ACCOUNT_ACTION_URL` to the frontend's HTTPS `/account-action` URL. For delivery through Resend, set `EMAIL_API_KEY`, `EMAIL_FROM`, `ACCOUNT_ACTION_URL`, and `ACCOUNT_EMAIL_KEY`. If both Gmail and Resend are configured, account emails are sent through Gmail. Restart the backend after changing these settings.
- Email action endpoints are `POST /api/auth/email-verification/request`, `POST /api/auth/email-verification/confirm`, `POST /api/auth/password-reset/request`, and `POST /api/auth/password-reset/confirm`. Send `email` when requesting a code, `token` when confirming email verification, and `token` plus the new `password` when confirming a reset. The request endpoint returns 503 if email delivery is unconfigured. Existing users are not required to verify their email to sign in.
- The admin endpoint `GET /api/ops/metrics` exposes request counts and a latency histogram. `ops/prometheus-alerts.yml` defines alert rules. Provisioning Prometheus and configuring alert destinations depend on the deployment environment. Cleanup runs every 15 minutes and removes expired records in batches of up to 1,000.
- HTTP logs include a `traceId`. The API uses the ID from a valid W3C `traceparent` header or generates a new one, then returns it in `X-Trace-Id`. This allows requests and responses to be correlated at the HTTP layer. No separate span collector is configured.
