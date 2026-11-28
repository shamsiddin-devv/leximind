import type { Level } from '../../shared/types/api';
import { course, lessons, type CourseLesson } from './course';

export function progressKey(userId: string) {
  return 'leximind:learning-path:v1:' + userId;
}

export function readProgress(userId: string): string[] {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(progressKey(userId)) ?? '[]');
    return Array.isArray(parsed) ? lessons.filter((lesson) => parsed.includes(lesson.id)).map((lesson) => lesson.id) : [];
  } catch {
    return [];
  }
}

export function courseState(level: Level, completed: readonly string[]) {
  const first = lessons.findIndex((lesson) => lesson.level === level);
  const required = lessons.slice(Math.max(0, first));
  const next = required.find((lesson) => !completed.includes(lesson.id));
  return {
    next,
    required,
    isOpen(lesson: CourseLesson) {
      return completed.includes(lesson.id) || (first >= 0 && course.findIndex((unit) => unit.level === lesson.level) <
        course.findIndex((unit) => unit.level === level)) || next?.id === lesson.id;
    },
  };
}
