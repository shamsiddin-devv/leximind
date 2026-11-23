import { useCallback, useEffect, useState } from 'react';
import { api, ApiError, explain } from '../../../shared/services/api';
import type { GameScore, Page, Plan, Profile, SessionSummary, Statistics } from '../../../shared/types/api';

type Snapshot = { profile: Profile; plan: Plan; history: SessionSummary[]; scores: GameScore[]; gamesPlayed: number; stats: Statistics };

export function useLearningData(token: string, onSessionLost: () => void) {
  const [snapshot, setSnapshot] = useState<Snapshot>();
  const [error, setError] = useState('');
  const [version, setVersion] = useState(0);
  const reload = useCallback(() => setVersion((n) => n + 1), []);

  function updateProfile(profile: Profile, refreshPlan = true) {
    setSnapshot((current) => current && { ...current, profile });
    if (refreshPlan) reload();
  }

  useEffect(() => {
    const controller = new AbortController();
    const options = { token, signal: controller.signal };
    setError('');
    void Promise.all([
      api<Profile>('/profile', options),
      api<Plan>('/study-plan', options),
      api<Page<SessionSummary>>('/sessions?limit=50', options),
      api<Page<GameScore>>('/game-scores?limit=5', options),
      api<Statistics>('/statistics', options),
    ]).then(([profile, plan, history, scores, stats]) => {
      if (!controller.signal.aborted) setSnapshot({ profile, plan, history: history.data, scores: scores.data, gamesPlayed: scores.total, stats });
    }).catch((failure) => {
      if (controller.signal.aborted) return;
      if (failure instanceof ApiError && failure.status === 401) onSessionLost();
      else setError(explain(failure));
    });
    return () => controller.abort();
  }, [token, version, onSessionLost]);

  return { snapshot, error, reload, updateProfile };
}
