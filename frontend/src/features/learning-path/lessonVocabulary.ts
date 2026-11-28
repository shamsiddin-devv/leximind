import { lessons } from './course';
import { findWord, wordsById, type Word } from './words';

export const wordTokens = /([A-Za-z]+(?:['’][A-Za-z]+)*)/g;

export const taughtWords = (() => {
  const introduced = new Set<string>();
  return new Map(lessons.map((lesson) => {
    const entries = new Map<string, Word>();
    for (const id of lesson.expressions ?? []) {
      const entry = wordsById.get(id);
      if (entry) entries.set(id, entry);
    }
    for (const text of [...lesson.examples.map(([sentence]) => sentence), lesson.mistake[1], lesson.question.prompt]) {
      for (const token of text.match(wordTokens) ?? []) {
        const entry = findWord(token);
        if (entry) entries.set(entry.id, entry);
      }
    }
    const fresh = [...entries.values()].filter((entry) => !introduced.has(entry.id));
    for (const entry of fresh) introduced.add(entry.id);
    return [lesson.id, fresh] as const;
  }));
})();

export const introducedLevels = new Map(lessons.flatMap((lesson) => (taughtWords.get(lesson.id) ?? []).map((word) => [word.id, lesson.level] as const)));
