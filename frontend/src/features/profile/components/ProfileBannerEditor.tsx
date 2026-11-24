import { useId, useRef, useState, type KeyboardEvent } from 'react';
import { Check, ImagePlus, LoaderCircle, X } from 'lucide-react';
import { explain, ApiError } from '../../../shared/services/api';
import { prepareProfileBanner } from '../data/prepareProfileBanner';
import { Notice } from '../../../shared/components/UI';
import { isProfileImage, ProfileImagePicker } from './ProfileImagePicker';
import { profileBanners, type ProfileAppearance } from '../data/profileAppearance';
import { ProfileBannerPreviews } from './ProfileBannerPreviews';
import './ProfileAvatarEditor.css';

const tabs = [{ id: 'upload', label: 'Upload' }, { id: 'banners', label: 'Banners' }] as const;
type BannerTab = (typeof tabs)[number]['id'];

export function ProfileBannerEditor({ banner, position, onSave, disabled, triggerLabel = 'Change banner', triggerClassName }: {
  banner: string; position: ProfileAppearance['position']; onSave: (image: string) => Promise<void>; disabled?: boolean;
  triggerLabel?: string; triggerClassName?: string;
}) {
  const id = useId();
  const dialog = useRef<HTMLDialogElement>(null);
  const [isOpen, setOpen] = useState(false);
  const [tab, setTab] = useState<BannerTab>(tabs[0].id);
  const [uploadName, setUploadName] = useState('');
  const [url, setUrl] = useState('');
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [applied, setApplied] = useState(false);

  function moveTabFocus(event: KeyboardEvent<HTMLDivElement>) {
    const index = tabs.findIndex(({ id }) => id === tab);
    let next: number;
    switch (event.key) {
      case 'ArrowLeft': next = (index - 1 + tabs.length) % tabs.length; break;
      case 'ArrowRight': next = (index + 1) % tabs.length; break;
      case 'Home': next = 0; break;
      case 'End': next = tabs.length - 1; break;
      default: return;
    }
    event.preventDefault();
    event.currentTarget.querySelectorAll<HTMLButtonElement>('[role=tab]')[next]?.focus();
  }

  async function prepare(load: () => File | Promise<File>, fromUrl = false) {
    if (busy) return;
    setError('');
    setApplied(false);
    setBusy(fromUrl ? 'Havoladan rasm olinmoqda…' : 'Rasm tayyorlanmoqda…');
    try {
      const file = await load();
      if (!isProfileImage(file)) {
        setError('10 MB gacha bo‘lgan JPG, PNG yoki WebP rasmni tanlang.');
        return;
      }
      const image = await prepareProfileBanner(file);
      setBusy('Banner yuklanmoqda…');
      if (await apply(image, file.name) && fromUrl) setUrl('');
    } catch {
      setError(fromUrl
        ? 'Havoladan rasm olib bo‘lmadi. Ochiq JPG, PNG yoki WebP rasm havolasini kiriting.'
        : 'Rasmni ochib bo‘lmadi. Boshqa rasmni tanlang.');
    } finally {
      setBusy('');
    }
  }

  async function apply(image: string, name = '') {
    setError('');
    try {
      await onSave(image);
      setUploadName(name);
      setApplied(true);
      return true;
    } catch (failure) {
      setError('Bannerni saqlab bo‘lmadi. ' + (failure instanceof ApiError ? explain(failure) : 'Qayta urinib ko‘ring.'));
      setApplied(false);
      return false;
    }
  }

  return <>
    <button type="button" className={triggerClassName} disabled={disabled} aria-haspopup="dialog" onClick={() => {
      dialog.current?.showModal();
      setOpen(true);
    }}>
      <ImagePlus size={15} aria-hidden="true" /> {triggerLabel}
    </button>
    <dialog className="app-dialog profile-photo-dialog profile-banner-dialog" ref={dialog} lang="uz"
      aria-labelledby={id + '-title'} aria-describedby={id + '-description'}
      onCancel={(event) => { if (busy) event.preventDefault(); }}
      onClose={() => {
        setOpen(false); setTab(tabs[0].id); setUploadName(''); setUrl(''); setError(''); setApplied(false);
      }}>
      <header className="app-dialog-heading">
        <div>
          <h2 id={id + '-title'}>Bannerni o‘zgartirish</h2>
          <p id={id + '-description'}>Tanlangan banner darhol profilga qo‘llanadi.</p>
        </div>
        <button className="app-dialog-close" type="button" aria-label="Yopish" disabled={Boolean(busy)}
          onClick={() => dialog.current?.close()}><X size={16} aria-hidden="true" /></button>
      </header>
      <div className="profile-banner-tabs" role="tablist" aria-label="Banner manbasi" onKeyDown={moveTabFocus}>
        {tabs.map(({ id: tabId, label }) => <button key={tabId} type="button" role="tab" lang="en"
          id={id + '-tab-' + tabId} aria-controls={id + '-panel-' + tabId}
          aria-selected={tab === tabId} tabIndex={tab === tabId ? 0 : -1}
          onClick={() => setTab(tabId)} onFocus={() => setTab(tabId)}>{label}</button>)}
      </div>
      <div role="tabpanel" id={id + '-panel-upload'} aria-labelledby={id + '-tab-upload'}
        tabIndex={0} hidden={tab !== 'upload'}>
        {isOpen && <div className="profile-banner-upload">
          <ProfileImagePicker id={id} url={url} onUrlChange={setUrl}
            busy={Boolean(busy)} onSelect={(load, fromUrl) => void prepare(load, fromUrl)} />
          <div className="profile-banner-custom">
            <span>{uploadName || 'Joriy banner'}</span>
            <ProfileBannerPreviews image={banner} position={position} />
          </div>
        </div>}
      </div>
      <div role="tabpanel" id={id + '-panel-banners'} aria-labelledby={id + '-tab-banners'}
        hidden={tab !== 'banners'}>
        <div className="profile-banner-gallery">
          {profileBanners.map((item) => <button key={item.image} type="button" className="profile-banner-choice"
            aria-label={item.name} aria-pressed={banner === item.image} disabled={Boolean(busy)}
            onClick={() => {
              if (banner === item.image) return;
              setApplied(false);
              setBusy('Banner saqlanmoqda…');
              void apply(item.image).finally(() => setBusy(''));
            }}>
            {isOpen && <ProfileBannerPreviews image={item.image} position={position} />}
            <span className="profile-banner-name">{item.name}</span>
            {banner === item.image && <Check size={14} aria-hidden="true" className="profile-banner-check" />}
          </button>)}
        </div>
      </div>
      {busy && <p className="profile-upload-status" role="status"><LoaderCircle size={15} aria-hidden="true" />{busy}</p>}
      {error && <Notice error>{error}</Notice>}
      {applied && <p className="profile-upload-status" role="status"><Check size={15} aria-hidden="true" /> Banner qo‘llandi.</p>}
    </dialog>
  </>;
}
