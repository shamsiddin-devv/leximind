import {
  integer,
  smallint,
  pgTable,
  varchar,
  text,
  timestamp,
  pgEnum,
  uuid,
  boolean,
  bigint,
  real,
  unique,
  jsonb,
  char,
  primaryKey,
  index,
  check,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

import type { Gender } from '../../../domain/entities/User';
import type { CollectionKind } from '../../../domain/repositories/ICollectionRepository';
import type { ReviewMode } from '../../../domain/repositories/ILearningRepository';
import type { SocialLinks } from '../../../domain/value-objects/ProfileSocialLinks';
import type {
  InterfaceSettings,
  NotificationPreferences,
  ProfileAppearance,
} from '../../../domain/value-objects/UserUiPreferences';

export const cefrLevels = pgEnum('cefr_level', [
  'A1',
  'A2',
  'B1',
  'B2',
  'C1',
  'C2',
]);
export const sessionStatus = pgEnum('session_status', [
  'in_progress',
  'completed',
]);
export const gameTypes = pgEnum('game_type', [
  'word_span',
  'sequence_memory',
  'meaning_match',
  'visual_grid',
  'word_rush',
  'type_word',
  'finish_sentence',
  'build_sentence',
  'word_dictation',
  'sentence_dictation',
  'mistake_words',
]);
export const cardState = pgEnum('card_state', [
  'NEW',
  'LEARNING',
  'REVIEW',
  'RELEARNING',
]);

export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  referralCode: uuid('referral_code').defaultRandom().notNull().unique(),
  fullName: varchar('full_name', { length: 255 }).notNull(),
  email: varchar({ length: 255 }).notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  emailVerifiedAt: timestamp('email_verified_at', { withTimezone: true }),
  avatarUrl: text('avatar_url'),
  avatarPublicId: text('avatar_public_id'),
  bio: varchar({ length: 280 }),
  bioFormat: text('bio_format'),
  countryCode: varchar('country_code', { length: 2 }),
  administrativeRegion: varchar('administrative_region', { length: 100 }),
  streetAddress: varchar('street_address', { length: 160 }),
  addressDetails: varchar('address_details', { length: 250 }),
  phoneVerifiedAt: timestamp('phone_verified_at', { withTimezone: true }),
  city: varchar({ length: 100 }),
  location: varchar({ length: 100 }),
  gender: varchar({ length: 20 }).$type<Gender>(),
  phoneNumber: varchar('phone_number', { length: 16 }),
  socialLinks: jsonb('social_links').$type<SocialLinks>().notNull().default({}),
  profilePublic: boolean('profile_public').notNull().default(false),
  profileSharing: boolean('profile_sharing').notNull().default(false),
  publicStatistics: boolean('public_statistics').notNull().default(false),
  publicCefr: boolean('public_cefr').notNull().default(false),
  publicBio: boolean('public_bio').notNull().default(false),
  publicSocialLinks: boolean('public_social_links').notNull().default(false),
  role: text('role').$type<'user' | 'admin'>().notNull().default('user'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').$onUpdate(() => new Date()),
});

export const phoneVerificationChallenges = pgTable(
  'phone_verification_challenges',
  {
    userId: uuid('user_id')
      .primaryKey()
      .references(() => users.id, { onDelete: 'cascade' }),
    phoneNumber: varchar('phone_number', { length: 13 }).notNull(),
    startHash: char('start_hash', { length: 64 }).notNull().unique(),
    chatId: bigint('chat_id', { mode: 'number' }),
    startUpdateId: bigint('start_update_id', { mode: 'number' }),
    contactUpdateId: bigint('contact_update_id', { mode: 'number' }),
    failedAttempts: smallint('failed_attempts').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  },
  (t) => [
    check(
      'phone_verification_challenges_phone_number_check',
      sql`${t.phoneNumber} ~ '^[+]998[0-9]{9}$'`,
    ),
    check(
      'phone_verification_challenges_failed_attempts_check',
      sql`${t.failedAttempts} BETWEEN 0 AND 5`,
    ),
    index('phone_verification_challenges_chat_idx')
      .on(t.chatId, t.startUpdateId.desc())
      .where(sql`${t.chatId} IS NOT NULL`),
    index('phone_verification_challenges_expiry_idx').on(t.expiresAt),
  ],
);

