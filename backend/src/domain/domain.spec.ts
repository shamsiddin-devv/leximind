import { describe, expect, it } from '@jest/globals';
import { Email } from './value-objects/Email';
import { validatePassword } from './value-objects/PasswordPolicy';
import { User } from './entities/User';
import { Word } from './entities/Word';
import { WordSense } from './entities/WordSense';
import { Card, type CardStateType } from './entities/Card';
import {
  LearningSession,
  nextStreak,
  validateTimezone,
} from './entities/LearningSession';
import {
  Challenge,
  createChallenge,
  gameKinds,
  type QuizWord,
} from './entities/Challenge';
import { TsFsrsScheduler } from '../infrastructure/scheduler/TsFsrsScheduler';
import {
  chooseRoundSound,
  chooseSound,
  gradeAnswer,
  soundIds,
  type AnswerFeedback,
} from './entities/GameFeedback';

describe('feedback audio selection', () => {
  const wrong = { correct: false, mistake: 'incorrect' } as const;
  const typo = { correct: false, mistake: 'typo' } as const;
  const skip = { correct: false, mistake: 'skipped' } as const;
  const correct = { correct: true };

  it('classifies typing and unfinished sentences independently of the sound selection', () => {
    expect(gradeAnswer('appel', 'apple', 'text')).toEqual(typo);
    expect(gradeAnswer('banana', 'apple', 'text')).toEqual(wrong);
    expect(gradeAnswer('We tea drink', 'We drink tea', 'tokens').mistake).toBe(
      'word_order',
    );
    expect(gradeAnswer('We tea', 'We drink tea', 'sentence').mistake).toBe(
      'incomplete',
    );
  });

  it('uses distinct pools for game kinds and rotates all twelve clips across outcomes', () => {
    expect(chooseSound('meaning_match', [wrong], 0)).toBe('faah');
    expect(chooseSound('word_dictation', [wrong], 0)).toBe('huh-cat');
    expect(chooseSound('visual_grid', [wrong], 0)).toBe('galaxy');
    const examples: AnswerFeedback[] = [
      wrong,
      typo,
      skip,
      correct,
      { correct: false, mistake: 'word_order' },
      { correct: false, mistake: 'incomplete' },
    ];
    const heard = new Set(
      gameKinds.flatMap((kind) =>
        examples.flatMap((item) =>
          [0, 1, 2].flatMap((seed) => [
            chooseSound(kind, [item], seed),
            chooseSound(kind, [item, item], seed),
          ]),
        ),
      ),
    );
    expect(heard).toEqual(new Set(soundIds));
  });

  it('changes the cue on a second mistake and switches to a positive cue after recovery', () => {
    expect(chooseSound('type_word', [typo], 0)).toBe('bruh');
    expect(chooseSound('type_word', [typo, typo], 0)).toBe('alert');
    expect(chooseSound('type_word', [typo, typo, typo], 0)).toBe('dexter');
    expect(chooseSound('type_word', [typo, typo, correct], 0)).toBe(
      'romanceeeeeeeeeeeeee',
    );
    for (let seed = 0; seed < 6; seed++) {
      expect(chooseSound('word_rush', [wrong, wrong], seed)).not.toBe(
        chooseSound('word_rush', [wrong], seed),
      );
    }
  });

  it('distinguishes a partly recalled memory round from a skipped round', () => {
    expect(chooseRoundSound('sequence_memory', [correct, skip, skip], 1)).toBe(
      'galaxy',
    );
    expect(chooseRoundSound('visual_grid', [skip, skip], 1)).toBe(
      'hub-intro-sound',
    );
    expect(chooseRoundSound('word_span', [correct, correct], 1)).toBe(
      'encourage',
    );
  });
});

describe('identity and vocabulary invariants', () => {
  it('normalizes email and compares normalized values', () => {
    expect(
      new Email('  TEST@Example.com ').equals(new Email('test@example.com')),
    ).toBe(true);
  });
  it.each(['', 'a', 'a@b', 'a b@example.com'])(
    'rejects malformed email %s',
    (value) => {
      expect(() => new Email(value)).toThrow();
    },
  );
  it('rejects whitespace names on creation and update', () => {
    expect(
      () => new User({ fullName: '  ', email: new Email('a@b.com') }),
    ).toThrow();
    const u = new User({ fullName: 'User', email: new Email('a@b.com') });
    expect(() => u.update({ fullName: '  ' })).toThrow();
  });
  it('requires eight characters and enforces the bcrypt UTF-8 byte boundary', () => {
    expect(() => validatePassword('a'.repeat(8))).not.toThrow();
    expect(() => validatePassword('😀'.repeat(8))).not.toThrow();
    expect(() => validatePassword('a'.repeat(7))).toThrow();
    expect(() => validatePassword('😀'.repeat(7))).toThrow();
    expect(() => validatePassword('a'.repeat(72))).not.toThrow();
    expect(() => validatePassword('a'.repeat(73))).toThrow();
    expect(() => validatePassword('😀'.repeat(19))).toThrow();
    expect(() => validatePassword('short')).toThrow();
  });
  it('supports zero-based senses and rejects duplicates', () => {
    const sense = new WordSense({
      definition: 'fruit',
      exampleSentence: 'An apple',
      translationUz: 'olma',
      orderIndex: 0,
    });
    expect(
      new Word({ text: ' APPLE ', cefrLevel: 'A1', sense: [sense] }).text,
    ).toBe('apple');
    expect(
      () => new Word({ text: 'apple', cefrLevel: 'A1', sense: [sense, sense] }),
    ).toThrow();
    expect(
      () =>
        new WordSense({
          definition: 'x',
          exampleSentence: 'x',
          translationUz: 'x',
          orderIndex: -1,
        }),
    ).toThrow();
  });
});

