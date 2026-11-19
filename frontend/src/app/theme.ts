type Theme = 'light' | 'dark';
export type ThemeMode = Theme | 'system';
export type Density = 'compact' | 'normal' | 'comfortable';
export type TextSize = 'small' | 'medium' | 'large';
type Appearance = {
  accent: string;
  density: Density;
  textSize: TextSize;
  animations: boolean;
  reducedMotion: boolean;
};

const key = 'leximind.theme';
const appearanceKey = 'leximind.appearance';
const systemTheme = window.matchMedia('(prefers-color-scheme: dark)');
const systemMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const listeners = new Set<() => void>();
const defaults: Appearance = { accent: 'default', density: 'normal', textSize: 'medium', animations: true, reducedMotion: false };
let appearance = defaults;
let preference: ThemeMode = 'system';

export function getSystemTheme(): Theme {
  return systemTheme.matches ? 'dark' : 'light';
}

export function getTheme(): Theme {
  return preference === 'system' ? getSystemTheme() : preference;
}

export function getThemeMode() { return preference; }
export function getAppearance() { return appearance; }

function accentForWhiteText(hex: string) {
  let rgb = [1, 3, 5].map((start) => Number.parseInt(hex.slice(start, start + 2), 16));
  const weights = [0.2126, 0.7152, 0.0722];
  const luminance = () => rgb.reduce((total, channel, index) => {
    const ratio = channel / 255;
    const linear = ratio <= 0.04045 ? ratio / 12.92 : ((ratio + 0.055) / 1.055) ** 2.4;
    return total + linear * weights[index];
  }, 0);
  while (1.05 / (luminance() + 0.05) < 4.5) {
    rgb = rgb.map((channel) => Math.floor(channel * 0.95));
  }
  return 'rgb(' + rgb.join(', ') + ')';
}

function updateDocument() {
  const theme = getTheme();
  const root = document.documentElement;
  root.dataset.theme = theme;
  root.dataset.density = appearance.density;
  root.dataset.textSize = appearance.textSize;
  root.dataset.animations = String(appearance.animations);
  root.dataset.reducedMotion = String(systemMotion.matches || appearance.reducedMotion);
  if (appearance.accent === 'default') {
    delete root.dataset.accent;
    root.style.removeProperty('--appearance-color');
    root.style.removeProperty('--appearance-fill');
  } else {
    root.dataset.accent = 'custom';
    root.style.setProperty('--appearance-color', appearance.accent);
    root.style.setProperty('--appearance-fill', accentForWhiteText(appearance.accent));
  }
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'dark' ? '#111313' : '#faf9f6');
  listeners.forEach((listener) => listener());
}

function readPreference() {
  try {
    const stored = window.localStorage.getItem(key);
    preference = stored === 'light' || stored === 'dark' ? stored : 'system';
  } catch { /* The active theme still applies when storage is restricted. */ }
}

function readAppearance() {
  try {
    const saved = JSON.parse(window.localStorage.getItem(appearanceKey) ?? '{}');
    appearance = {
      accent: typeof saved?.accent === 'string' && /^#[\da-f]{6}$/i.test(saved.accent) ? saved.accent : defaults.accent,
      density: saved?.density === 'compact' || saved?.density === 'comfortable' ? saved.density : defaults.density,
      textSize: saved?.textSize === 'small' || saved?.textSize === 'large' ? saved.textSize : defaults.textSize,
      animations: saved?.animations !== false,
      reducedMotion: saved?.reducedMotion === true,
    };
  } catch { /* Keep the active preferences if storage cannot be read. */ }
}

export function initializeTheme() {
  readPreference();
  readAppearance();
  updateDocument();
  systemTheme.addEventListener('change', updateDocument);
  systemMotion.addEventListener('change', updateDocument);
  window.addEventListener('storage', (event) => {
    if (event.key === key || event.key === null) readPreference();
    if (event.key === appearanceKey || event.key === null) readAppearance();
    if (event.key !== key && event.key !== appearanceKey && event.key !== null) return;
    updateDocument();
  });
}

export function subscribeToTheme(listener: () => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

export function setThemeMode(mode: ThemeMode) {
  preference = mode;
  try {
    if (mode === 'system') window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, mode);
  } catch { /* The current choice still applies. */ }
  updateDocument();
}

export function toggleTheme() {
  const nextTheme = getTheme() === 'dark' ? 'light' : 'dark';
  setThemeMode(nextTheme === getSystemTheme() ? 'system' : nextTheme);
}

export function setAppearance(changes: Partial<Appearance>) {
  appearance = { ...appearance, ...changes };
  try { window.localStorage.setItem(appearanceKey, JSON.stringify(appearance)); }
  catch { /* The current choice still applies. */ }
  updateDocument();
}
