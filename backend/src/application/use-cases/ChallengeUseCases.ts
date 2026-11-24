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
  chooseRoundSound,
  chooseSound,
  gradeAnswer,
  type SoundId,
} from '../../domain/entities/GameFeedback';
import {
  notebookCategories,
  notebookCategory,
  notebookKinds,
  type NotebookCategory,
} from '../../domain/entities/MistakesNotebook';
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
      if (notebookCategory(data.kind)) {
        await tx.recordNotebookMistakes(
          data,
          feedback.flatMap((item, index) =>
            !item.correct && data.payload.questions?.[index]
              ? [{ index, answer: answers[index], reason: item.mistake }]
              : [],
          ),
        );
      }
      const sound =
        data.kind !== 'assessment' && (await tx.audioEnabled(userId))
          ? this.sound(
              chooseRoundSound(data.kind, feedback, this.soundSeed(data.id)),
            )
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
        if (
          !feedback.correct &&
          notebookCategory(data.kind) &&
          data.payload.questions?.[index]
        ) {
          await tx.recordNotebookMistakes(data, [
            { index, answer, reason: feedback.mistake },
          ]);
        }
      }
      const sound =
        !replayed && (await tx.audioEnabled(userId))
          ? this.sound(
              chooseSound(
                data.kind,
                data.attempts ?? [],
                this.soundSeed(data.id),
              ),
            )
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

  private soundSeed(roundId: string) {
    return Number.parseInt(roundId.slice(-8), 16);
  }

  private sound(id: SoundId | undefined) {
    return id
      ? { id, url: '/api/feedback-audio/' + id + '.wav?v=4' }
      : undefined;
  }
  history(userId: string, assessment: boolean, page: number, limit: number) {
    return this.repo.history(userId, assessment, page, limit);
  }
  async notebook(
    userId: string,
    page: number,
    limit: number,
    category: NotebookCategory | undefined,
    onlyOpen: boolean,
  ) {
    const { entries, counts } = await this.repo.notebook(
      userId,
      page,
      limit,
      category ? notebookKinds[category] : null,
      onlyOpen,
    );
    const summary = notebookCategories.map((key) => {
      const byCategory = counts.filter(
        (count) => notebookCategory(count.kind) === key,
      );
      return {
        category: key,
        total: byCategory.reduce((total, count) => total + count.total, 0),
        resolved: byCategory.reduce(
          (total, count) => total + count.resolved,
          0,
        ),
      };
    });
    const matching = category
      ? summary.filter((item) => item.category === category)
      : summary;
    return {
      data: entries.map((entry) => ({
        ...entry,
        category: notebookCategory(entry.kind),
      })),
      total: matching.reduce(
        (total, count) => total + count.total - (onlyOpen ? count.resolved : 0),
        0,
      ),
      summary,
    };
  }
  async setNotebookResolved(userId: string, id: string, resolved: boolean) {
    const updated = await this.repo.setNotebookResolved(userId, id, resolved);
    if (!updated) throw new NotFoundError('Mistake not found.');
    return updated;
  }
  async practiceNotebook(userId: string, id: string, answer: string) {
    const entry = await this.repo.notebookEntry(userId, id);
    if (!entry) throw new NotFoundError('Mistake not found.');
    const feedback = gradeAnswer(
      answer,
      entry.expectedAnswer,
      entry.question.input,
    );
    if (!feedback.correct)
      return { correct: false, resolvedAt: entry.resolvedAt };
    return {
      correct: true,
      ...(await this.setNotebookResolved(userId, id, true)),
    };
  }
}