describe('spaced repetition and learner calendar', () => {
  const now = new Date('2026-11-12T12:00:00Z');
  it.each(['AGAIN', 'HARD', 'GOOD', 'EASY'] as const)(
    'schedules %s and preserves scheduling invariants',
    (rating) => {
      const card = Card.createNew('user', 'word', now);
      const scheduler = new TsFsrsScheduler();
      card.applyReview(scheduler.schedule(card, rating, now), now);
      expect(card.reps).toBe(1);
      expect(card.difficulty).toBeGreaterThanOrEqual(1);
      expect(card.due.getTime()).toBeGreaterThan(now.getTime());
      expect(card.lastReviewedAt).toEqual(now);
      const next = card.due;
      card.applyReview(scheduler.schedule(card, 'GOOD', next), next);
      expect(card.reps).toBe(2);
      expect(card.due.getTime()).toBeGreaterThan(next.getTime());
    },
  );
  it('rejects invalid scheduling state', () => {
    expect(
      () =>
        new Card({
          userId: 'u',
          wordId: 'w',
          due: now,
          stability: 0,
          difficulty: 0,
          reps: 0,
          lapses: 0,
          state: 'INVALID' as CardStateType,
        }),
    ).toThrow();
    expect(
      () =>
        new Card({
          userId: 'u',
          wordId: 'w',
          due: now,
          stability: 1,
          difficulty: 0,
          reps: 0,
          lapses: 0,
          state: 'NEW',
        }),
    ).toThrow();
  });
  it('does not finish a session with unfinished tasks', () => {
    const session = new LearningSession({
      id: 's',
      userId: 'u',
      status: 'in_progress',
      startedAt: now,
      endedAt: null,
    });
    expect(() => session.complete(1, now)).toThrow();
    session.complete(0, now);
    expect(session.data.status).toBe('completed');
    expect(() => session.complete(0, now)).toThrow();
  });
  it('counts local calendar days across the Tashkent midnight boundary', () => {
    expect(
      nextStreak(
        new Date('2026-11-12T18:59:00Z'),
        new Date('2026-11-12T19:01:00Z'),
        'Asia/Tashkent',
        4,
      ),
    ).toBe(5);
    expect(
      nextStreak(now, new Date('2026-11-12T13:00:00Z'), 'Asia/Tashkent', 4),
    ).toBe(4);
    expect(
      nextStreak(now, new Date('2026-11-15T13:00:00Z'), 'Asia/Tashkent', 4),
    ).toBe(1);
    expect(nextStreak(null, now, 'UTC', 0)).toBe(1);
  });
  it('counts calendar days across DST without assuming 24-hour days', () => {
    expect(
      nextStreak(
        new Date('2026-03-07T17:00:00Z'),
        new Date('2026-03-08T16:00:00Z'),
        'America/New_York',
        2,
      ),
    ).toBe(3);
    expect(() => validateTimezone('Invalid/Zone')).toThrow();
  });
});

describe('server-side challenges', () => {
  const words: QuizWord[] = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'].flatMap(
    (level, i) =>
      Array.from({ length: 4 }, (_, j) => ({
        id: `${i}-${j}`,
        text: `word-${i}-${j}`,
        translation: `meaning-${i}-${j}`,
        exampleSentence: `Please type word-${i}-${j} here.`,
        exampleAudioUrl: 'https://example.com/sentence.wav',
        audioUrl: 'https://example.com/word.wav',
        level: level as QuizWord['level'],
      })),
  );
  const random = (max: number) => max - 1;
  it.each(gameKinds)('generates and scores %s', (kind) => {
    const generated = createChallenge(kind, words, random);
    const challenge = new Challenge({
      id: 'c',
      userId: 'u',
      kind,
      ...generated,
      expiresAt: new Date(Date.now() + 60000),
      completedAt: null,
      result: null,
    });
    const result = challenge.submit(generated.answers, new Date());
    expect(result.score).toBe(result.totalQuestion * 10);
    expect(() => challenge.submit(generated.answers, new Date())).toThrow();
  });
  it('requires sufficient vocabulary for assessment', () => {
    expect(() =>
      createChallenge(
        'assessment',
        words.filter((w) => w.level === 'A1'),
        random,
      ),
    ).toThrow();
  });
  it('estimates CEFR only through consecutive passing levels', () => {
    const generated = createChallenge('assessment', words, random);
    const challenge = new Challenge({
      id: 'c',
      userId: 'u',
      kind: 'assessment',
      ...generated,
      expiresAt: new Date(Date.now() + 60000),
      completedAt: null,
      result: null,
    });
    const answers = generated.answers.map((a, i) => (i >= 6 && i < 9 ? '' : a));
    expect(challenge.submit(answers, new Date()).resultingLevel).toBe('A2');
  });
  it('rejects expired and incomplete submissions', () => {
    const generated = createChallenge('sequence_memory', [], random);
    const c = new Challenge({
      id: 'c',
      userId: 'u',
      kind: 'sequence_memory',
      ...generated,
      expiresAt: new Date(0),
      completedAt: null,
      result: null,
    });
    expect(() => c.submit(generated.answers, new Date())).toThrow('expired');
    c.data.expiresAt = new Date(Date.now() + 60000);
    expect(() => c.submit([], new Date())).toThrow('one answer');
  });
});
