import { useEffect, useState } from 'react';
import countries from '../data/countries.json';

export type VerificationPlace = {
  countryCode: string;
  administrativeRegion: string;
  city: string;
  streetAddress: string;
  addressDetails: string;
};

type Region = { name: string; code: string; districts: { name: string; code: string }[] };
const catalogPath = import.meta.env.BASE_URL + 'profile-geo/uz/';
const other = '__other__';

function useAddressCatalog<T>(filename: string | undefined) {
  const [result, setResult] = useState<{ file: string; data?: T }>();
  useEffect(() => {
    if (!filename) return;
    const controller = new AbortController();
    async function load(file: string) {
      try {
        const response = await fetch(catalogPath + file, { signal: controller.signal });
        if (!response.ok) throw new Error('Catalog unavailable');
        const data = await response.json() as T;
        if (!controller.signal.aborted) setResult({ file, data });
      } catch {
        if (!controller.signal.aborted) setResult({ file });
      }
    }
    void load(filename);
    return () => controller.abort();
  }, [filename]);
  return {
    data: result?.file === filename ? result?.data : undefined,
    loading: Boolean(filename && result?.file !== filename),
  };
}

export function VerificationAddress({ place, onChange, disabled }: {
  place: VerificationPlace; onChange: (place: VerificationPlace) => void; disabled: boolean;
}) {
  const local = place.countryCode === 'UZ';
  const regions = useAddressCatalog<Region[]>(local ? 'regions.json' : undefined);
  const region = regions.data?.find(({ name }) => name === place.administrativeRegion);
  const district = region?.districts.find(({ name }) => name === place.city);
  const streets = useAddressCatalog<Record<string, string[]>>(region && district ? region.code + '.json' : undefined);
  const [customCity, setCustomCity] = useState(false);
  const showCityInput = Boolean(place.countryCode && (!local || !regions.loading && (
    !regions.data || region && (customCity || place.city && !district)
  )));
  const streetOptions = district && streets.data?.[district.code];
  const query = place.streetAddress.trim().toLocaleLowerCase('uz').replace(/[ʻ‘’ʼ`]/g, "'");
  const suggestions = query.length < 2 || !streetOptions ? [] : streetOptions.filter((name) =>
    name.toLocaleLowerCase('uz').replace(/[ʻ‘’ʼ`]/g, "'").includes(query),
  ).slice(0, 30);

  return <div className="badge-address">
    <label>Davlat
      <select name="countryCode" value={place.countryCode} autoComplete="country" required disabled={disabled}
        onChange={(event) => {
          setCustomCity(false);
          onChange({ countryCode: event.target.value, administrativeRegion: '', city: '', streetAddress: '', addressDetails: '' });
        }}>
        <option value="">Davlatni tanlang</option>
        {countries.map(({ code, name }) => <option key={code} value={code}>{name}</option>)}
      </select>
    </label>
    {place.countryCode && <div className="badge-address-pair">
      <label>{local ? 'Viloyat yoki respublika shahri' : 'Viloyat yoki hudud (ixtiyoriy)'}
        {local && (regions.loading || regions.data) ? <select autoComplete="address-level1" required disabled={disabled || regions.loading}
          value={place.administrativeRegion} onChange={(event) => {
            setCustomCity(false);
            onChange({ ...place, administrativeRegion: event.target.value, city: '', streetAddress: '', addressDetails: '' });
          }}>
          <option value="">{regions.loading ? 'Viloyatlar yuklanmoqda…' : 'Viloyatni tanlang'}</option>
          {regions.data?.map(({ code, name }) => <option key={code} value={name}>{name}</option>)}
        </select> : <input autoComplete="address-level1" required={local} maxLength={100} disabled={disabled}
          value={place.administrativeRegion} onChange={(event) => onChange({ ...place, administrativeRegion: event.target.value })} />}
      </label>
      {local && region && <label>Shahar yoki tuman
        <select autoComplete="address-level2" value={showCityInput ? other : place.city} required disabled={disabled}
          onChange={(event) => {
            const value = event.target.value;
            setCustomCity(value === other);
            onChange({ ...place, city: value === other ? '' : value, streetAddress: '', addressDetails: '' });
          }}>
          <option value="">Shahar yoki tumanni tanlang</option>
          {region.districts.map(({ code, name }) => <option key={code} value={name}>{name}</option>)}
          <option value={other}>Ro‘yxatda yo‘q</option>
        </select>
      </label>}
      {showCityInput && <label>{local && region ? 'Shahar yoki tuman nomi' : 'Shahar yoki tuman'}
        <input name="city" autoComplete="address-level2" maxLength={100} required disabled={disabled} value={place.city}
          onChange={(event) => onChange({ ...place, city: event.target.value, streetAddress: '', addressDetails: '' })} />
      </label>}
    </div>}
    {place.countryCode && <label>Ko‘cha yoki mahalla <small>Ixtiyoriy</small>
      <input name="streetAddress" autoComplete="address-line1" list={streetOptions?.length ? 'badge-street-options' : undefined}
        maxLength={160} value={place.streetAddress} placeholder="Ko‘cha nomini yozing" disabled={disabled}
        onChange={(event) => onChange({ ...place, streetAddress: event.target.value })} />
      {streetOptions?.length ? <small>Kamida 2 ta harf yozing. Ko‘cha topilmasa, nomini o‘zingiz yozing. <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">© OpenStreetMap ishtirokchilari</a></small> : null}
      {streetOptions?.length ? <datalist id="badge-street-options">
        {suggestions.map((name) => <option key={name} value={name} />)}
      </datalist> : null}
    </label>}
    {place.countryCode && <label>To‘liq manzil tafsilotlari <small>Ixtiyoriy</small>
      <textarea name="addressDetails" autoComplete="address-line2" maxLength={250} rows={2}
        placeholder="Masalan, 15-uy, 4-xonadon" aria-describedby="badge-address-privacy"
        value={place.addressDetails} disabled={disabled} onChange={(event) => onChange({ ...place, addressDetails: event.target.value })} />
      <small id="badge-address-privacy">Uy, xonadon yoki kirish raqamini yozishingiz mumkin. Ko‘cha va uy tafsilotlari ochiq profilda ko‘rsatilmaydi.</small>
    </label>}
  </div>;
}