export const referrals = pgTable('referrals', {
  id: uuid('id').defaultRandom().primaryKey(),
  referrerId: uuid('referrer_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  referredUserId: uuid('referred_user_id')
    .unique()
    .references(() => users.id, { onDelete: 'set null' }),
  rewardXp: smallint('reward_xp').notNull(),
  registeredAt: timestamp('registered_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
  rewardedAt: timestamp('rewarded_at', { withTimezone: true }),
});

export const learnerProfiles = pgTable('learner_profiles', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  level: cefrLevels('level').notNull(),
  studyLevel: cefrLevels('study_level'),
  timezone: text('timezone').notNull().default('UTC'),
  streakDay: integer('streak_day').notNull(),
  dailyNewWords: integer('daily_new_words').notNull(),
  dailyStudyMinutes: integer('daily_study_minutes').notNull().default(15),
  reviewMode: varchar('review_mode', { length: 8 })
    .$type<ReviewMode>()
    .notNull()
    .default('spaced'),
  studyReminderEnabled: boolean('study_reminder_enabled')
    .notNull()
    .default(false),
  studyReminderTime: varchar('study_reminder_time', { length: 5 })
    .notNull()
    .default('19:00'),
  autoplayPronunciation: boolean('autoplay_pronunciation')
    .notNull()
    .default(false),
  feedbackAudioEnabled: boolean('feedback_audio_enabled')
    .notNull()
    .default(true),
  xpMultiplier: integer('xp_multiplier').notNull(),
  lastSessionAt: timestamp('last_session_at'),
  createdAt: timestamp().defaultNow().notNull(),
  updatedAt: timestamp('updated_at').$onUpdate(() => new Date()),
});

export const words = pgTable(
  'words',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    text: text().notNull(),
    cefrLevel: cefrLevels('cefr_level').notNull(),
    audioUrl: text('audio_url'),
    topic: varchar('topic', { length: 60 }),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').$onUpdate(() => new Date()),
  },
  (table) => [unique().on(table.cefrLevel, table.text)],
);

export const wordSenses = pgTable('word_senses', {
  id: uuid('id').defaultRandom().primaryKey(),
  wordId: uuid('word_id')
    .notNull()
    .references(() => words.id, { onDelete: 'cascade' }),
  definition: varchar('definition', { length: 255 }).notNull(),
  exampleSentence: varchar('example_sentence', { length: 255 }).notNull(),
  exampleAudioUrl: text('example_audio_url'),
  translationUz: varchar('translation_uz', { length: 255 }).notNull(),
  orderIndex: integer('order_index').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').$onUpdate(() => new Date()),
});

export const cards = pgTable(
  'cards',
  {
    collectionPinned: boolean('collection_pinned'),
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    wordId: uuid('word_id')
      .notNull()
      .references(() => words.id, { onDelete: 'restrict' }),
    stability: real('stability').notNull(),
    difficulty: real('difficulty').notNull(),
    due: timestamp('due').notNull(),
    reps: integer('reps').notNull(),
    state: cardState().notNull(),
    lapses: integer().notNull(),
    lastReviewAt: timestamp('last_review_at'),
    pausedAt: timestamp('paused_at', { withTimezone: true }),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').$onUpdate(() => new Date()),
  },
  (table) => [unique().on(table.userId, table.wordId)],
);

export const sessions = pgTable('sessions', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  status: varchar('status', { length: 255 }).notNull(),
  startedAt: timestamp('started_at').defaultNow().notNull(),
  endedAt: timestamp('ended_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').$onUpdate(() => new Date()),
});

