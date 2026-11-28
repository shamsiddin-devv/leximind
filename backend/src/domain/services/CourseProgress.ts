import { CEFR_LEVELS, type CefrLevel } from '../entities/Word';
import type { CourseProgress } from '../repositories/ILearningPathRepository';

export type CourseLessonPosition = { id: string; level: CefrLevel };

export function resolveCourseProgress(
  startLevel: CefrLevel,
  lessons: readonly CourseLessonPosition[],
  completed: ReadonlySet<string>,
): CourseProgress {
  const start = CEFR_LEVELS.indexOf(startLevel);
  const next = lessons.find(
    (lesson) =>
      CEFR_LEVELS.indexOf(lesson.level) >= start && !completed.has(lesson.id),
  );
  const activeLevel = next?.level ?? lessons.at(-1)?.level ?? startLevel;
  let unlocked = Math.max(start, CEFR_LEVELS.indexOf(activeLevel));

  for (const [index, level] of CEFR_LEVELS.entries()) {
    const unit = lessons.filter((lesson) => lesson.level === level);
    if (unit.some((lesson) => completed.has(lesson.id)))
      unlocked = Math.max(unlocked, index);
    if (unit.length && unit.every((lesson) => completed.has(lesson.id))) {
      unlocked = Math.max(
        unlocked,
        Math.min(index + 1, CEFR_LEVELS.length - 1),
      );
    }
  }

  return {
    startLevel,
    activeLevel,
    unlockedLevel: CEFR_LEVELS[unlocked],
    nextLessonId: next?.id ?? null,
    completed: lessons
      .filter((lesson) => completed.has(lesson.id))
      .map((lesson) => lesson.id),
  };
}
