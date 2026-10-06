import { relations } from "drizzle-orm/_relations";
import { integer, pgTable, varchar, text, timestamp, pgEnum, uuid, boolean, real, unique } from "drizzle-orm/pg-core";

export const cefrLevels = pgEnum('cefr_level', ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'])
export const sessionStatus = pgEnum('session_status', ['in_progress', 'completed'])
export const gameTypes = pgEnum('game_type', ['word_span', 'sequence_memory', 'meaning_match', 'visual_grid', 'word_rush'])

export const users = pgTable("users", {
  id: uuid('id').defaultRandom().primaryKey(),
  fullName: varchar('full_name', {length: 255}).notNull(),
  email: varchar({length: 255}).notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').$onUpdate(() => new Date())
});

export const learnerProfiles = pgTable('learner_profiles', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id),
  level: cefrLevels('level').notNull(),
  timezone: text('timezone').notNull().default('UTC'),
  streakDay: integer('streak_day').notNull(),
  dailyNewWords: integer('daily_new_words').notNull(),
  xpMultiplier: integer('xp_multiplier').notNull(),
  lastSessionAt: timestamp('last_session_at').defaultNow().notNull(),
  createdAt: timestamp().defaultNow().notNull(),
  updatedAt: timestamp('updated_at').$onUpdate(() => new Date())
});

export const words = pgTable('words', {
  id: uuid('id').defaultRandom().primaryKey(),
  cefrLevel: cefrLevels('cefr_level').notNull(),
  audioUrl: text('audio_url'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').$onUpdate(() => new Date())
});

export const wordSenses = pgTable('word_senses', {
  id: uuid('id').defaultRandom().primaryKey(),
  wordId: uuid('word_id').notNull().references(() => words.id),
  definition: varchar('definition', {length: 255}).notNull(),
  exampleSentence: varchar('example_sentence', {length: 255}).notNull(),
  translationUz: varchar('translation_uz', {length: 255}).notNull(),
  orderIndex: integer('order_index').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').$onUpdate(() => new Date()),
})

export const cards = pgTable('cards', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id),
  wordId: uuid('word_id').notNull().references(() => words.id),
  stability: real('stability').notNull(),
  difficulty: real('difficulty').notNull(),
  due: timestamp('due').notNull(),
  reps: integer('reps').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').$onUpdate(() => new Date()),
}, (table) => [unique().on(table.userId, table.wordId)])

export const sessions = pgTable('sessions', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id),
  status: varchar('status', {length: 255}).notNull(),
  startedAt: timestamp('started_at').defaultNow().notNull(),
  endedAt: timestamp('ended_at').defaultNow().notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').$onUpdate(() => new Date()),
});

export const sessionsTasks = pgTable('session_tasks', {
  id: uuid('id').defaultRandom().primaryKey(),
  sessionId: uuid('session_id').notNull().references(() => sessions.id),
  cardId: uuid('card_id').notNull().references(() => cards.id),
  format: varchar({length: 255}).notNull(),
  orderIndex: varchar('order_index', {length: 255}).notNull(),
  completed: boolean().notNull(),
  correct: boolean().notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').$onUpdate(() => new Date()),
});

export const reviewLogs = pgTable('review_logs', {
  id: uuid('id').defaultRandom().primaryKey(),
  cardId: uuid('card_id').notNull().references(() => cards.id),
  rating: varchar({length: 255}).notNull(),
  responseMs: integer('response_ms').notNull(),
  reviewedAt: timestamp('reviewed_at').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').$onUpdate(() => new Date()),
});

export const assessmentResults = pgTable('assessment_result', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id),
  resultingLevel: varchar('resulting_level', {length: 255}).notNull(),
  correctCount: integer('correct_count').notNull(),
  totalQuestion: integer('total_question').notNull(),
  takenAt: timestamp('taken_at').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').$onUpdate(() => new Date()),
});

export const gameScores = pgTable('game_scores', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id),
  gameType: gameTypes('game_type').notNull(),
  score: integer().notNull(),
  playedAt: timestamp().notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').$onUpdate(() => new Date()),
});

// Relations

export const usersRelations = relations(users, ({one, many}) => ({
  laernerProfile: one(learnerProfiles),
  assessmentResult: many(assessmentResults),
  session: many(sessions),
  gameScore: many(gameScores),
  card: many(cards),
}));

export const wordsRelations = relations(words, ({many}) => ({
  wordSense: many(wordSenses),
  card: many(cards)
}));

export const learnerProfileRelations = relations(learnerProfiles, ({one}) => ({
  user: one(users, {
    fields: [learnerProfiles.userId],
    references: [users.id]
  }),
}));

export const assessmentRelations = relations(assessmentResults, ({one, many}) => ({
  user: one(users, {
    fields: [assessmentResults.userId],
    references: [users.id]
  }),
}));

export const sessionRelations = relations(sessions, ({one, many}) => ({
  user: one(users, {
    fields: [sessions.userId],
    references: [users.id],
  }),

  sessionTask: many(sessionsTasks)
}));

export const gameRelations = relations(gameScores, ({one}) => ({
  user: one(users, {
    fields: [gameScores.userId],
    references: [users.id]
  }),
}));

export const cardRelations = relations(cards, ({one, many}) => ({
  user: one(users, {
    fields: [cards.userId],
    references: [users.id]
  }),

  word: one(words, {
    fields: [cards.wordId],
    references: [words.id]
  }),

  reviewLog: many(reviewLogs),
  sessionsTask: many(sessionsTasks)
}));

export const wordSensesRelations = relations(wordSenses, ({one}) => ({
  word: one(words)
}));

export const reviewLogsRelations = relations(reviewLogs, ({one}) => ({
  card: one(cards, {
    fields: [reviewLogs.cardId],
    references: [cards.id]
  }),
}));

export const sessionTasksRelations = relations(sessionsTasks, ({one}) => ({
  card: one(cards, {
    fields: [sessionsTasks.cardId],
    references: [cards.id]
  }),

  session: one(sessions, {
    fields: [sessionsTasks.sessionId],
    references: [sessions.id]
  }),
}));

export const gameScoresRelations = relations(gameScores, ({one}) => ({
  user: one(users, {
    fields: [gameScores.userId],
    references: [users.id]
  }),
}));

