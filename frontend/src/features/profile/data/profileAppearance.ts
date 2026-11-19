export const profileBanners = [
  { image: '/profile-cover.jpg', name: 'Oyli tun' },
  { image: '/profile-banners/alpine-lake.jpg', name: 'Tog‘ ko‘li' },
  { image: '/profile-banners/dunes.jpg', name: 'Sahro oqshomi' },
  { image: '/profile-banners/forest-valley.jpg', name: 'Tumanli vodiy' },
];

export const defaultBanner = profileBanners[0].image;
export const profileMetrics = [
  { id: 'xp', label: 'Jami XP' },
  { id: 'words', label: 'O‘rganilgan so‘zlar' },
  { id: 'streak', label: 'Joriy streak' },
  { id: 'sessions', label: 'Seanslar' },
  { id: 'accuracy', label: 'Aniqlik' },
  { id: 'studyTime', label: 'O‘rganish vaqti' },
] as const;

export type ProfileMetric = typeof profileMetrics[number]['id'];
export type ProfileAppearance = {
  layout: 'horizontal' | 'vertical';
  banner: string;
  position: 'left' | 'center' | 'right';
  height: 'low' | 'medium' | 'high';
  overlay: number;
  content: { bio: boolean; email: boolean; charts: boolean; achievements: boolean };
  statsStyle: 'grid' | 'list';
  metrics: { id: ProfileMetric; visible: boolean }[];
};

export const defaultProfileAppearance: ProfileAppearance = {
  layout: 'horizontal',
  banner: defaultBanner,
  position: 'center',
  height: 'medium',
  overlay: 25,
  content: { bio: true, email: true, charts: true, achievements: true },
  statsStyle: 'grid',
  metrics: profileMetrics.map(({ id }) => ({ id, visible: true })),
};

function isBanner(value: unknown): value is string {
  return typeof value === 'string' && (profileBanners.some(({ image }) => image === value)
    || value.startsWith('data:image/jpeg;base64,'));
}

export function readProfileAppearance(userId: string): ProfileAppearance {
  try {
    const legacyBanner = localStorage.getItem('leximind.profile-banner.' + userId);
    const value = JSON.parse(localStorage.getItem('leximind.profile-appearance.' + userId) ?? '{}');
    const defaults = defaultProfileAppearance;
    const content = { ...defaults.content };
    for (const key of Object.keys(content) as (keyof typeof content)[]) {
      if (typeof value?.content?.[key] === 'boolean') content[key] = value.content[key];
    }
    const metrics = new Map<ProfileMetric, boolean>();
    for (const metric of Array.isArray(value?.metrics) ? value.metrics : []) {
      const known = profileMetrics.find(({ id }) => id === metric?.id);
      if (known && typeof metric.visible === 'boolean') metrics.set(known.id, metric.visible);
    }
    for (const { id } of profileMetrics) if (!metrics.has(id)) metrics.set(id, true);
    return {
      layout: value?.layout === 'vertical' ? 'vertical' : defaults.layout,
      banner: isBanner(value?.banner) ? value.banner : isBanner(legacyBanner) ? legacyBanner : defaultBanner,
      position: value?.position === 'left' || value?.position === 'right' ? value.position : defaults.position,
      height: value?.height === 'low' || value?.height === 'high' ? value.height : defaults.height,
      overlay: Number.isInteger(value?.overlay) && value.overlay >= 0 && value.overlay <= 75 ? value.overlay : defaults.overlay,
      content,
      statsStyle: value?.statsStyle === 'list' ? 'list' : defaults.statsStyle,
      metrics: Array.from(metrics, ([id, visible]) => ({ id, visible })),
    };
  } catch { return defaultProfileAppearance; }
}
