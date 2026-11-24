import { useSyncExternalStore } from 'react';

export type InterfaceLanguage = 'uz' | 'en' | 'ru';
export type ThemeMode = 'light' | 'dark' | 'system';
export type Density = 'compact' | 'normal' | 'comfortable';
export type TextSize = 'small' | 'medium' | 'large';

export type InterfaceSettings = {
  language: InterfaceLanguage;
  themeMode: ThemeMode;
  sidebarCollapsed: boolean;
  appearance: {
    accent: string;
    density: Density;
    textSize: TextSize;
    animations: boolean;
    reducedMotion: boolean;
  };
};

export type InterfaceSettingsPatch = Omit<Partial<InterfaceSettings>, 'appearance'> & {
  appearance?: Partial<InterfaceSettings['appearance']>;
};

export const defaultInterfaceSettings: InterfaceSettings = {
  language: 'uz',
  themeMode: 'system',
  sidebarCollapsed: false,
  appearance: { accent: 'default', density: 'normal', textSize: 'medium', animations: true, reducedMotion: false },
};

const guestKeys = { language: 'leximind.landing-language', theme: 'leximind.theme-mode', appearance: 'leximind.appearance' };
const legacyOwnerKey = 'leximind.interface-legacy-owner';
type SyncIssue = { message: string; retry: () => void };
type AccountScope = {
  value: InterfaceSettings;
  save: (patch: InterfaceSettingsPatch) => void;
  issue?: SyncIssue;
};
const listeners = new Set<() => void>();

function parseSettings(raw: unknown): InterfaceSettings {
  const value = raw as Partial<InterfaceSettings> | null;
  const appearance = value?.appearance;
  return {
    language: value?.language === 'en' || value?.language === 'ru' ? value.language : 'uz',
    themeMode: value?.themeMode === 'dark' || value?.themeMode === 'light' ? value.themeMode : 'system',
    sidebarCollapsed: value?.sidebarCollapsed === true,
    appearance: {
      accent: typeof appearance?.accent === 'string' && /^#[\da-f]{6}$/i.test(appearance.accent) ? appearance.accent : 'default',
      density: appearance?.density === 'compact' || appearance?.density === 'comfortable' ? appearance.density : 'normal',
      textSize: appearance?.textSize === 'small' || appearance?.textSize === 'large' ? appearance.textSize : 'medium',
      animations: appearance?.animations !== false,
      reducedMotion: appearance?.reducedMotion === true,
    },
  };
}

function readGuest() {
  try {
    const language = localStorage.getItem(guestKeys.language);
    const themeMode = localStorage.getItem(guestKeys.theme);
    let appearance: unknown;
    try { appearance = JSON.parse(localStorage.getItem(guestKeys.appearance) ?? '{}'); }
    catch { /* Keep other browser settings if an old appearance entry is invalid. */ }
    return parseSettings({ language, themeMode, appearance });
  } catch { return defaultInterfaceSettings; }
}

let guest = readGuest();
let account: AccountScope | undefined;
let legacyOwner: string | undefined;

function notify() {
  for (const listener of listeners) listener();
}

export function subscribeToInterfaceSettings(listener: () => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

export function getInterfaceSettings() {
  return account?.value ?? guest;
}

export function useInterfaceSetting<K extends keyof InterfaceSettings>(key: K) {
  return useSyncExternalStore(subscribeToInterfaceSettings, () => getInterfaceSettings()[key]);
}

export function useInterfaceSyncIssue() {
  return useSyncExternalStore(subscribeToInterfaceSettings, () => account?.issue);
}

export function mergeInterfaceChanges(previous: InterfaceSettingsPatch, patch: InterfaceSettingsPatch): InterfaceSettingsPatch {
  return {
    ...previous,
    ...patch,
    ...(previous.appearance || patch.appearance ? { appearance: { ...previous.appearance, ...patch.appearance } } : {}),
  };
}

export function applyInterfaceChanges(settings: InterfaceSettings, changes?: InterfaceSettingsPatch): InterfaceSettings {
  if (!changes) return settings;
  return { ...settings, ...changes, appearance: { ...settings.appearance, ...changes.appearance } };
}

export function updateInterfaceSettings(changes: InterfaceSettingsPatch) {
  if (account) {
    account.value = applyInterfaceChanges(account.value, changes);
    account.save(changes);
  } else {
    guest = applyInterfaceChanges(guest, changes);
    try {
      if (changes.language !== undefined) localStorage.setItem(guestKeys.language, guest.language);
      if (changes.themeMode === 'system') localStorage.removeItem(guestKeys.theme);
      else if (changes.themeMode !== undefined) localStorage.setItem(guestKeys.theme, guest.themeMode);
      if (changes.appearance) localStorage.setItem(guestKeys.appearance, JSON.stringify(guest.appearance));
    } catch { /* The current choices work when local storage is unavailable. */ }
  }
  notify();
}

export function activateAccountInterface(userId: string, save: AccountScope['save']) {
  const cacheKey = 'leximind.account-interface.' + userId;
  let cached: InterfaceSettings | undefined;
  try {
    const raw = localStorage.getItem(cacheKey);
    if (raw !== null) cached = parseSettings(JSON.parse(raw));
  } catch { /* The server supplies the authoritative copy. */ }

  // Older versions used shared browser keys. Associate their values with the
  // active account once, and keep later signed-in choices in account storage.
  if (!legacyOwner) {
    try {
      legacyOwner = localStorage.getItem(legacyOwnerKey) ?? userId;
      localStorage.setItem(legacyOwnerKey, legacyOwner);
    } catch { legacyOwner = userId; }
  }
  const legacy = !cached && legacyOwner === userId ? guest : undefined;
  const initial = cached ?? legacy ?? defaultInterfaceSettings;
  const scope: AccountScope = { value: initial, save };
  account = scope;
  notify();

  return {
    initial,
    legacy: legacy && JSON.stringify(legacy) !== JSON.stringify(defaultInterfaceSettings) ? legacy : undefined,
    apply(value: InterfaceSettings, confirmed?: InterfaceSettings | null) {
      if (account !== scope) return;
      scope.value = value;
      if (confirmed) {
        try { localStorage.setItem(cacheKey, JSON.stringify(confirmed)); }
        catch { /* The authenticated API still stores the choices. */ }
      }
      notify();
    },
    setIssue(issue?: SyncIssue) {
      if (account !== scope) return;
      scope.issue = issue;
      notify();
    },
    close() {
      if (account !== scope) return;
      account = undefined;
      notify();
    },
  };
}

window.addEventListener('storage', (event) => {
  if (event.key !== null && !Object.values(guestKeys).some((key) => key === event.key)) return;
  guest = readGuest();
  if (!account) notify();
});
