import { useEffect, useState } from 'react';
import { ChevronDown, Globe2, MapPin } from 'lucide-react';
import countries from '../data/countries.json';
import { SettingsField } from './SettingsField';

const assets = import.meta.env.BASE_URL + 'profile-geo/';
type Cities = Partial<Record<string, string[]>>;
const customCityOption = '__other__';

function CountryFlag({ code }: { code: string }) {
  return <svg className="settings-location-flag" viewBox="0 0 512 512" aria-hidden="true">
    <use href={assets + 'flags.svg#flag-' + code} />
  </svg>;
}

export function LocationFields({ countryCode, city, legacyLocation, disabled, onCountryChange, onCityChange, onClearLegacy }: {
  countryCode: string;
  city: string;
  legacyLocation: string;
  disabled: boolean;
  onCountryChange: (code: string) => void;
  onCityChange: (city: string) => void;
  onClearLegacy: () => void;
}) {
  const [cityData, setCityData] = useState<Cities>();
  const wantsCities = !!countryCode;

  useEffect(() => {
    if (!wantsCities || cityData !== undefined) return;
    const controller = new AbortController();
    async function load() {
      try {
        const response = await fetch(assets + 'cities.json', { signal: controller.signal });
        if (!response.ok) throw new Error('City list unavailable');
        const data = await response.json() as Cities;
        if (!controller.signal.aborted) setCityData(data);
      } catch {
        if (!controller.signal.aborted) setCityData({});
      }
    }
    void load();
    return () => controller.abort();
  }, [wantsCities, cityData]);

  const richOptions = CSS.supports('appearance', 'base-select');
  const cityOptions = cityData?.[countryCode];
  const isKnownCountry = countries.some(({ code }) => code === countryCode);

  return <>
    <SettingsField id="settings-country" label="Davlat" optional>
      <div className="settings-location-select is-country">
        <span className="settings-location-leading">{countryCode && isKnownCountry ? <CountryFlag code={countryCode} /> : <Globe2 size={18} aria-hidden="true" />}</span>
        <select id="settings-country" name="countryCode" value={countryCode} disabled={disabled} aria-describedby="settings-country-note"
          onChange={(event) => onCountryChange(event.target.value)}>
          <option value="">Davlatni tanlang</option>
          {countryCode && !isKnownCountry && <option value={countryCode}>{countryCode}</option>}
          {countries.map(({ code, name }) => <option key={code} value={code}>{richOptions && <CountryFlag code={code} />}{name}</option>)}
        </select>
        <ChevronDown className="settings-location-chevron" size={16} aria-hidden="true" />
      </div>
      <small id="settings-country-note">Davlatni tanlang. Shaharlar ro‘yxati shu tanlovga mos ochiladi.</small>
      {!countryCode && legacyLocation && <div className="settings-legacy-location">
        <small>Avvalgi joylashuv: {legacyLocation}</small>
        <button className="text-link" type="button" disabled={disabled} onClick={onClearLegacy}>Olib tashlash</button>
      </div>}
    </SettingsField>
    {countryCode && <CityField key={countryCode} city={city} options={cityOptions} loading={cityData === undefined}
      disabled={disabled} onChange={onCityChange} />}
  </>;
}

function CityField({ city, options, loading, disabled, onChange }: {
  city: string; options?: string[]; loading: boolean; disabled: boolean; onChange: (city: string) => void;
}) {
  const [otherSelected, setOtherSelected] = useState(false);
  const other = otherSelected || (!loading && !!city && !options?.includes(city));
  const selected = other ? customCityOption : city;

  return <SettingsField id="settings-city" label="Shahar" optional>
    <div className="settings-location-select">
      <span className="settings-location-leading"><MapPin size={18} aria-hidden="true" /></span>
      <select id="settings-city" name="cityChoice" value={selected} disabled={loading || disabled} aria-describedby="settings-city-note"
        onChange={(event) => {
          const value = event.target.value;
          setOtherSelected(value === customCityOption);
          onChange(value === customCityOption ? '' : value);
        }}>
        <option value="">{loading ? 'Shaharlar yuklanmoqda…' : 'Shaharni tanlang'}</option>
        {loading && city && <option value={city}>{city}</option>}
        {options?.map((name) => <option key={name} value={name}>{name}</option>)}
        <option value={customCityOption}>Boshqa shahar…</option>
      </select>
      <ChevronDown className="settings-location-chevron" size={16} aria-hidden="true" />
    </div>
    {other && <input aria-label="Boshqa shahar nomi" name="city" autoComplete="address-level2" maxLength={100} value={city}
      disabled={disabled} placeholder="Shahar nomini kiriting" onChange={(event) => onChange(event.target.value)} />}
    <small id="settings-city-note">Shahar ro‘yxatda bo‘lmasa, nomini o‘zingiz kiriting.</small>
  </SettingsField>;
}
