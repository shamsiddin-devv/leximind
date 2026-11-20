export const achievementRules = [
  { id: 'first-step', target: 1, rewardXp: 50 },
  { id: 'streak-30', target: 30, rewardXp: 300 },
  { id: 'words-1000', target: 1000, rewardXp: 400 },
  { id: 'accuracy-50', target: 50, rewardXp: 350 },
  { id: 'early-bird', target: 20, rewardXp: 150 },
  { id: 'level-b2', target: 4, rewardXp: 600 },
  { id: 'streak-100', target: 100, rewardXp: 1000 },
  { id: 'words-2000', target: 2000, rewardXp: 800 },
  { id: 'perfect-session', target: 1, rewardXp: 200 },
  { id: 'night-owl', target: 15, rewardXp: 120 },
  { id: 'social', target: 10, rewardXp: 250 },
  { id: 'marathon', target: 36_000, rewardXp: 500 },
] as const;

export type AchievementProgress = {
  id: (typeof achievementRules)[number]['id'];
  target: number;
  rewardXp: number;
  progress: number | null;
  earnedOn: string | null;
};
