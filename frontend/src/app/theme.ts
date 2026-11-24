import { getInterfaceSettings, subscribeToInterfaceSettings, updateInterfaceSettings } from './interfacePreferences';
import type { InterfaceSettings, ThemeMode } from './interfacePreferences';

export type { ThemeMode, Density, TextSize } from './interfacePreferences';

type Theme = 'light' | 'dark';
const systemTheme = window.matchMedia('(prefers-color-scheme: dark)');
const systemMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const listeners = new Set<() => void>();

export function getSystemTheme(): Theme {
  return systemTheme.matches ? 'dark' : 'light';
}

export function getTheme(): Theme {
  const mode = getThemeMode();
  return mode === 'system' ? getSystemTheme() : mode;
}

export function getThemeMode() { return getInterfaceSettings().themeMode; }
export function getAppearance() { return getInterfaceSettings().appearance; }

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
  const appearance = getAppearance();
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
  const mode = getThemeMode();
  document.querySelector('meta[name="color-scheme"]')?.setAttribute('content', mode === 'system' ? 'light dark' : mode);
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'dark' ? '#111313' : '#faf9f6');
  listeners.forEach((listener) => listener());
}

export function initializeTheme() {
  updateDocument();
  subscribeToInterfaceSettings(updateDocument);
  systemTheme.addEventListener('change', updateDocument);
  systemMotion.addEventListener('change', updateDocument);
}

export function subscribeToTheme(listener: () => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

export function setThemeMode(mode: ThemeMode) {
  updateInterfaceSettings({ themeMode: mode });
}

export function toggleTheme() {
  const nextTheme = getTheme() === 'dark' ? 'light' : 'dark';
  setThemeMode(nextTheme === getSystemTheme() ? 'system' : nextTheme);
}

export function setAppearance(changes: Partial<InterfaceSettings['appearance']>) {
  updateInterfaceSettings({ appearance: changes });
}
