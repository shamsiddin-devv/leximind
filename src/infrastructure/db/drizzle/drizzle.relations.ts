import { defineRelations } from "drizzle-orm";
import * as schema from './drizzle.schema';

export const relations = defineRelations(schema, (r) => ({
  users: {
    learnerProfile: r.one.learnerProfiles({
      from: r.users.id,
      to: r.learnerProfiles.userId,
    }),

    assessmentResults: r.many.assessmentResults(),

    sessions: r.many.sessions(),

    gameScores: r.many.gameScores(),

    cards: r.many.cards(),
  },

  learnerProfiles: {
    user: r.one.users({
      from: r.learnerProfiles.userId,
      to: r.users.id,
    }),
  },

  words: {
    wordSenses: r.many.wordSenses(),

    cards: r.many.cards(),
  },

  wordSenses: {
    word: r.one.words({
      from: r.wordSenses.wordId,
      to: r.words.id,
    }),
  },

  cards: {
    user: r.one.users({
      from: r.cards.userId,
      to: r.users.id,
    }),

    word: r.one.words({
      from: r.cards.wordId,
      to: r.words.id,
    }),

    reviewLogs: r.many.reviewLogs(),

    sessionTasks: r.many.sessionsTasks(),
  },

  sessions: {
    user: r.one.users({
      from: r.sessions.userId,
      to: r.users.id,
    }),

    sessionTasks: r.many.sessionsTasks(),
  },

  sessionsTasks: {
    session: r.one.sessions({
      from: r.sessionsTasks.sessionId,
      to: r.sessions.id,
    }),

    card: r.one.cards({
      from: r.sessionsTasks.cardId,
      to: r.cards.id,
    }),
  },

  reviewLogs: {
    card: r.one.cards({
      from: r.reviewLogs.cardId,
      to: r.cards.id,
    }),
  },

  assessmentResults: {
    user: r.one.users({
      from: r.assessmentResults.userId,
      to: r.users.id,
    }),
  },

  gameScores: {
    user: r.one.users({
      from: r.gameScores.userId,
      to: r.users.id,
    }),
  },
}));