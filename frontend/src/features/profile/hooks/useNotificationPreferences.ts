import { useState } from 'react';

const defaults = {
  review: true,
  streak: false,
  achievements: false,
  progress: false,
  weekly: false,
  push: false,
  email: false,
  news: false,
};

export type NotificationChoice = keyof typeof defaults;
const choices = Object.keys(defaults) as NotificationChoice[];

export function useNotificationPreferences(userId: string) {
  const key = 'leximind.notifications.' + userId;
  const [values, setValues] = useState(() => {
    const stored = { ...defaults };
    try {
      const saved = JSON.parse(localStorage.getItem(key) ?? '{}');
      for (const choice of choices) {
        if (typeof saved?.[choice] === 'boolean') stored[choice] = saved[choice];
      }
    } catch { /* Start with the defaults if storage is unavailable. */ }
    return stored;
  });
  const [error, setError] = useState('');

  function save(changes: Partial<typeof defaults>) {
    const next = { ...values, ...changes };
    try {
      localStorage.setItem(key, JSON.stringify(next));
      setValues(next);
      setError('');
      return true;
    } catch {
      setError('Bildirishnoma sozlamalarini bu brauzerda saqlab bo‘lmadi.');
      return false;
    }
  }

  return { values, choices, save, error };
}

export type NotificationPreferences = ReturnType<typeof useNotificationPreferences>;
