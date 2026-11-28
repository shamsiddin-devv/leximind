import type {
  ILearningPathRepository,
  StudyVocabularyFilters,
} from '../../../domain/repositories/ILearningPathRepository';

export class LearningPath {
  constructor(private readonly repository: ILearningPathRepository) {}
  progress(userId: string) {
    return this.repository.getProgress(userId);
  }
  complete(userId: string, lessonIds: readonly string[]) {
    return this.repository.completeLessons(userId, lessonIds);
  }
  vocabulary(userId: string, filters: StudyVocabularyFilters) {
    return this.repository.listVocabulary(userId, filters);
  }
  word(userId: string, wordId: string) {
    return this.repository.getVocabularyWord(userId, wordId);
  }
}