export const avatarCleanupJobs = pgTable(
  'avatar_cleanup_jobs',
  {
    publicId: text('public_id').primaryKey(),
    nextAttemptAt: timestamp('next_attempt_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    attempts: integer('attempts').notNull().default(0),
    leaseId: uuid('lease_id'),
  },
  (table) => [
    check('avatar_cleanup_jobs_attempts_check', sql`${table.attempts} >= 0`),
    index('avatar_cleanup_jobs_due_idx').on(
      table.nextAttemptAt,
      table.publicId,
    ),
  ],
);

export const collectionEntries = pgTable(
  'collection_entries',
  {
    collectionPinned: boolean('collection_pinned'),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    id: uuid().notNull(),
    kind: varchar({ length: 8 }).$type<CollectionKind>().notNull(),
    text: varchar({ length: 255 }).notNull(),
    translation: varchar({ length: 255 }).notNull(),
    example: varchar({ length: 500 }).notNull().default(''),
    topic: varchar({ length: 80 }).notNull().default(''),
    progress: integer().notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (table) => [
    primaryKey({ columns: [table.userId, table.id] }),
    index('collection_entries_user_date')
      .on(table.userId, table.createdAt.desc(), table.id)
      .where(sql`${table.deletedAt} IS NULL`),
    check(
      'collection_entries_kind_check',
      sql`${table.kind} IN ('word', 'phrase', 'sentence')`,
    ),
    check(
      'collection_entries_check',
      sql`${table.deletedAt} IS NOT NULL OR (btrim(${table.text}) <> '' AND btrim(${table.translation}) <> '')`,
    ),
    check(
      'collection_entries_progress_check',
      sql`${table.progress} BETWEEN 0 AND 100`,
    ),
  ],
);

export const sessionsTasks = pgTable('session_tasks', {
  id: uuid('id').defaultRandom().primaryKey(),
  sessionId: uuid('session_id')
    .notNull()
    .references(() => sessions.id, { onDelete: 'cascade' }),
  cardId: uuid('card_id')
    .notNull()
    .references(() => cards.id, { onDelete: 'cascade' }),
  format: varchar({ length: 255 }).notNull(),
  orderIndex: integer('order_index').notNull(),
  completed: boolean().notNull(),
  correct: boolean(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').$onUpdate(() => new Date()),
});

export const reviewLogs = pgTable('review_logs', {
  id: uuid('id').defaultRandom().primaryKey(),
  cardId: uuid('card_id')
    .notNull()
    .references(() => cards.id, { onDelete: 'cascade' }),
  rating: varchar({ length: 255 }).notNull(),
  responseMs: integer('response_ms').notNull(),
  reviewedAt: timestamp('reviewed_at').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').$onUpdate(() => new Date()),
});

export const assessmentResults = pgTable('assessment_result', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  resultingLevel: varchar('resulting_level', { length: 255 }).notNull(),
  correctCount: integer('correct_count').notNull(),
  totalQuestion: integer('total_question').notNull(),
  takenAt: timestamp('taken_at').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').$onUpdate(() => new Date()),
});

export const gameScores = pgTable('game_scores', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  gameType: gameTypes('game_type').notNull(),
  score: integer().notNull(),
  playedAt: timestamp().notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').$onUpdate(() => new Date()),
});

// SQL migrations are authoritative for indexes, checks and partial constraints.
export const authSessions = pgTable('auth_sessions', {
  id: uuid().defaultRandom().primaryKey(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  tokenHash: char('token_hash', { length: 64 }).notNull().unique(),
  userAgent: varchar('user_agent', { length: 512 }),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  accessExpiresAt: timestamp('access_expires_at', { withTimezone: true }),
  refreshTokenHash: char('refresh_token_hash', { length: 64 }).unique(),
  createdAt: timestamp('created_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
});
export const usedSessionRefreshTokens = pgTable('used_session_refresh_tokens', {
  tokenHash: char('token_hash', { length: 64 }).primaryKey(),
  sessionId: uuid('session_id')
    .notNull()
    .references(() => authSessions.id, { onDelete: 'cascade' }),
});
export const accountActions = pgTable('account_actions', {
  tokenHash: char('token_hash', { length: 64 }).primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }),
  email: varchar({ length: 255 }).notNull(),
  kind: text().notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  encryptedToken: text('encrypted_token'),
  deliverAfter: timestamp('deliver_after', { withTimezone: true })
    .notNull()
    .defaultNow(),
  deliveryAttempts: integer('delivery_attempts').notNull().default(0),
  otpHash: char('otp_hash', { length: 64 }),
  otpExpiresAt: timestamp('otp_expires_at', { withTimezone: true }),
  otpAttempts: smallint('otp_attempts').notNull().default(0),
});
export const rateLimits = pgTable('rate_limits', {
  key: text().primaryKey(),
  hits: integer().notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  blockedUntil: timestamp('blocked_until', { withTimezone: true }),
});
export const challenges = pgTable('challenges', {
  id: uuid().defaultRandom().primaryKey(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  kind: text().notNull(),
  payload: jsonb().notNull(),
  answers: jsonb().notNull(),
  attempts: jsonb().notNull().default([]),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  completedAt: timestamp('completed_at', { withTimezone: true }),
  result: jsonb(),
  createdAt: timestamp('created_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const gameMistakes = pgTable(
  'game_mistakes',
  {
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    wordId: uuid('word_id')
      .notNull()
      .references(() => words.id, { onDelete: 'cascade' }),
    misses: integer().notNull(),
    lastMissedAt: timestamp('last_missed_at', { withTimezone: true }).notNull(),
  },
  (table) => [primaryKey({ columns: [table.userId, table.wordId] })],
);

export const mistakeNotebookEntries = pgTable(
  'mistake_notebook_entries',
  {
    id: uuid().defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    challengeId: uuid('challenge_id').references(() => challenges.id, {
      onDelete: 'set null',
    }),
    questionIndex: integer('question_index').notNull(),
    kind: text().notNull(),
    question: jsonb().notNull(),
    expectedAnswer: varchar('expected_answer', { length: 255 }).notNull(),
    submittedAnswer: varchar('submitted_answer', { length: 255 }),
    reason: text(),
    occurredAt: timestamp('occurred_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    resolvedAt: timestamp('resolved_at', { withTimezone: true }),
  },
  (table) => [
    unique('mistake_notebook_entries_challenge_id_question_index_key').on(
      table.challengeId,
      table.questionIndex,
    ),
    index('mistake_notebook_owner_date').on(
      table.userId,
      table.occurredAt.desc(),
      table.id,
    ),
    check(
      'mistake_notebook_entries_question_index_check',
      sql`${table.questionIndex} BETWEEN 0 AND 29`,
    ),
    check(
      'mistake_notebook_entries_reason_check',
      sql`${table.reason} IN ('skipped', 'typo', 'word_order', 'incomplete', 'incorrect')`,
    ),
  ],
);

export const userUiPreferences = pgTable('user_ui_preferences', {
  userId: uuid('user_id')
    .primaryKey()
    .references(() => users.id, { onDelete: 'cascade' }),
  appearance: jsonb('appearance').$type<ProfileAppearance>(),
  notifications: jsonb('notifications').$type<NotificationPreferences>(),
  interfaceSettings: jsonb('interface_settings').$type<InterfaceSettings>(),
  bannerPublicId: text('banner_public_id'),
});
