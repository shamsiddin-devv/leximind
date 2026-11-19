import { Module } from '@nestjs/common';
import { randomInt } from 'node:crypto';
import { LearningController } from './learning.controller';
import { FeedbackAudioController } from '../../feedback-audio.controller';
import { LearningUseCases } from '../../../application/use-cases/LearningUseCases';
import { ChallengeUseCases } from '../../../application/use-cases/ChallengeUseCases';
import { LearningRepository } from '../../../infrastructure/repositories/LearningRepository';
import { ChallengeRepository } from '../../../infrastructure/repositories/ChallengeRepository';
import { TsFsrsScheduler } from '../../../infrastructure/scheduler/TsFsrsScheduler';
@Module({
  controllers: [LearningController, FeedbackAudioController],
  exports: [LearningUseCases],
  providers: [
    LearningRepository,
    ChallengeRepository,
    TsFsrsScheduler,
    {
      provide: LearningUseCases,
      useFactory: (r: LearningRepository, s: TsFsrsScheduler) =>
        new LearningUseCases(r, s),
      inject: [LearningRepository, TsFsrsScheduler],
    },
    {
      provide: ChallengeUseCases,
      useFactory: (r: ChallengeRepository) =>
        new ChallengeUseCases(r, randomInt),
      inject: [ChallengeRepository],
    },
  ],
})
export class LearningModule {}
