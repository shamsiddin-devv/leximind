import { useRef, useState } from 'react';
import { ArrowDown, ArrowUp, ArrowUpRight, Check, Eye, ImagePlus, LayoutGrid, List, Pencil, RotateCcw, Save, Settings2, TriangleAlert, UserRound } from 'lucide-react';
import { Link, routes } from '../../../app/router';
import { Notice } from '../../../shared/components/UI';
import { UserAvatar } from '../../../shared/components/UserAvatar';
import type { Plan, Profile, Statistics, User } from '../../../shared/types/api';
import { defaultProfileAppearance, profileBanners, profileMetrics, type ProfileAppearance, type ProfileMetric } from '../data/profileAppearance';
import type { ProfileAppearanceState } from '../hooks/useProfileAppearance';
import { PreferenceSection, PreferenceSwitch } from './PreferenceControls';
import { ProfileBannerEditor } from './ProfileBannerEditor';
import { ProfileCover, ProfileInsights } from './ProfilePresentation';
import { SettingsField } from './SettingsField';
import './UICustomization.css';

const layouts = [
  { value: 'horizontal', label: 'Gorizontal', description: 'Banner tepada, ma’lumotlar ostida' },
  { value: 'vertical', label: 'Vertikal', description: 'Banner va profil chapda, kontent o‘ngda' },
] as const;
const heights = [{ value: 'low', label: 'Past' }, { value: 'medium', label: 'O‘rta' }, { value: 'high', label: 'Baland' }] as const;
const contentOptions = [
  { id: 'bio', label: 'Bio' }, { id: 'email', label: 'Email manzili' }, { id: 'charts', label: 'Grafiklar' }, { id: 'achievements', label: 'Yutuqlar' },
] as const;

type CustomizationProps = {
  appearance: ProfileAppearanceState; user: User; profile?: Profile; statistics?: Statistics; forecast?: Plan['forecast'];
};

