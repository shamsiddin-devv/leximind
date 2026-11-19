import { useRef, useState, type KeyboardEvent } from 'react';
import { Check, ImagePlus, LoaderCircle, X } from 'lucide-react';
import { Notice } from '../../../shared/components/UI';
import { isProfileImage, ProfileImagePicker } from './ProfileImagePicker';
import { profileBanners } from '../data/profileAppearance';
import './ProfileAvatarEditor.css';

const tabs = [{ id: 'upload', label: 'Upload' }, { id: 'banners', label: 'Banners' }] as const;
type BannerTab = (typeof tabs)[number]['id'];
type BannerImage = { image: string; name: string };

async function prepareBanner(file: File) {
  const source = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = source;
    await image.decode();

    if (image.naturalWidth * image.naturalHeight > 40_000_000) {
      throw new Error('Rasm o‘lchami mos kelmadi.');
    }

    const canvas = document.createElement('canvas');
    canvas.width = 1440;
    canvas.height = 480;
    const context = canvas.getContext('2d', { alpha: false });
    if (!context) throw new Error('Banner rasmini tayyorlab bo‘lmadi.');

    const width = Math.min(image.naturalWidth, image.naturalHeight * 3);
    const height = width / 3;
    context.fillStyle = '#15162e';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, (image.naturalWidth - width) / 2, (image.naturalHeight - height) / 2,
      width, height, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg', .84);
  } finally {
    URL.revokeObjectURL(source);
  }
}

export function ProfileBannerEditor({ banner, onSave, triggerLabel = 'Change banner', triggerClassName, confirmLabel = 'Bannerni saqlash' }: {
  banner: string; onSave: (image: string) => void; triggerLabel?: string; triggerClassName?: string; confirmLabel?: string;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [isOpen, setOpen] = useState(false);
  const [tab, setTab] = useState<BannerTab>(tabs[0].id);
  const [preset, setPreset] = useState<BannerImage>();
  const [upload, setUpload] = useState<BannerImage>();
  const [url, setUrl] = useState('');
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const selected = tab === 'banners' ? preset : upload;
  const activePreset = preset?.image ?? banner;

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
    setBusy(fromUrl ? 'Havoladan rasm olinmoqda…' : 'Rasm tayyorlanmoqda…');
    try {
      const file = await load();
      if (!isProfileImage(file)) {
        setError('10 MB gacha bo‘lgan JPG, PNG yoki WebP rasmni tanlang.');
        return;
      }
      setUpload({ image: await prepareBanner(file), name: file.name });
      if (fromUrl) setUrl('');
    } catch {
      setError(fromUrl
        ? 'Havoladan rasm olib bo‘lmadi. Ochiq JPG, PNG yoki WebP rasm havolasini kiriting.'
        : 'Rasmni ochib bo‘lmadi. Boshqa rasmni tanlang.');
    } finally {
      setBusy('');
    }
  }

  function save() {
    if (!selected || busy) return;
    try {
      onSave(selected.image);
      dialog.current?.close();
    } catch {
      setError('Banner rasmini bu brauzerda saqlab bo‘lmadi.');
    }
  }

  return <>
    <button type="button" className={triggerClassName} aria-haspopup="dialog" onClick={() => {
      dialog.current?.showModal();
      setOpen(true);
    }}>
      <ImagePlus size={15} aria-hidden="true" /> {triggerLabel}
    </button>
    <dialog className="profile-photo-dialog profile-banner-dialog" ref={dialog} lang="uz"
      aria-labelledby="profile-banner-title" aria-describedby="profile-banner-description"
      onCancel={(event) => { if (busy) event.preventDefault(); }}
      onClose={() => {
        setOpen(false); setTab(tabs[0].id); setPreset(undefined); setUpload(undefined); setUrl(''); setError('');
      }}>
      <header className="profile-upload-heading">
        <div>
          <h2 id="profile-banner-title">Bannerni o‘zgartirish</h2>
          <p id="profile-banner-description">Tayyor bannerni tanlang yoki o‘z rasmingizni yuklang.</p>
        </div>
        <button className="profile-upload-close" type="button" aria-label="Yopish" disabled={Boolean(busy)}
          onClick={() => dialog.current?.close()}><X size={16} aria-hidden="true" /></button>
      </header>
      <div className="profile-banner-tabs" role="tablist" aria-label="Banner manbasi" onKeyDown={moveTabFocus}>
        {tabs.map(({ id, label }) => <button key={id} type="button" role="tab" lang="en"
          id={'profile-banner-tab-' + id} aria-controls={'profile-banner-panel-' + id}
          aria-selected={tab === id} tabIndex={tab === id ? 0 : -1}
          onClick={() => setTab(id)} onFocus={() => setTab(id)}>{label}</button>)}
      </div>
      <div role="tabpanel" id="profile-banner-panel-upload" aria-labelledby="profile-banner-tab-upload"
        tabIndex={0} hidden={tab !== 'upload'}>
        {isOpen && <div className="profile-banner-upload">
          <ProfileImagePicker id="profile-banner" url={url} onUrlChange={setUrl}
            busy={Boolean(busy)} onSelect={(load, fromUrl) => void prepare(load, fromUrl)} />
          {upload && <div className="profile-banner-custom">
            <img src={upload.image} width={1440} height={480} alt="Tanlangan banner ko‘rinishi" />
            <span>{upload.name}</span>
          </div>}
        </div>}
      </div>
      <div role="tabpanel" id="profile-banner-panel-banners" aria-labelledby="profile-banner-tab-banners"
        hidden={tab !== 'banners'}>
        <div className="profile-banner-gallery">
          {profileBanners.map((item) => <button key={item.image} type="button" className="profile-banner-choice"
            aria-pressed={activePreset === item.image} disabled={Boolean(busy)}
            onClick={() => { setPreset(item.image === banner ? undefined : item); setError(''); }}>
            {isOpen && <img src={item.image} alt="" width={360} height={120} />}
            <span>{item.name}</span>
            {activePreset === item.image && <Check size={14} aria-hidden="true" className="profile-banner-check" />}
          </button>)}
        </div>
      </div>
      {busy && <p className="profile-upload-status" role="status"><LoaderCircle size={15} aria-hidden="true" />{busy}</p>}
      {error && <Notice error>{error}</Notice>}
      <footer className="profile-upload-actions">
        <button type="button" className="profile-upload-button" disabled={Boolean(busy)}
          onClick={() => dialog.current?.close()}>Bekor qilish</button>
        <button type="button" className="profile-upload-button profile-upload-attach" disabled={!selected || Boolean(busy)}
          onClick={save}>{confirmLabel}</button>
      </footer>
    </dialog>
  </>;
}
