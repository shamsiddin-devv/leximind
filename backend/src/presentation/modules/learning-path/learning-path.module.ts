import { Module } from '@nestjs/common';
import { LearningPath } from '../../../application/use-cases/learning/LearningPath';
import { LearningPathRepository } from '../../../infrastructure/repositories/LearningPathRepository';
import { LearningPathController } from './learning-path.controller';

@Module({
  controllers: [LearningPathController],
  providers: [
    LearningPathRepository,
    {
      provide: LearningPath,
      inject: [LearningPathRepository],
      useFactory: (repository: LearningPathRepository) =>
        new LearningPath(repository),
    },
  ],
})
export class LearningPathModule {}
