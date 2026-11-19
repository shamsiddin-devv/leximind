import { useRef, useState } from 'react';
import { Camera, LoaderCircle, Trash2, X } from 'lucide-react';
import { Notice } from '../../../shared/components/UI';
import { UserAvatar } from '../../../shared/components/UserAvatar';
import { api, explain } from '../../../shared/services/api';
import type { User } from '../../../shared/types/api';
import { isProfileImage, ProfileImagePicker } from './ProfileImagePicker';
import './ProfileAvatarEditor.css';

const avatarSize = 256;

async function preparePhoto(file: File) {
  const url = URL.createObjectURL(file);
  try {
    const photo = new Image();
    photo.src = url;
    await photo.decode();

    if (!photo.naturalWidth || !photo.naturalHeight || photo.naturalWidth * photo.naturalHeight > 40_000_000) {
      throw new Error('Rasm o‘lchami mos kelmadi.');
    }

    const crop = Math.min(photo.naturalWidth, photo.naturalHeight);
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = avatarSize;
    const context = canvas.getContext('2d', { alpha: false });
    if (!context) throw new Error('Rasmni tayyorlab bo‘lmadi.');

    context.fillStyle = '#fff';
    context.fillRect(0, 0, avatarSize, avatarSize);
    context.drawImage(photo, (photo.naturalWidth - crop) / 2, (photo.naturalHeight - crop) / 2,
      crop, crop, 0, 0, avatarSize, avatarSize);

    const preview = canvas.toDataURL('image/jpeg', .86);
    return preview.length > 87_400 ? canvas.toDataURL('image/jpeg', .7) : preview;
  } finally {
    URL.revokeObjectURL(url);
  }
}


type SelectedPhoto = { image: string; name: string; size: number };

function formatPhotoSize(size: number) {
  const measure = size >= 1024 * 1024 ? [size / (1024 * 1024), 'MB'] as const : [size / 1024, 'KB'] as const;
  return measure[0].toFixed(1) + ' ' + measure[1];
}

export function ProfileAvatarEditor({ user, token, onUserChange }: {
  user: User;
  token: string;
  onUserChange: (user: User) => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [isOpen, setOpen] = useState(false);
  const [selected, setSelected] = useState<SelectedPhoto>();
  const [url, setUrl] = useState('');
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

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
      setSelected({ image: await preparePhoto(file), name: file.name, size: file.size });
      if (fromUrl) setUrl('');
    } catch {
      setError(fromUrl
        ? 'Havoladan rasm olib bo‘lmadi. Ochiq JPG, PNG yoki WebP havolasini kiriting.'
        : 'Rasmni ochib bo‘lmadi. Boshqa rasmni tanlang.');
    } finally {
      setBusy('');
    }
  }

  async function save(image: string | null) {
    if (busy) return;
    setError('');
    setBusy(image ? 'Rasm yuklanmoqda…' : 'Rasm olib tashlanmoqda…');
    try {
      const saved = await api<User>('/users/me/avatar', {
        token, method: image ? 'PUT' : 'DELETE', ...(image ? { body: { image } } : {}),
      });
      onUserChange(saved);
      setMessage(image ? 'Profil rasmi saqlandi.' : 'Profil rasmi olib tashlandi.');
      dialog.current?.close();
    } catch (failure) {
      setError(explain(failure, {
        400: 'Rasm formati yoki hajmi mos kelmadi.',
        503: 'Hozir rasmni Cloudinary’ga saqlab bo‘lmadi. Qayta urinib ko‘ring.',
      }));
    } finally {
      setBusy('');
    }
  }

  return <div className="profile-avatar-editor">
    <button type="button" className="profile-avatar-trigger" aria-label="Profil rasmini tahrirlash" aria-haspopup="dialog"
      onClick={() => { setMessage(''); dialog.current?.showModal(); setOpen(true); }}>
      <UserAvatar className="profile-avatar" name={user.fullName} url={user.avatarUrl} />
      <span className="profile-avatar-camera" aria-hidden="true"><Camera size={16} /></span>
    </button>
    <span className="profile-sr-only" role="status">{message}</span>
    <dialog className="profile-photo-dialog" ref={dialog} aria-labelledby="profile-photo-title"
      aria-describedby="profile-photo-description"
      onCancel={(event) => { if (busy) event.preventDefault(); }}
      onClose={() => { setOpen(false); setSelected(undefined); setUrl(''); setError(''); }}>
      <header className="profile-upload-heading">
        <div><h2 id="profile-photo-title">Rasm yuklash</h2>
          <p id="profile-photo-description">Profilingiz uchun rasm tanlang.</p></div>
        <button className="profile-upload-close" type="button" aria-label="Yopish" disabled={Boolean(busy)}
          onClick={() => dialog.current?.close()}><X size={16} aria-hidden="true" /></button>
      </header>

      {isOpen && <ProfileImagePicker id="profile-photo" url={url} onUrlChange={setUrl}
        busy={Boolean(busy)} onSelect={(load, fromUrl) => void prepare(load, fromUrl)} />}

      {(selected || user.avatarUrl) && <section className="profile-upload-files" aria-labelledby="profile-upload-file-title">
        <h3 id="profile-upload-file-title">{selected ? 'Tanlangan rasm' : 'Joriy rasm'}</h3>
        <div className="profile-upload-row">
          <img src={selected?.image ?? user.avatarUrl ?? undefined} alt="" width={32} height={32} />
          <div className="profile-upload-file-info">
            <strong>{selected?.name ?? 'Profil rasmi'}</strong>
            <small>{selected ? formatPhotoSize(selected.size) + ' · Yuklashga tayyor' : 'Profilga biriktirilgan'}</small>
          </div>
          <button type="button" className="profile-upload-button profile-upload-remove" disabled={Boolean(busy)}
            aria-label={selected ? 'Tanlangan rasmni olib tashlash' : 'Profil rasmini olib tashlash'}
            onClick={() => { if (selected) { setSelected(undefined); setError(''); } else void save(null); }}>
            <Trash2 size={15} aria-hidden="true" />
          </button>
        </div>
      </section>}
      {busy && <p className="profile-upload-status" role="status"><LoaderCircle size={15} aria-hidden="true" />{busy}</p>}
      {error && <Notice error>{error}</Notice>}
      <footer className="profile-upload-actions">
        <button type="button" className="profile-upload-button" disabled={Boolean(busy)}
          onClick={() => dialog.current?.close()}>Bekor qilish</button>
        <button type="button" className="profile-upload-button profile-upload-attach" disabled={!selected || Boolean(busy)}
          onClick={() => { if (selected) void save(selected.image); }}>Rasmni biriktirish</button>
      </footer>
    </dialog>
  </div>;
}
