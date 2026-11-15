import {
  IChallengeRepository,
  VocabularyFilter,
} from '../../domain/repositories/IChallengeRepository';
import {
  Challenge,
  ChallengeKind,
  ChallengeData,
  createChallenge,
} from '../../domain/entities/Challenge';
import { NotFoundError } from '../../domain/errors/NotFoundError';
import {
  AnswerFeedback,
  chooseSound,
} from '../../domain/entities/GameFeedback';
export class ChallengeUseCases {
  constructor(
    private readonly repo: IChallengeRepository,
    private readonly random: (max: number) => number,
  ) {}
  async start(userId: string, kind: ChallengeKind, filter?: VocabularyFilter) {
    const { payload, answers } = createChallenge(
      kind,
      await this.repo.vocabulary(kind, userId, filter),
      this.random,
    );
    const c = await this.repo.create(
      userId,
      kind,
      payload,
      answers,
      new Date(Date.now() + (kind === 'word_rush' ? 60000 : 600000)),
    );
    return this.roundView(c);
  }

  game(userId: string, id: string) {
    return this.repo.transaction(async (tx) => {
      const data = await tx.get(id, userId);
      if (!data || data.kind === 'assessment')
        throw new NotFoundError('Game not found.');
      return {
        ...this.roundView(data),
        nextIndex: data.completedAt ? null : (data.attempts?.length ?? 0),
        attempts: data.attempts ?? [],
        result: data.result,
      };
    });
  }

  private roundView(c: ChallengeData) {
    return {
      id: c.id,
      kind: c.kind,
      payload: {
        questions: c.payload.questions,
        stimulus: c.payload.stimulus,
        gridSize: c.payload.gridSize,
        previewMs: c.payload.previewMs,
      },
      expiresAt: c.expiresAt,
    };
  }
  submit(userId: string, id: string, answers: string[], assessment: boolean) {
    return this.repo.transaction(async (tx) => {
      const data = await tx.get(id, userId);
      if (!data || (data.kind === 'assessment') !== assessment)
        throw new NotFoundError('Challenge not found.');
      const result = new Challenge(data).submit(answers, new Date());
      await tx.finish(data, result);
      const feedback = result.feedback ?? [];
      const firstMistake = feedback.findIndex((item) => !item.correct);
      const index = firstMistake >= 0 ? firstMistake : 0;
      const sound =
        feedback[index] && (await tx.audioEnabled(userId))
          ? this.sound(feedback[index], index, data.kind === 'mistake_words')
          : undefined;
      return { ...result, sound };
    });
  }
  attempt(userId: string, id: string, index: number, answer: string) {
    return this.repo.transaction(async (tx) => {
      const data = await tx.get(id, userId);
      if (!data || data.kind === 'assessment')
        throw new NotFoundError('Game not found.');
      const { feedback, replayed, result } = new Challenge(data).attempt(
        index,
        answer,
        new Date(),
      );
      if (!replayed) {
        if (result) await tx.finish(data, result);
        else await tx.saveAttempts(data);
      }
      const sound =
        !replayed && (await tx.audioEnabled(userId))
          ? this.sound(feedback, index, data.kind === 'mistake_words')
          : undefined;
      return {
        index,
        feedback,
        expectedAnswer: data.answers[index],
        replayed,
        result,
        sound,
      };
    });
  }

  private sound(feedback: AnswerFeedback, index: number, recovery: boolean) {
    const id = chooseSound(feedback, index, recovery);
    return id
      ? { id, url: '/api/feedback-audio/' + id + '.wav?v=3' }
      : undefined;
  }
  history(userId: string, assessment: boolean, page: number, limit: number) {
    return this.repo.history(userId, assessment, page, limit);
  }
}
