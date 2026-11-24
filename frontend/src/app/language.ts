import { updateInterfaceSettings, useInterfaceSetting } from './interfacePreferences';
import type { InterfaceLanguage } from './interfacePreferences';
export type { InterfaceLanguage } from './interfacePreferences';

export const interfaceLanguages = [
  { id: 'uz', flag: 'UZ', name: 'O‘zbekcha' },
  { id: 'en', flag: 'GB', name: 'English' },
  { id: 'ru', flag: 'RU', name: 'Русский' },
] as const;

export function setInterfaceLanguage(language: InterfaceLanguage) {
  if (!interfaceLanguages.some(({ id }) => id === language)) return;
  updateInterfaceSettings({ language });
}

export function useInterfaceLanguage() {
  return useInterfaceSetting('language');
}