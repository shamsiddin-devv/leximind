import {
  Controller,
  Get,
  Patch,
  Post,
  Body,
  Param,
  Query,
  ParseUUIDPipe,
  HttpCode,
  Header,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { CurrentUser } from '../../security';
import type { Identity } from '../../../domain/repositories/IAuthRepository';
import { LearningUseCases } from '../../../application/use-cases/LearningUseCases';
import { ChallengeUseCases } from '../../../application/use-cases/ChallengeUseCases';
import { PaginationDto } from '../../pagination.dto';
import { cardView } from '../../serializers';
import {
  ProfileDto,
  LearningCalendarDto,
  LeaderboardDto,
  StartSessionDto,
  SessionHistoryDto,
  ReviewDto,
  StartGameDto,
  SubmitAnswersDto,
  SubmitAttemptDto,
  MistakesNotebookDto,
  ResolveMistakeDto,
  RetryMistakeDto,
} from './learning.dto';
@Controller()
export class LearningController {
  constructor(
    private readonly learning: LearningUseCases,
    private readonly challenges: ChallengeUseCases,
  ) {}
  @Get('profile') profile(@CurrentUser() u: Identity) {
    return this.learning.profile(u.id);
  }
  @Patch('profile') updateProfile(
    @CurrentUser() u: Identity,
    @Body() dto: ProfileDto,
  ) {
    return this.learning.updateProfile(u.id, dto);
  }
  @Get('statistics') statistics(@CurrentUser() u: Identity) {
    return this.learning.statistics(u.id);
  }
  @Get('statistics/analytics')
  analytics(@CurrentUser() u: Identity) {
    return this.learning.analytics(u.id);
  }
  @Get('learning-calendar')
  calendar(@CurrentUser() u: Identity, @Query() query: LearningCalendarDto) {
    return this.learning.calendar(u.id, query.month);
  }
  @Get('topics')
  topics(@CurrentUser() u: Identity) {
    return this.learning.topics(u.id);
  }
  @Get('achievements')
  achievements(@CurrentUser() u: Identity) {
    return this.learning.achievements(u.id);
  }
  @Get('leaderboard')
  @Header('Cache-Control', 'no-store')
  leaderboard(@CurrentUser() u: Identity, @Query() query: LeaderboardDto) {
    return this.learning.leaderboard(u.id, query.period);
  }
  @Get('study-plan')
  studyPlan(@CurrentUser() u: Identity) {
    return this.learning.studyPlan(u.id);
  }
  @Get('mistakes-notebook')
  @Header('Cache-Control', 'no-store')
  notebook(@CurrentUser() u: Identity, @Query() query: MistakesNotebookDto) {
    return this.challenges.notebook(
      u.id,
      query.page,
      query.limit,
      query.category,
      query.onlyOpen === 'true',
    );
  }
  @Patch('mistakes-notebook/:id')
  resolveMistake(
    @CurrentUser() u: Identity,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ResolveMistakeDto,
  ) {
    return this.challenges.setNotebookResolved(u.id, id, dto.resolved);
  }
  @Post('mistakes-notebook/:id/retry')
  @HttpCode(200)
  retryMistake(
    @CurrentUser() u: Identity,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RetryMistakeDto,
  ) {
    return this.challenges.practiceNotebook(u.id, id, dto.answer);
  }
  @Get('review-center')
  reviewCenter(@CurrentUser() u: Identity) {
    return this.learning.reviewCenter(u.id);
  }
  @Post('sessions') start(
    @CurrentUser() u: Identity,
    @Body() dto: StartSessionDto,
  ) {
    return this.learning.start(u.id, dto.limit, dto.queue);
  }
  @Get('sessions') history(
    @CurrentUser() u: Identity,
    @Query() q: SessionHistoryDto,
  ) {
    return this.learning.history(u.id, q.page, q.limit, q.status);
  }
  @Get('sessions/:id') session(
    @CurrentUser() u: Identity,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.learning.get(u.id, id);
  }
  @Post('sessions/:id/tasks/:taskId/review') @HttpCode(200) async review(
    @CurrentUser() u: Identity,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('taskId', ParseUUIDPipe) taskId: string,
    @Body() dto: ReviewDto,
  ) {
    return cardView(
      await this.learning.review(u.id, id, taskId, dto.rating, dto.responseMs),
    );
  }
  @Get('sessions/:id/tasks/:taskId')
  task(
    @CurrentUser() u: Identity,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('taskId', ParseUUIDPipe) taskId: string,
  ) {
    return this.learning.task(u.id, id, taskId);
  }
  @Get('sessions/:id/tasks/:taskId/review-preview')
  previewReview(
    @CurrentUser() u: Identity,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('taskId', ParseUUIDPipe) taskId: string,
  ) {
    return this.learning.previewReview(u.id, id, taskId);
  }
  @Post('sessions/:id/cancel')
  @HttpCode(200)
  cancel(@CurrentUser() u: Identity, @Param('id', ParseUUIDPipe) id: string) {
    return this.learning.cancel(u.id, id);
  }
  @Post('sessions/:id/complete') @HttpCode(200) complete(
    @CurrentUser() u: Identity,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.learning.complete(u.id, id);
  }
  @Get('reviews') reviews(
    @CurrentUser() u: Identity,
    @Query() q: PaginationDto,
  ) {
    return this.learning.reviews(u.id, q.page, q.limit);
  }
  @Get('reviews/:id')
  reviewDetails(
    @CurrentUser() u: Identity,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.learning.reviewDetails(u.id, id);
  }
  @Get('assessment-results')
  assessmentResults(@CurrentUser() u: Identity, @Query() q: PaginationDto) {
    return this.learning.assessmentResults(u.id, q.page, q.limit);
  }
  @Get('assessment-results/:id')
  assessmentResult(
    @CurrentUser() u: Identity,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.learning.assessmentResult(u.id, id);
  }
  @Get('game-scores')
  gameScores(@CurrentUser() u: Identity, @Query() q: PaginationDto) {
    return this.learning.gameScores(u.id, q.page, q.limit);
  }
  @Get('game-scores/:id')
  gameScore(
    @CurrentUser() u: Identity,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.learning.gameScore(u.id, id);
  }
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('assessments')
  assessment(@CurrentUser() u: Identity) {
    return this.challenges.start(u.id, 'assessment');
  }
  @Get('assessments') assessments(
    @CurrentUser() u: Identity,
    @Query() q: PaginationDto,
  ) {
    return this.challenges.history(u.id, true, q.page, q.limit);
  }
  @Post('assessments/:id/submit') @HttpCode(200) submitAssessment(
    @CurrentUser() u: Identity,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SubmitAnswersDto,
  ) {
    return this.challenges.submit(u.id, id, dto.answers, true);
  }
  @Throttle({ default: { limit: 10, ttl: 60000 } }) @Post('games') game(
    @CurrentUser() u: Identity,
    @Body() dto: StartGameDto,
  ) {
    return this.challenges.start(u.id, dto.gameType, dto);
  }
  @Get('games') games(@CurrentUser() u: Identity, @Query() q: PaginationDto) {
    return this.challenges.history(u.id, false, q.page, q.limit);
  }
  @Get('games/:id')
  gameById(@CurrentUser() u: Identity, @Param('id', ParseUUIDPipe) id: string) {
    return this.challenges.game(u.id, id);
  }
  @Post('games/:id/submit') @HttpCode(200) submitGame(
    @CurrentUser() u: Identity,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SubmitAnswersDto,
  ) {
    return this.challenges.submit(u.id, id, dto.answers, false);
  }
  @Post('games/:id/attempts')
  @HttpCode(200)
  attempt(
    @CurrentUser() u: Identity,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SubmitAttemptDto,
  ) {
    return this.challenges.attempt(u.id, id, dto.index, dto.answer);
  }
}
