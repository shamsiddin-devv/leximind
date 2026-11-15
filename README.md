# LexiMind backend

NestJS API for vocabulary learning, FSRS spaced repetition, learner profiles, placement practice and eleven learning games. Node.js 24 and PostgreSQL 18 are the tested runtime versions.

## Local setup

1. Run `npm ci`.
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
- `005_operational_indexes.sql` karta va so‘z bog‘lanishi, o‘yinlar tarixi hamda muddati tugagan raundlarni tozalash uchun indekslar qo‘shadi.

For an existing installation, back up the database, verify that it matches the original schema, and test a restore in staging. Then run `npm run db:migrate -- --adopt-existing`. This explicitly records the baseline and applies the upgrade. Duplicate normalized emails/words, duplicate profiles, duplicate active sessions, invalid sense indexes or scheduling data stop the migration instead of being silently deleted. Correct such historical records before retrying. Legacy timestamp columns are interpreted as UTC; convert historical local timestamps before adoption if necessary.

Migrations use a PostgreSQL advisory lock, a transaction per migration, and SHA-256 checksums. Never edit an applied migration; add a new numbered SQL file and update readiness to the new required version. SQL migrations are authoritative for constraints and indexes; the Drizzle schema supplies application types. Do not use `drizzle-kit push` against production. Historical files under `src/infrastructure/db/drizzle/migrations/` are retained for reference and are not executed by the new runner.

## API workflows

All routes below use `/api`. Authentication is required except registration, login and health. Send `Authorization: Bearer <accessToken>`. IDs are UUIDs, unknown body/query fields are rejected, optional fields accept omission but not `null`, and bulk requests are bounded.

| Area | Routes | Behavior |
| --- | --- | --- |
| Authentication | `POST /auth/register`, `POST /auth/login`, `POST /auth/logout` | Register, issue a session, revoke the current session |
| Account | `GET/PATCH/DELETE /users/me`, `PATCH /users/me/password` | Own account; password changes revoke all sessions |
| Administration | `GET /users`, `GET /users/:id` | Admin only, paginated user list |
| Vocabulary | `GET /words`, `GET /words/:id` | Search, CEFR filter and pagination |
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

## Yangi o‘yinlar va xatoga qarab ovoz

