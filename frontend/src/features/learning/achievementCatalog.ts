import { BookOpen, CheckCheck, Flag, Flame, LocateFixed, Medal, Moon, Sun, Timer, Users, type LucideIcon } from 'lucide-react';

export const achievementCategories = [
  { id: '', label: 'Barchasi' }, { id: 'habits', label: 'Odat' }, { id: 'streak', label: 'Seriya' },
  { id: 'vocabulary', label: 'Lug‘at' }, { id: 'accuracy', label: 'Aniqlik' },
  { id: 'level', label: 'Daraja' }, { id: 'social', label: 'Ijtimoiy' },
] as const;

type Category = Exclude<(typeof achievementCategories)[number]['id'], ''>;
export type AchievementDefinition = {
  id: string; name: string; requirement: string; category: Category; rarity: 'common' | 'rare' | 'legendary'; icon: LucideIcon;
};

export const achievementCatalog: AchievementDefinition[] = [
  { id: 'first-step', name: 'Birinchi qadam', requirement: 'Birinchi darsni yakunlang', category: 'habits', rarity: 'common', icon: Flag },
  { id: 'streak-30', name: '30 kunlik olov', requirement: '30 kun ketma-ket o‘rganing', category: 'streak', rarity: 'rare', icon: Flame },
  { id: 'words-1000', name: 'So‘z ustasi', requirement: '1 000 ta so‘zni yodlang', category: 'vocabulary', rarity: 'rare', icon: BookOpen },
  { id: 'accuracy-50', name: 'Aniq nishon', requirement: '50 seansda 90% dan yuqori aniqlikka erishing', category: 'accuracy', rarity: 'rare', icon: LocateFixed },
  { id: 'early-bird', name: 'Erta qush', requirement: 'Soat 07:00 dan oldin 20 ta seans boshlang va yakunlang', category: 'habits', rarity: 'common', icon: Sun },
  { id: 'level-b2', name: 'B2 darajasi', requirement: 'Daraja testida B2 yoki undan yuqori natija oling', category: 'level', rarity: 'legendary', icon: Medal },
  { id: 'streak-100', name: '100 kunlik afsona', requirement: '100 kun ketma-ket o‘rganing', category: 'streak', rarity: 'legendary', icon: Flame },
  { id: 'words-2000', name: 'Til ustasi', requirement: '2 000 ta so‘zni yodlang', category: 'vocabulary', rarity: 'legendary', icon: BookOpen },
  { id: 'perfect-session', name: 'Mukammal seans', requirement: 'Bir seansda 100% aniqlikka erishing', category: 'accuracy', rarity: 'rare', icon: CheckCheck },
  { id: 'night-owl', name: 'Tungi boyqush', requirement: 'Soat 23:00 dan keyin 15 ta seans boshlang va yakunlang', category: 'habits', rarity: 'common', icon: Moon },
  { id: 'social', name: 'Ijtimoiy parvoz', requirement: '10 ta foydalanuvchini LexiMind’ga taklif qiling', category: 'social', rarity: 'rare', icon: Users },
  { id: 'marathon', name: 'Marafon', requirement: 'Bir oyda 10 soat o‘rganing', category: 'habits', rarity: 'legendary', icon: Timer },
];

export const rarityLabels = { common: 'Oddiy', rare: 'Nodir', legendary: 'Afsonaviy' };
