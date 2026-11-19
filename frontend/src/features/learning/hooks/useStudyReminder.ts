import { useEffect, useState } from 'react';
import type { Profile } from '../../../shared/types/api';
import { dateKey } from '../../../shared/utils/date';

export function useStudyReminder(userId: string, profile?: Profile, lastGameAt?: string) {
  const key = `leximind.study-reminder.${userId}`;
  const enabled = profile?.studyReminderEnabled ?? false;
  const [now, setNow] = useState(() => new Date());
  const [dismissedDate, setDismissedDate] = useState(() => {
    try { return localStorage.getItem(key); } catch { return null; }
  });

  useEffect(() => {
    if (!enabled) return;
    const refresh = () => setNow(new Date());
    refresh();
    const timer = window.setInterval(refresh, 30_000);
    document.addEventListener('visibilitychange', refresh);
    return () => { window.clearInterval(timer); document.removeEventListener('visibilitychange', refresh); };
  }, [enabled]);

  if (!enabled || !profile) return { visible: false } as const;
  const { lastSessionAt, studyReminderTime } = profile;
  const today = dateKey(now);
  const clock = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(now);
  const completedToday = [lastSessionAt, lastGameAt].some((time) => time && dateKey(new Date(time)) === today);
  const visible = clock >= studyReminderTime && dismissedDate !== today && !completedToday;

  function dismiss() {
    setDismissedDate(today);
    try { localStorage.setItem(key, today); } catch { /* Dismissal still applies to this workspace. */ }
  }

  return { visible, dismiss };
}
