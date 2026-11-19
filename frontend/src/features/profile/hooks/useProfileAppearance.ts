import { useState } from 'react';
import { readProfileAppearance, type ProfileAppearance } from '../data/profileAppearance';

export function useProfileAppearance(userId: string) {
  const [saved, setSaved] = useState(() => readProfileAppearance(userId));

  function save(value: ProfileAppearance) {
    localStorage.setItem('leximind.profile-appearance.' + userId, JSON.stringify(value));
    setSaved(value);
  }

  return { saved, save };
}

export type ProfileAppearanceState = ReturnType<typeof useProfileAppearance>;
