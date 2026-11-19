import { useRef, useState } from 'react';
import { api, explain } from '../../../shared/services/api';
import type { LearningPreferences, Profile } from '../../../shared/types/api';

type Changes = Partial<LearningPreferences>;

export function usePreferenceSave(token: string, updateProfile: (profile: Profile, refreshPlan?: boolean) => void) {
  const queued = useRef<Changes>({});
  const running = useRef(false);
  const [pending, setPending] = useState<Changes>({});
  const [status, setStatus] = useState<{ message: string; error?: boolean }>();

  function save(changes: Changes) {
    queued.current = { ...queued.current, ...changes };
    setPending((previous) => ({ ...previous, ...changes }));
    setStatus({ message: 'Saqlanmoqda…' });
    if (running.current) return;
    running.current = true;
    void flush();
  }

  async function flush() {
    let failure = '';
    let latestProfile: Profile | undefined;
    let refreshPlan = false;
    while (Object.keys(queued.current).length) {
      const batch = queued.current;
      queued.current = {};
      try {
        latestProfile = await api<Profile>('/profile', { token, method: 'PATCH', body: batch });
        refreshPlan ||= batch.dailyNewWords !== undefined;
      } catch (error) {
        failure = explain(error);
      }
    }
    running.current = false;
    if (latestProfile) updateProfile(latestProfile, refreshPlan);
    setPending({});
    setStatus(failure ? { message: failure, error: true } : { message: 'O‘zgarishlar saqlandi.' });
  }

  return { save, pending, status };
}

export type PreferenceSave = ReturnType<typeof usePreferenceSave>;
