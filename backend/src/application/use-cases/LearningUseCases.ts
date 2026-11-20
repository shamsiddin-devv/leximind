import {
  ILearningRepository,
  LearningTransaction,
  type ProfilePreferences,
  type ReviewQueue,
  type LeaderboardPeriod,
  reviewModes,
  studyReminderTimePattern,
} from '../../domain/repositories/ILearningRepository';
import {
  LearningSession,
  nextStreak,
  validateTimezone,
  type SessionData,
} from '../../domain/entities/LearningSession';
import { IReviewScheduler } from '../../domain/services/IReviewSchedulerService';
import { IReviewRating } from '../../domain/services/IReviewRatingService';
import { NotFoundError } from '../../domain/errors/NotFoundError';
import { ConflictError } from '../../domain/errors/ConflictError';
import { BadRequestError } from '../../domain/errors/BadRequestError';
import { CEFR_LEVELS } from '../../domain/entities/Word';
export class LearningUseCases {
  constructor(
    private readonly repo: ILearningRepository,
    private readonly scheduler: IReviewScheduler,
  ) {}
  profile(userId: string) {
    return this.repo.transaction((tx) => tx.profile(userId));
  }
  updateProfile(
    userId: string,
    patch: Partial<ProfilePreferences>,
  ) {
    if (patch.timezone !== undefined) validateTimezone(patch.timezone);
    if (
      patch.dailyNewWords !== undefined &&
      (!Number.isInteger(patch.dailyNewWords) ||
        patch.dailyNewWords < 1 ||
        patch.dailyNewWords > 100)
    )
      throw new BadRequestError('Invalid daily target.');
    if (patch.dailyStudyMinutes !== undefined &&
        (!Number.isInteger(patch.dailyStudyMinutes) || patch.dailyStudyMinutes < 5 || patch.dailyStudyMinutes > 180))
      throw new BadRequestError('Invalid study duration.');
    if (patch.studyLevel != null && !CEFR_LEVELS.includes(patch.studyLevel))
      throw new BadRequestError('Invalid CEFR level.');
    if (patch.reviewMode !== undefined && !reviewModes.includes(patch.reviewMode))
      throw new BadRequestError('Invalid review mode.');
    if (patch.studyReminderTime !== undefined && !studyReminderTimePattern.test(patch.studyReminderTime))
      throw new BadRequestError('Invalid study reminder time.');
    return this.repo.transaction(async (tx) => {
      const current = await tx.profile(userId);
      return tx.updateProfile({
        ...current,
        timezone: patch.timezone ?? current.timezone,
        dailyNewWords: patch.dailyNewWords ?? current.dailyNewWords,
        dailyStudyMinutes: patch.dailyStudyMinutes ?? current.dailyStudyMinutes,
        studyLevel: patch.studyLevel === undefined ? current.studyLevel : patch.studyLevel,
        reviewMode: patch.reviewMode ?? current.reviewMode,
        studyReminderEnabled: patch.studyReminderEnabled ?? current.studyReminderEnabled,
        studyReminderTime: patch.studyReminderTime ?? current.studyReminderTime,
        autoplayPronunciation: patch.autoplayPronunciation ?? current.autoplayPronunciation,
        feedbackAudioEnabled:
          patch.feedbackAudioEnabled ?? current.feedbackAudioEnabled,
      });
    });
  }
  start(userId: string, limit: number, queue?: ReviewQueue) {
    return this.repo.transaction(async (tx) => {
      const p = await tx.profile(userId); // Serialize session creation per learner.
      const active = await tx.activeSession(userId);
      if (active) return { ...active, tasks: await tx.tasks(active.id) };
      const cards = await tx.dueCards(userId, limit, p.dailyNewWords, queue);
      if (!cards.length) throw new ConflictError('No cards are due.');
      const s = await tx.createSession(
        userId,
        cards.map((c) => c.id!),
      );
      return { ...s, tasks: await tx.tasks(s.id) };
    });
  }
  async reviewCenter(userId: string) {
    const [overview, session] = await Promise.all([
      this.repo.reviewOverview(userId),
      this.repo.transaction(async (tx) => {
        const active = await tx.activeSession(userId);
        return active ? { ...active, tasks: await tx.tasks(active.id) } : null;
      }),
    ]);
    return { ...overview, session };
  }
  get(userId: string, id: string) {
    return this.repo.transaction(async (tx) => {
      const s = await tx.session(id, userId);
      if (!s) throw new NotFoundError('Session not found.');
      return { ...s, tasks: await tx.tasks(id) };
    });
  }
  review(
    userId: string,
    sessionId: string,
    taskId: string,
    rating: IReviewRating,
    responseMs: number,
  ) {
    if (
      !Object.values(IReviewRating).includes(rating) ||
      !Number.isInteger(responseMs) ||
      responseMs < 0 ||
      responseMs > 3600000
    )
      throw new BadRequestError('Invalid review.');
    return this.repo.transaction(async (tx) => {
      const card = await this.pendingCard(tx, userId, sessionId, taskId);
      const now = new Date();
      if (!card.isDue(now)) throw new ConflictError('Card is not due.');
      card.applyReview(this.scheduler.schedule(card, rating, now), now);
      await tx.saveReview(card, rating, responseMs, now);
      await tx.completeTask(taskId, rating !== 'AGAIN');
      return card;
    });
  }
  previewReview(userId: string, sessionId: string, taskId: string) {
    return this.repo.transaction(async (tx) => {
      const card = await this.pendingCard(tx, userId, sessionId, taskId);
      const calculatedAt = new Date();
      if (!card.isDue(calculatedAt))
        throw new ConflictError('Card is not due.');
      return {
        cardId: card.id,
        calculatedAt,
        options: Object.values(IReviewRating).map((rating) => ({
          rating,
          due: this.scheduler.schedule(card, rating, calculatedAt).due,
        })),
      };
    });
  }

