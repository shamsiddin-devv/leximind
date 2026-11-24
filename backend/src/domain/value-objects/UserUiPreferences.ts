export const stockProfileBanners = [
  '/profile-cover.jpg',
  '/profile-banners/alpine-lake.jpg',
  '/profile-banners/dunes.jpg',
  '/profile-banners/forest-valley.jpg',
  '/profile-banners/aurora.jpg',
  '/profile-banners/rainy-city.jpg',
  '/profile-banners/ocean-arches.jpg',
  '/profile-banners/amber-library.jpg',
  '/profile-banners/violet-nebula.jpg',
] as const;

export const orderedProfileMetrics = [
  'xp',
  'words',
  'streak',
  'sessions',
  'accuracy',
  'studyTime',
] as const;

export type ProfileMetric = (typeof orderedProfileMetrics)[number];

export type ProfileAppearance = {
  layout: 'horizontal' | 'vertical';
  banner: string;
  position: 'left' | 'center' | 'right';
  height: 'low' | 'medium' | 'high';
  overlay: number;
  content: {
    bio: boolean;
    email: boolean;
    charts: boolean;
    achievements: boolean;
  };
  statsStyle: 'grid' | 'list';
  metrics: { id: ProfileMetric; visible: boolean }[];
};

export const defaultProfileAppearance: ProfileAppearance = {
  layout: 'horizontal',
  banner: stockProfileBanners[0],
  position: 'center',
  height: 'medium',
  overlay: 25,
  content: { bio: true, email: true, charts: true, achievements: true },
  statsStyle: 'grid',
  metrics: orderedProfileMetrics.map((id) => ({ id, visible: true })),
};

export const defaultNotifications = {
  review: true,
  streak: false,
  achievements: false,
  progress: false,
  weekly: false,
  push: false,
  email: false,
  news: false,
};

export type NotificationPreferences = typeof defaultNotifications;
export type AppearancePatch = Omit<Partial<ProfileAppearance>, 'content'> & {
  content?: Partial<ProfileAppearance['content']>;
};
export type InterfaceSettings = {
  language: 'uz' | 'en' | 'ru';
  themeMode: 'light' | 'dark' | 'system';
  sidebarCollapsed: boolean;
  appearance: {
    accent: string;
    density: 'compact' | 'normal' | 'comfortable';
    textSize: 'small' | 'medium' | 'large';
    animations: boolean;
    reducedMotion: boolean;
  };
};

export const defaultInterfaceSettings: InterfaceSettings = {
  language: 'uz',
  themeMode: 'system',
  sidebarCollapsed: false,
  appearance: {
    accent: 'default',
    density: 'normal',
    textSize: 'medium',
    animations: true,
    reducedMotion: false,
  },
};

export type InterfaceSettingsPatch = Omit<
  Partial<InterfaceSettings>,
  'appearance'
> & {
  appearance?: Partial<InterfaceSettings['appearance']>;
};

export type UserUiPreferences = {
  interfaceSettings: InterfaceSettings | null;
  appearance: ProfileAppearance | null;
  notifications: NotificationPreferences | null;
};
export type UserUiPreferencePatch = {
  interfaceSettings?: InterfaceSettingsPatch;
  appearance?: AppearancePatch;
  notifications?: Partial<NotificationPreferences>;
};

export type PublicProfileCover = Pick<
  ProfileAppearance,
  'banner' | 'position' | 'height' | 'overlay'
>;
