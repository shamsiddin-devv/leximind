import { useCallback, useEffect, useState } from 'react';
import { api, explain } from '../../shared/services/api';
import { levels, type Level } from '../../shared/types/api';
import { lessons } from './course';
import { courseState, progressKey, readProgress } from './progress';

export type CourseProgress = {
  startLevel: Level;
  activeLevel: Level;
  unlockedLevel: Level;
  nextLessonId: string | null;
  completed: string[];
};

const path = '/learning-path';

function syncLegacy(token: string, userId: string, progress: CourseProgress, signal: AbortSignal) {
  const local = new Set(readProgress(userId));
  const merged = new Set(progress.completed);
  const pending: string[] = [];
  for (const lesson of lessons) {
    if (!local.has(lesson.id) || merged.has(lesson.id)) continue;
    const next = courseState(progress.startLevel, [...merged]).next?.id;
    if (lesson.id !== next && levels.indexOf(lesson.level) >= levels.indexOf(progress.startLevel)) continue;
    pending.push(lesson.id);
    merged.add(lesson.id);
  }
  return pending.length
    ? api<CourseProgress>(path + '/complete', { token, signal, method: 'POST', body: { lessonIds: pending } })
    : Promise.resolve(progress);
}

function clearMigrated(userId: string, progress: CourseProgress) {
  try {
    const pending = readProgress(userId).filter((id) => !progress.completed.includes(id));
    if (pending.length) localStorage.setItem(progressKey(userId), JSON.stringify(pending));
    else localStorage.removeItem(progressKey(userId));
  } catch {
    // Existing browser data can be imported in another session if storage is temporarily unavailable.
  }
}

export function useCourseProgress(token: string, userId: string, level: Level | undefined, enabled: boolean, onChange: () => void) {
  const [progress, setProgress] = useState<CourseProgress>();
  const [error, setError] = useState('');
  const [version, setVersion] = useState(0);
  const retry = useCallback(() => setVersion((value) => value + 1), []);

  useEffect(() => {
    if (!enabled) return;
    const controller = new AbortController();
    setError('');
    void api<CourseProgress>(path, { token, signal: controller.signal })
      .then(async (current) => {
        const result = await syncLegacy(token, userId, current, controller.signal);
        if (controller.signal.aborted) return;
        setProgress(result);
        clearMigrated(userId, result);
        if (result !== current) onChange();
      })
      .catch((failure: unknown) => { if (!controller.signal.aborted) setError(explain(failure)); });
    return () => controller.abort();
  }, [enabled, token, userId, level, version, onChange]);

  async function complete(id: string) {
    setError('');
    try {
      const result = await api<CourseProgress>(path + '/complete', { token, method: 'POST', body: { lessonIds: [id] } });
      setProgress(result);
      clearMigrated(userId, result);
      onChange();
      return true;
    } catch (failure) {
      setError(explain(failure, { 409: 'Davom etishdan oldin navbatdagi darsni yakunlang.' }));
      return false;
    }
  }

  return { progress, error, retry, complete };
}