  private async pendingCard(
    tx: LearningTransaction,
    userId: string,
    sessionId: string,
    taskId: string,
  ) {
    const session = await tx.session(sessionId, userId);
    if (!session) throw new NotFoundError('Session not found.');
    new LearningSession(session).assertActive();
    const task = (await tx.tasks(sessionId)).find((t) => t.id === taskId);
    if (!task) throw new NotFoundError('Task not found.');
    if (task.completed)
      throw new ConflictError('Task has already been reviewed.');
    const card = await tx.card(task.cardId, userId);
    if (!card) throw new NotFoundError('Card not found.');
    if (card.pausedAt) throw new ConflictError('Card is paused.');
    return card;
  }
  complete(userId: string, id: string) {
    return this.repo.transaction(async (tx) => {
      const profile = await tx.profile(userId);
      const data = await tx.session(id, userId);
      if (!data) throw new NotFoundError('Session not found.');
      if (data.status === 'completed') return data; // Retrying completion never grants streak twice.
      const session = new LearningSession(data),
        now = new Date();
      session.complete(
        (await tx.tasks(id)).filter((t) => !t.completed).length,
        now,
      );
      await tx.completeSession(session.data);
      await tx.updateProfile({
        ...profile,
        streakDay: nextStreak(
          profile.lastSessionAt,
          now,
          profile.timezone,
          profile.streakDay,
        ),
        lastSessionAt: now,
      });
      return session.data;
    });
  }
  history(userId: string, page: number, limit: number, status?: SessionData['status']) {
    return this.repo.history(userId, page, limit, status);
  }
  cancel(userId: string, id: string) {
    return this.repo.transaction(async (tx) => {
      const data = await tx.session(id, userId);
      if (!data) throw new NotFoundError('Session not found.');
      if (data.status === 'cancelled') return data;
      const session = new LearningSession(data);
      session.cancel(new Date());
      await tx.completeSession(session.data);
      return session.data;
    });
  }

  async task(userId: string, id: string, taskId: string) {
    const session = await this.get(userId, id);
    const task = session.tasks.find((task) => task.id === taskId);
    if (!task) throw new NotFoundError('Task not found.');
    return task;
  }
  reviews(userId: string, page: number, limit: number) {
    return this.repo.reviews(userId, page, limit);
  }
  statistics(userId: string) {
    return this.repo.statistics(userId);
  }
  async analytics(userId: string) {
    const data = await this.repo.analytics(userId);
    if (!data) throw new NotFoundError('Profile not found.');
    return data;
  }
  async calendar(userId: string, month?: string) {
    const data = await this.repo.calendar(userId, month);
    if (!data) throw new NotFoundError('Profile not found.');
    return data;
  }
  topics(userId: string) {
    return this.repo.topics(userId);
  }
  achievements(userId: string) {
    return this.repo.achievements(userId);
  }
  leaderboard(userId: string, period: LeaderboardPeriod) {
    return this.repo.leaderboard(userId, period);
  }
  async reviewDetails(userId: string, id: string) {
    const review = await this.repo.reviewById(userId, id);
    if (!review) throw new NotFoundError('Review not found.');
    return review;
  }
  assessmentResults(userId: string, page: number, limit: number) {
    return this.repo.assessmentResults(userId, page, limit);
  }
  async assessmentResult(userId: string, id: string) {
    const result = await this.repo.assessmentResult(userId, id);
    if (!result) throw new NotFoundError('Assessment result not found.');
    return result;
  }
  gameScores(userId: string, page: number, limit: number) {
    return this.repo.gameScores(userId, page, limit);
  }
  async gameScore(userId: string, id: string) {
    const score = await this.repo.gameScore(userId, id);
    if (!score) throw new NotFoundError('Game score not found.');
    return score;
  }
  async studyPlan(userId: string) {
    const snapshot = await this.repo.studySnapshot(userId);
    if (!snapshot) throw new NotFoundError('Profile not found.');
    const dailyNewRemaining = Math.max(
      0,
      snapshot.dailyNewLimit - snapshot.dailyNewReviewed,
    );
    const availableNow =
      snapshot.dueNow -
      snapshot.dueNew +
      Math.min(snapshot.dueNew, dailyNewRemaining);
    const nextAction = snapshot.activeSessionId
      ? 'RESUME_SESSION'
      : availableNow > 0
        ? 'START_SESSION'
        : snapshot.dueNew > 0
          ? 'DAILY_NEW_LIMIT_REACHED'
          : snapshot.activeCards === 0
            ? 'ADD_OR_RESUME_CARDS'
            : 'CAUGHT_UP';
    return { ...snapshot, dailyNewRemaining, availableNow, nextAction };
  }
}
