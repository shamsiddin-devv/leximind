import {
  BarChart3, Bell, BookOpen, CalendarDays, ClipboardList, Compass, Crown, FolderHeart, Gamepad2,
  House, KeyRound, Layers3, NotebookPen, Palette, PanelsTopLeft, RotateCcw, Settings2, ShieldCheck, Trophy, UserRound, type LucideIcon,
} from 'lucide-react';
import { routes } from './router';

export type PageIntro = {
  description: string;
  related?: { href: string; label: string };
};

export type NavigationItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  intro?: PageIntro;
};

export type NavigationGroup = {
  title: string;
  icon: LucideIcon;
  items: NavigationItem[];
};

export const navigation: NavigationGroup[] = [
  {
    title: 'Main Navigation',
    icon: House,
    items: [
      { href: routes.dashboard, label: 'Dashboard', icon: House },
      { href: routes.vocabulary, label: 'Vocabulary', icon: BookOpen },
      { href: routes.games, label: 'Games', icon: Gamepad2 },
      { href: routes.learningSessions, label: 'Learning Sessions', icon: Layers3 },
      { href: routes.studyPlan, label: 'Study Plan', icon: ClipboardList },
    ],
  },
  {
    title: 'Progress',
    icon: BarChart3,
    items: [
      { href: routes.reviewCenter, label: 'Review Center', icon: RotateCcw },
      { href: routes.statistics, label: 'Statistics', icon: BarChart3 },
      { href: routes.learningCalendar, label: 'Learning Calendar', icon: CalendarDays },
    ],
  },
  {
    title: 'Explore',
    icon: Compass,
    items: [
      { href: routes.topics, label: 'Topics Explorer', icon: Compass },
      { href: routes.achievements, label: 'Achievements', icon: Trophy },
      { href: routes.leaderboard, label: 'Leaderboard', icon: Crown },
    ],
  },
  {
    title: 'Personal',
    icon: FolderHeart,
    items: [
      { href: routes.collections, label: 'My Collections', icon: FolderHeart },
      { href: routes.mistakes, label: 'Mistakes Notebook', icon: NotebookPen },
    ],
  },
];

export const settingsNavigation: NavigationGroup = {
  title: 'Settings',
  icon: Settings2,
  items: [
    { href: routes.settingsAccount, label: 'Account', icon: UserRound },
    { href: routes.settingsPassword, label: 'Password', icon: KeyRound },
    { href: routes.settingsLearning, label: 'Learning Preferences', icon: BookOpen },
    { href: routes.settingsNotifications, label: 'Notifications', icon: Bell },
    { href: routes.settingsAppearance, label: 'Appearance', icon: Palette },
    { href: routes.settingsCustomization, label: 'UI Customization', icon: PanelsTopLeft },
    { href: routes.settingsPrivacy, label: 'Privacy & Security', icon: ShieldCheck },
  ],
};

export const accountNavigation: NavigationItem[] = [
  { href: routes.settingsAccount, label: 'Settings', icon: Settings2 },
  { href: routes.profile, label: 'Profile', icon: UserRound },
];

const allNavigation = [...navigation.flatMap(({ items }) => items), ...accountNavigation, ...settingsNavigation.items];
export const navigationPages = new Map(allNavigation.map((item) => [item.href, item] as const));