Mashq mexanikalari [Easy Vocabulary’ning ochiq o‘yinlar tavsifi](https://easy-vocabulary.com/index.html) asosida LexiMind lug‘atiga moslab yozildi. Savollar loyihadagi so‘zlar, o‘zbekcha tarjimalar, ma’nolar, misol gaplar va audio URL’lardan olinadi. Oldingi beshta o‘yin ham mavjud.

| `gameType` | Mashq |
| --- | --- |
| `type_word` | Tarjima va ta’rifdan inglizcha so‘zni yozish |
| `finish_sentence` | Gapdagi bo‘sh joyga inglizcha so‘zni yozish |
| `build_sentence` | Aralashtirilgan so‘zlardan gap tuzish |
| `word_dictation` | Lug‘atdagi HTTPS talaffuz audiosini tinglab so‘zni yozish |
| `mistake_words` | Shaxsiy xato so‘zlar navbatidan mashq qilish |

`POST /api/games` so‘rovida `{"gameType":"finish_sentence"}` yuboriladi. Savol `input: "text"` yoki `input: "tokens"` bilan keladi. Gap tuzish uchun frontend tanlangan so‘zlarni bitta bo‘sh joy bilan birlashtirib yuboradi. Savol ichidagi `audioUrl` talaffuz uchun, javobdagi `sound.url` esa feedback uchun ishlatiladi.

`POST /api/games/:id/attempts` uchun `{"index":0,"answer":"appel"}` yuboring. Backend bahoni, xato turini, o‘sha savolning to‘g‘ri javobini va sozlama yoqilgan bo‘lsa audio URL’ni qaytaradi. Oxirgi savol natijani avtomatik saqlaydi. Qayta yuborilgan indeks avvalgi bahoni `replayed: true` bilan qaytaradi. Bunday javobda ovoz qayta yuborilmaydi. `GET /api/games/:id` orqali sahifa yangilangach navbatdagi indeksni va oldingi baholarni olish mumkin. Eski `/submit` oqimi ham mavjud va natija uchun bitta umumiy signal beradi. Boshlangan individual urinishlar shu urinishlar orqali yakunlanadi.

Ovoz profil sozlamasida sukut bo‘yicha o‘chiq. `PATCH /api/profile` orqali `{"feedbackAudioEnabled":true}` yuboriladi. Frontend `sound.url` bo‘lsa API originiga nisbatan ochib, foydalanuvchining javob berish harakati bilan bog‘liq holda ijro etadi. Yangi cue chalinganda oldingisini to‘xtatish va matnli feedback’ni ham ko‘rsatish mumkin.

| Holat | Cue ID’lari | Yozuvlar |
| --- | --- | --- |
| Imlo xatosi | `bruh`, `dexter` | BRUH va Dexter |
| So‘z yoki ketma-ketlik tartibi xato | `shocked`, `black-suit-spider-man` | Shocked sound va Black Suit Spider-Man |
| Chala gap | `alert`, `galaxy` | Metal Gear alert va Galaxy |
| Savol tashlab ketildi | `huh-cat`, `hub-intro-sound` | HUH? Cat va Hub Intro Sound |
| Boshqa noto‘g‘ri javob | `faah`, `patrick-jane`, `chicken-on-tree-screaming` | FAAAH, Patrick Jane va Chicken on Tree Screaming |
| Xato so‘z to‘g‘ri topildi | `encourage`, `romanceeeeeeeeeeeeee` | Du bist gut genug va Romance |

O‘yin ovozlarining nomi, ma’lum manbasi yoki import qilingan MP3 nomi, davomiyligi va o‘lchangan peak qiymati `assets/feedback-audio/sources.json` faylida.

13 ta yozuv mono, 48 kHz, 16-bit PCM WAV formatida. Yangi beshta klipda sample peak −4 dBFS dan oshmaydi. Manifestda har bir WAV uchun SHA-256, ilgari filtrlangan kliplar uchun esa qo‘shimcha audio o‘lchovlari bor. Asl MP3 fayllar mavjud bo‘lsa, `node scripts/restore-feedback-audio.cjs <ffmpeg> <mp3-katalogi> <chiqish-katalogi>` orqali yozuvlarni qayta ishlash mumkin.

Testlar format, amplituda, HTTP orqali yuklash va range javoblarini tekshiradi. Yangi URL versiyasi eskirgan keshdan foydalanishning oldini oladi. Siqilgan manbada oldindan mavjud buzilishlar to‘liq tiklanishi kafolatlanmaydi.

Xato navbati tugallangan o‘yinlarning so‘zli savollaridan to‘ldiriladi. O‘quvchi `mistake_words` mashqida so‘zni to‘g‘ri topganda u navbatdan chiqadi. Parallel raundda undan keyin yuz bergan xato saqlanadi. Lug‘atda mos misol gap yoki talaffuz yozuvi bo‘lmasa, tegishli rejim `409` qaytaradi.

### Easy Vocabulary bilan solishtirish

[Inglizcha o‘yinlar menyusi](https://easy-vocabulary.com/game/games.html?lang=en) mashqlarni daraja va mavzularga ajratadi. Ochiq katalogda rasm tanlash, juftlik topish, so‘z qidirish, fe’l zamonlari va talaffuzga taqlid mashqlari ham bor. LexiMind’ning diktanti so‘z talaffuzidan foydalanadi. Gap diktanti uchun har bir misol gapga alohida audio manzili kerak bo‘ladi. So‘z tanlashda keyingi foydali o‘zgarish mavzu va CEFR darajasi bo‘yicha filtrlashdir.

## Architecture

`domain/` contains entities, invariants, value objects and repository/service contracts. `application/` orchestrates use cases through these contracts and has no NestJS, SQL or HTTP dependency. `infrastructure/` implements persistence, hashing, token generation and FSRS. `presentation/` handles validated DTOs, authorization, explicit response serialization, controllers and dependency composition.

The bounded areas are identity, vocabulary, spaced repetition and challenges. `LearningSession` controls completion; `Card` controls scheduling invariants; `Challenge` owns result calculation. Transaction-scoped ports keep multi-record operations atomic without exposing SQL clients to application code. Architecture tests enforce inward dependencies. HTTP status mapping lives in the presentation exception filter rather than domain errors.

## Security and operations

- Passwords require 12 characters minimum and at most 72 UTF-8 bytes, are bcrypt-hashed at cost 12, and are never serialized. Unicode inputs cannot silently exceed bcrypt's byte limit.
- Access tokens are cryptographically random 256-bit opaque bearer tokens. Only SHA-256 digests are stored. Sessions expire after seven days by default (`AUTH_TTL_SECONDS`, allowed 300–2592000). Logout and password changes revoke database-backed sessions immediately. Password change/login races are serialized on the user record.
- Authorization is global with explicit public routes. Admin role is checked against the database on every request. Store bearer tokens securely; only serve the API over HTTPS outside local development.
- PostgreSQL-backed fixed-window rate limits are shared across replicas: 120 requests/minute per route/IP by default, registration 5, login 10, assessment creation 5 and game creation 10. Deploy an ingress/WAF with its own edge rate limit for internet-facing traffic. The application does not trust forwarded IP headers by default; account for this when configuring a reverse proxy.
- Helmet headers, exact-origin CORS, 256 KB body limit, DTO validation, parameterized SQL, sanitized errors and request IDs are enabled. Logs contain route templates, status and elapsed time; credentials, tokens, request bodies and SQL parameters are excluded.
- `DB_POOL_MAX` defaults to 10 per replica. Connection timeout is 5 seconds and statement timeout 10 seconds. Shutdown closes the pool. Use PostgreSQL TLS with certificate verification, least-privilege runtime credentials, backups and restore drills in the target environment.
- Run `npm run db:cleanup` periodically using your deployment scheduler to remove expired auth/rate-limit records and abandoned challenges. This command does not delete completed learning history.

## Docker files

`Dockerfile` uses separate build and runtime dependency stages, Node 24, a non-root user and readiness health checks. `compose.yaml` defines PostgreSQL, a one-shot migration service and the API with a read-only filesystem, dropped capabilities and resource limits. PostgreSQL has no published host port. The API binds its published port to loopback for use behind a TLS reverse proxy.

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

### Ishlatish va tekshirish

- Readiness release ichidagi barcha SQL migratsiyalari checksum’ini bazadagi yozuv bilan solishtiradi. Ishga tushishda 13 ta faol audio faylning SHA-256 qiymati ham tekshiriladi. Fayl yoki migratsiya mos kelmasa `/api/health/ready` 503 qaytaradi, liveness esa jarayon holatini alohida bildiradi.
- Reverse proxy ishlatilganda `TRUSTED_PROXIES`ga faqat boshqariladigan proxy IP yoki CIDR qiymatlari kiritiladi. Bo‘sh sozlamada tashqaridan berilgan `X-Forwarded-For` ishonchli hisoblanmaydi.
- Integratsion test Swagger’da ko‘rsatilgan 61 ta API amali uchun muvaffaqiyatli HTTP javobi bo‘lishini talab qiladi. Shuningdek, ruxsatlar, bir vaqtdagi profil tahrirlari, audio range va migratsiya checksum xatolari tekshiriladi.
- Yangi indekslarni qo‘llash uchun `npm run db:migrate` ishlatiladi. Avvalgi migratsiyalar saqlangan.

### Auditdan keyingi yangilanishlar

- `006_catalog_and_account_actions.sql` uchun PostgreSQL'da `pg_trgm` extensionini yoqish huquqi kerak. Yangi jadval `account_actions` bir martalik email amallarini saqlaydi. `npm run db:seed:vocabulary` 24 ta boshlang‘ich so‘z va ma’noni kiritadi. Qayta ishlatilganda mavjud lug‘at yozuvlarini almashtirmaydi.
- `GET /api/words` mavzu uchun `topic` va keyingi sahifa uchun `after` qabul qiladi. Javobdagi `nextCursor` keyingi so‘rovga yuboriladi. Filtrlar o‘zgarsa sahifalashni boshidan boshlash kerak. Eski `page` parametri ishlaydi. So‘z va ma’nolar o‘qilishi bitta DB snapshot ichida bajariladi.
- `POST /api/games` qo‘shimcha `topic` va `cefrLevel` qabul qiladi. Lug‘atli rejimlarda har safar mos katalog bo‘yicha yangi namuna tanlanadi. `sentence_dictation` rejimi admin so‘z ma’nosiga qo‘shgan HTTPS `exampleAudioUrl` yozuvidan foydalanadi. Boshlang‘ich lug‘at so‘zlarida audio yo‘q.
- Email uchun `EMAIL_API_KEY`, `EMAIL_FROM`, `ACCOUNT_ACTION_URL` va `ACCOUNT_EMAIL_KEY` birga sozlanadi. Oxirgisi 32 bayt tasodifiy hex kalit. `ACCOUNT_ACTION_URL` frontend sahifasi bo‘lib, URL fragmentidan `action` va `token`ni o‘qiydi, keyin tegishli confirm endpointiga yuboradi. Xatlar shifrlangan navbatdan yuboriladi. SMTP yoki boshqa transport o‘rnida bu adapter Resend HTTPS API ishlatadi.
- Email amallari `POST /api/auth/email-verification/request`, `POST /api/auth/email-verification/confirm`, `POST /api/auth/password-reset/request`, `POST /api/auth/password-reset/confirm`. Request uchun `email`, tasdiqlash uchun `token`, parolni tiklash uchun `token` va yangi `password` yuboriladi. Xat yetkazish sozlanmagan bo‘lsa request endpointi 503 qaytaradi. Mavjud foydalanuvchilar kirishi uchun email tasdiqlash majburiy qilinmagan.
- Admin uchun `GET /api/ops/metrics` so‘rovlar soni va kechikish histogramini beradi. `ops/prometheus-alerts.yml` ogohlantirish qoidalarini beradi. Tashqi Prometheus va ogohlantirish manzilini o‘rnatish muhit sozlamasiga bog‘liq. Eskirgan yozuvlar har 15 daqiqada 1000 tagacha paketlarda tozalanadi.
- HTTP loglarida `traceId` bor. API yaroqli W3C `traceparent` qiymatidan ID oladi yoki yangi ID yaratadi va javobda `X-Trace-Id` orqali beradi. Bu HTTP qatlamidagi bog‘lash uchun xizmat qiladi. Alohida span qabul qiluvchi servis ulanmagan.
