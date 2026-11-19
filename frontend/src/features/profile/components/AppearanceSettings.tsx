import { useSyncExternalStore, type CSSProperties } from 'react';
import { Check, Monitor, Moon, Sun } from 'lucide-react';
import {
  getAppearance, getSystemTheme, getThemeMode, setAppearance, setThemeMode, subscribeToTheme,
  type Density, type TextSize, type ThemeMode,
} from '../../../app/theme';
import { PreferenceSection, PreferenceSwitch } from './PreferenceControls';
import { SettingsField } from './SettingsField';
import './AppearanceSettings.css';

const themes = [
  { value: 'light', label: 'Yorug‘', icon: Sun },
  { value: 'dark', label: 'Qorong‘i', icon: Moon },
  { value: 'system', label: 'Tizim', icon: Monitor },
] as const satisfies readonly { value: ThemeMode; label: string; icon: typeof Sun }[];

const accents = [
  { value: 'default', color: '#615bfe', label: 'Binafsha' },
  { value: '#6b94ff', color: '#6b94ff', label: 'Ko‘k' },
  { value: '#41abcd', color: '#41abcd', label: 'Moviy' },
  { value: '#ffaf51', color: '#ffaf51', label: 'Och to‘q sariq' },
  { value: '#ff8e35', color: '#ff8e35', label: 'To‘q sariq' },
  { value: '#f86569', color: '#f86569', label: 'Qizil' },
  { value: '#ee72ad', color: '#ee72ad', label: 'Pushti' },
];

const densities = [
  { value: 'compact', label: 'Ixcham' },
  { value: 'normal', label: 'Odatiy' },
  { value: 'comfortable', label: 'Keng' },
] as const satisfies readonly { value: Density; label: string }[];

const textSizes = [
  { value: 'small', label: 'Kichik' },
  { value: 'medium', label: 'O‘rta' },
  { value: 'large', label: 'Katta' },
] as const satisfies readonly { value: TextSize; label: string }[];

export function AppearanceSettings() {
  const mode = useSyncExternalStore(subscribeToTheme, getThemeMode);
  const systemTheme = useSyncExternalStore(subscribeToTheme, getSystemTheme);
  const appearance = useSyncExternalStore(subscribeToTheme, getAppearance);
  const custom = !accents.some(({ value }) => value === appearance.accent);

  return <div className="learning-preferences-form appearance-settings">
    <PreferenceSection id="appearance-theme" title="Mavzu" description="Yorug‘, qorong‘i yoki qurilmangizdagi rejimni tanlang.">
      <div className="appearance-theme-grid" role="radiogroup" aria-labelledby="appearance-theme">
        {themes.map(({ value, label, icon: Icon }) => <label className="appearance-choice" key={value}>
          <input type="radio" name="appearance-theme" value={value} checked={mode === value} onChange={() => setThemeMode(value)} />
          <span className="appearance-option">
            <span className="appearance-theme-preview" data-preview={value} aria-hidden="true">
              <span className="appearance-theme-lines"><i /><i /><i /></span>
            </span>
            <span className="appearance-theme-label">
              <Icon size={16} aria-hidden="true" /> {label}
              {value === 'system' && <small>({systemTheme === 'dark' ? 'qorong‘i' : 'yorug‘'})</small>}
            </span>
          </span>
        </label>)}
      </div>
    </PreferenceSection>

    <PreferenceSection id="appearance-accent" title="Asosiy rang" description="Tugmalar, havolalar va tanlangan elementlar rangi.">
      <div className="appearance-colors" role="group" aria-labelledby="appearance-accent">
        {accents.map(({ value, color, label }) => <label className="appearance-swatch" key={value} title={label}>
          <input type="radio" name="appearance-accent" value={value} aria-label={label}
            checked={appearance.accent === value} onChange={() => setAppearance({ accent: value })} />
          <span style={{ '--swatch': color } as CSSProperties} aria-hidden="true"><Check size={15} /></span>
        </label>)}
        <label className="appearance-swatch appearance-custom-color" title="Maxsus rang" data-selected={custom}>
          <input aria-label="Maxsus rang" type="color" value={custom ? appearance.accent : '#615bfe'}
            onInput={(event) => setAppearance({ accent: event.currentTarget.value })} />
          <span aria-hidden="true"><Check size={15} /></span>
        </label>
      </div>
    </PreferenceSection>

    <PreferenceSection id="appearance-interface" title="Interfeys">
      <div className="appearance-density">
        <h3 id="appearance-density">Interfeys zichligi</h3>
        <p>Kartalar va qatorlar orasidagi bo‘shliq.</p>
        <div className="appearance-density-grid" role="radiogroup" aria-labelledby="appearance-density">
          {densities.map(({ value, label }) => <label className="appearance-choice" key={value}>
            <input type="radio" name="appearance-density" value={value} checked={appearance.density === value}
              onChange={() => setAppearance({ density: value })} />
            <span className="appearance-option">
              <span className="appearance-density-preview" data-spacing={value} aria-hidden="true"><i /><i /><i /></span>
              <span>{label}</span>
            </span>
          </label>)}
        </div>
      </div>
      <div className="settings-form-row learning-selector-row">
        <span className="settings-row-label" id="appearance-text-size">Matn o‘lchami</span>
        <div className="learning-segments" role="radiogroup" aria-labelledby="appearance-text-size">
          {textSizes.map(({ value, label }) => <label key={value}>
            <input type="radio" name="appearance-text-size" value={value} checked={appearance.textSize === value}
              onChange={() => setAppearance({ textSize: value })} />
            <span>{label}</span>
          </label>)}
        </div>
      </div>
      <SettingsField id="appearance-animations" label="Animatsiyalar" description="Silliq o‘tishlar va paydo bo‘lish effektlari.">
        <PreferenceSwitch id="appearance-animations" descriptionId="appearance-animations-description" checked={appearance.animations}
          onChange={(animations) => setAppearance({ animations })} />
      </SettingsField>
      <SettingsField id="appearance-reduced-motion" label="Harakatni kamaytirish" description="Siljish, kattalashish va boshqa harakat effektlarini kamaytiradi.">
        <PreferenceSwitch id="appearance-reduced-motion" descriptionId="appearance-reduced-motion-description" checked={appearance.reducedMotion}
          onChange={(reducedMotion) => setAppearance({ reducedMotion })} />
      </SettingsField>
    </PreferenceSection>
  </div>;
}
