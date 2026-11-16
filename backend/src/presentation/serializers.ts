import { User } from '../domain/entities/User';
import { Word } from '../domain/entities/Word';
import { Card } from '../domain/entities/Card';
import { WordSense } from '../domain/entities/WordSense';
export const senseView = (s: WordSense) => ({
  id: s.id,
  definition: s.definition,
  exampleSentence: s.exampleSentence,
  exampleAudioUrl: s.exampleAudioUrl,
  translationUz: s.translationUz,
  orderIndex: s.orderIndex,
});
export const userView = (u: User) => ({
  id: u.id,
  fullName: u.fullName,
  email: u.email.toString(),
  emailVerifiedAt: u.emailVerifiedAt,
  createdAt: u.createdAt,
});
export const wordView = (w: Word) => ({
  id: w.id,
  text: w.text,
  cefrLevel: w.cefrLevel,
  audioUrl: w.audioUrl,
  topic: w.topic,
  sense: w.sense.map(senseView),
  createdAt: w.createdAt,
  updatedAt: w.updatedAt,
});
export const cardView = (c: Card) => ({
  id: c.id,
  userId: c.userId,
  wordId: c.wordId,
  ...c.getSchedulingData(),
  pausedAt: c.pausedAt ?? null,
  createdAt: c.createdAt,
});