export function UICustomization({ appearance, user, profile, statistics, forecast }: CustomizationProps) {
  const [draft, setDraft] = useState(appearance.saved);
  const [feedback, setFeedback] = useState<{ text: string; error?: boolean }>();
  const [announcement, setAnnouncement] = useState('');
  const sortList = useRef<HTMLOListElement>(null);
  const dirty = JSON.stringify(draft) !== JSON.stringify(appearance.saved);
  const vertical = draft.layout === 'vertical';

  function edit(changes: Partial<ProfileAppearance>) {
    setDraft((previous) => ({ ...previous, ...changes }));
    setFeedback(undefined);
  }

  function moveMetric(index: number, step: number) {
    const metrics = [...draft.metrics];
    const target = index + step;
    const item = metrics[index];
    [metrics[index], metrics[target]] = [metrics[target], item];
    edit({ metrics });
    const name = profileMetrics.find(({ id }) => id === item.id)?.label;
    setAnnouncement(name + ' ' + (target + 1) + '-o‘ringa ko‘chirildi.');
    requestAnimationFrame(() => {
      const row = sortList.current?.querySelector(`[data-metric="${item.id}"]`);
      const sameDirection = row?.querySelector<HTMLButtonElement>(`[data-step="${step}"]:enabled`);
      const otherDirection = row?.querySelector<HTMLButtonElement>('button:enabled');
      (sameDirection ?? otherDirection)?.focus();
    });
  }

  function setMetricVisibility(id: ProfileMetric, visible: boolean) {
    edit({ metrics: draft.metrics.map((metric) => metric.id === id ? { ...metric, visible } : metric) });
  }

  function save() {
    try {
      appearance.save(draft);
      setFeedback({ text: 'Jonli ko‘rinish sozlamalari saqlandi.' });
    } catch {
      setFeedback({ text: 'Jonli ko‘rinish sozlamalarini saqlab bo‘lmadi.', error: true });
    }
  }

  return <div className="learning-preferences-form customization">
    <PreferenceSection id="customization-layout" title="Profil joylashuvi"
      description="Jonli ko‘rinishda profil qanday tartibda joylashishini tanlang.">
      <div className="customization-layout-options" role="radiogroup" aria-labelledby="customization-layout">
        {layouts.map(({ value, label, description }) => <label className="appearance-choice" key={value}>
          <input type="radio" name="profile-layout" value={value} checked={draft.layout === value} onChange={() => edit({ layout: value })} />
          <span className="appearance-option customization-layout-choice">
            <span className="customization-thumbnail" data-layout={value} aria-hidden="true">
              <span className="customization-mini-cover"><i /><i /><i /></span>
              <span className="customization-mini-content"><i /><i /><i /><i /><i /></span>
            </span>
            <strong>{label}</strong>
            <small>{description}</small>
            <Check className="customization-layout-check" size={17} aria-hidden="true" />
          </span>
        </label>)}
      </div>
    </PreferenceSection>

    <PreferenceSection id="customization-banner" title="Banner sozlamalari" description="Rasm, joylashuv va matn o‘qilishini sozlang.">
      <div className="customization-gallery" aria-label="Tayyor bannerlar">
        {profileBanners.map(({ image, name }) => <button type="button" key={image} className="customization-banner-choice"
          aria-label={name} title={name} aria-pressed={draft.banner === image} onClick={() => edit({ banner: image })}>
          <img src={image} alt="" width={360} height={120} />
          {draft.banner === image && <Check size={16} aria-hidden="true" />}
        </button>)}
        <ProfileBannerEditor banner={draft.banner} onSave={(banner) => edit({ banner })} triggerLabel="Rasm yuklash"
          triggerClassName="button secondary customization-banner-upload" confirmLabel="Bannerni tanlash" />
      </div>
      <SettingsField id="customization-position" label="Banner joylashuvi">
        <select id="customization-position" value={draft.position} onChange={(event) => {
          const value = event.currentTarget.value;
          if (value === 'left' || value === 'center' || value === 'right') edit({ position: value });
        }}>
          <option value="left">Chap</option><option value="center">Markaz</option><option value="right">O‘ng</option>
        </select>
      </SettingsField>
      <div className="settings-form-row learning-selector-row">
        <span className="settings-row-label" id="customization-height">Banner balandligi</span>
        <div className="learning-segments" role="radiogroup" aria-labelledby="customization-height">
          {heights.map(({ value, label }) => <label key={value}>
            <input type="radio" name="profile-banner-height" checked={draft.height === value} onChange={() => edit({ height: value })} />
            <span>{label}</span>
          </label>)}
        </div>
      </div>
      <SettingsField id="customization-overlay" label="Qorong‘i qatlam" description="Banner ustidagi matn o‘qilishi uchun.">
        <div className="customization-range">
          <input id="customization-overlay" type="range" min={0} max={75} step={1} value={draft.overlay}
            aria-valuetext={draft.overlay + '%'} aria-describedby="customization-overlay-description"
            onChange={(event) => edit({ overlay: event.currentTarget.valueAsNumber })} />
          <output htmlFor="customization-overlay">{draft.overlay}%</output>
        </div>
      </SettingsField>
    </PreferenceSection>

    <PreferenceSection id="customization-content" title="Kontent" description="Jonli ko‘rinishda qaysi bloklar va statistikalar chiqishini tanlang.">
      {contentOptions.map(({ id, label }) => <SettingsField key={id} id={'customization-' + id} label={label}>
        <PreferenceSwitch id={'customization-' + id} checked={draft.content[id]}
          onChange={(checked) => edit({ content: { ...draft.content, [id]: checked } })} />
      </SettingsField>)}
      <div className="settings-form-row learning-selector-row">
        <span className="settings-row-label" id="customization-stats-style">Statistika kartalari uslubi</span>
        <div className="learning-segments" role="radiogroup" aria-labelledby="customization-stats-style">
          <label><input name="profile-stats-style" type="radio" checked={draft.statsStyle === 'grid'} onChange={() => edit({ statsStyle: 'grid' })} />
            <span><LayoutGrid size={14} aria-hidden="true" /> To‘r</span></label>
          <label><input name="profile-stats-style" type="radio" checked={draft.statsStyle === 'list'} onChange={() => edit({ statsStyle: 'list' })} />
            <span><List size={15} aria-hidden="true" /> Ro‘yxat</span></label>
        </div>
      </div>
      <div className="customization-stat-order">
        <h3>Statistika tartibi</h3>
        <ol ref={sortList}>
          {draft.metrics.map(({ id, visible }, index) => {
            const label = profileMetrics.find((metric) => metric.id === id)?.label;
            const fieldId = 'customization-stat-' + id;
            return <li key={id} data-metric={id}>
              <label htmlFor={fieldId}>{label}</label>
              <button type="button" data-step="-1" disabled={index === 0} aria-label={label + ' — yuqoriga'} onClick={() => moveMetric(index, -1)}><ArrowUp size={16} /></button>
              <button type="button" data-step="1" disabled={index === draft.metrics.length - 1} aria-label={label + ' — pastga'} onClick={() => moveMetric(index, 1)}><ArrowDown size={16} /></button>
              <PreferenceSwitch id={fieldId} checked={visible} onChange={(checked) => setMetricVisibility(id, checked)} />
            </li>;
          })}
        </ol>
        <p className="profile-sr-only" role="status">{announcement}</p>
      </div>
    </PreferenceSection>

    <section className="customization-preview" aria-labelledby="customization-preview">
      <header><h2 id="customization-preview">Jonli ko‘rinish</h2>
        <span>{dirty ? 'Saqlanmagan o‘zgarishlar' : 'Barchasi saqlangan'}</span></header>
      <div className="customization-preview-frame">
        <div className="customization-preview-bar" aria-hidden="true"><span /><span>/profile</span><Eye size={16} /></div>
        <div className="customization-preview-body" tabIndex={0} role="region" aria-label="Profilning jonli ko‘rinishi">
          <div className="customized-profile-layout" data-layout={draft.layout}>
            <div className="customized-profile-hero">
              <ProfileCover appearance={draft} user={user} profile={profile}
                avatar={<UserAvatar className="profile-avatar" name={user.fullName} url={user.avatarUrl} />}
                photoAction={vertical && <span className="profile-vertical-photo" aria-hidden="true"><ImagePlus size={15} /> Rasmni almashtirish</span>} />
            </div>
            <div className="customized-profile-main">
              <div className="profile-panels">
                <section className="panel profile-panel"><div className="profile-account-heading">
                  <h3>{vertical && <UserRound size={15} aria-hidden="true" />}{vertical ? 'Profil ma’lumotlari' : 'Shaxsiy ma’lumotlar'}</h3>
                  {vertical && <span className="profile-preview-edit" aria-hidden="true"><Pencil size={13} /> Tahrirlash</span>}
                </div><dl>
                  <dt>Ism va familiya</dt><dd>{user.fullName}</dd>
                  {draft.content.email && <><dt>Email manzili</dt><dd>{user.email}</dd></>}
                </dl></section>
                {profile && <section className="panel profile-panel"><h3>{vertical && <Settings2 size={15} aria-hidden="true" />} O‘quv sozlamalari</h3><dl>
                  <dt>Kunlik yangi so‘zlar</dt><dd>{profile.dailyNewWords}</dd>
                  {vertical ? <div className="profile-preview-sound"><dt>O‘yinlardagi meme ovozlari</dt>
                    <dd aria-label={profile.feedbackAudioEnabled ? 'Yoqilgan' : 'O‘chirilgan'}>
                      <span className="profile-preview-switch" data-on={profile.feedbackAudioEnabled} aria-hidden="true" />
                    </dd></div> : <><dt>O‘yin ovozlari</dt><dd>{profile.feedbackAudioEnabled ? 'Yoqilgan' : 'O‘chirilgan'}</dd></>}
                </dl></section>}
                {vertical && draft.content.email && <section className="panel profile-panel profile-email-status">
                  <h3>{!user.emailVerifiedAt && <TriangleAlert size={15} aria-hidden="true" />} Email holati</h3>
                  <p className={user.emailVerifiedAt ? 'email-verified' : 'email-unverified'}>
                    {user.emailVerifiedAt ? 'Tasdiqlangan' : 'Tasdiqlanmagan'}
                  </p>
                  {!user.emailVerifiedAt && <small>Email manzilingizni tasdiqlash tavsiya etiladi.</small>}
                </section>}
              </div>
              <ProfileInsights appearance={draft} user={user} profile={profile} statistics={statistics} forecast={forecast} preview />
            </div>
          </div>
        </div>
      </div>
      {feedback && <Notice error={feedback.error}>{feedback.text}</Notice>}
      <div className="customization-actions">
        <button type="button" className="button quiet" onClick={() => edit(defaultProfileAppearance)}><RotateCcw size={16} /> Standartga qaytarish</button>
        <div className="settings-form-actions">
          <button type="button" className="button primary" disabled={!dirty} onClick={save}><Save size={16} /> Saqlash</button>
        </div>
      </div>
      <Link href={routes.profile} className="text-link">Profil sahifasini ochish <ArrowUpRight size={15} aria-hidden="true" /></Link>
    </section>
  </div>;
}
