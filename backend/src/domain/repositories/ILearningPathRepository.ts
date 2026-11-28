import type { CefrLevel } from '../entities/Word';

export const vocabularyStatuses = [
  'new',
  'learning',
  'due',
  'mastered',
] as const;
export type VocabularyStatus = (typeof vocabularyStatuses)[number];

export type CourseProgress = {
  startLevel: CefrLevel;
  activeLevel: CefrLevel;
  unlockedLevel: CefrLevel;
  nextLessonId: string | null;
  completed: string[];
};

export type StudyVocabularyFilters = {
  page: number;
  limit: number;
  cefrLevel?: CefrLevel;
  suggested?: boolean;
  fromLessons?: boolean;
  search?: string;
  topic?: string;
  status?: VocabularyStatus;
};

export type StudyWord = {
  id: string;
  text: string;
  cefrLevel: CefrLevel;
  topic: string | null;
  audioUrl: string | null;
  cardId: string | null;
  status: VocabularyStatus;
  fromLesson: boolean;
  sense: {
    translationUz: string;
    definition: string;
    exampleSentence: string;
    exampleAudioUrl: string | null;
    part?: string;
  }[];
};

export abstract class ILearningPathRepository {
  abstract getProgress(userId: string): Promise<CourseProgress>;
  abstract completeLessons(
    userId: string,
    lessonIds: readonly string[],
  ): Promise<CourseProgress>;
  abstract listVocabulary(
    userId: string,
    filters: StudyVocabularyFilters,
  ): Promise<{ data: StudyWord[]; total: number; progress: CourseProgress }>;
  abstract getVocabularyWord(
    userId: string,
    wordId: string,
  ): Promise<StudyWord>;
}
