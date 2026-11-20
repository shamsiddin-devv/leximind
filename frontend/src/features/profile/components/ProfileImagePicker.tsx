import { useRef, useState } from 'react';
import { FileText } from 'lucide-react';

export const profileImageFormats = ['image/jpeg', 'image/png', 'image/webp'];
const maximumFileSize = 10 * 1024 * 1024;

export function isProfileImage(file: File) {
  return profileImageFormats.includes(file.type) && file.size <= maximumFileSize;
}

async function loadPhotoUrl(value: string): Promise<File> {
  const url = new URL(value);
  if (!['http:', 'https:'].includes(url.protocol) ||
    (url.protocol !== 'https:' && url.origin !== location.origin) || url.username || url.password) {
    throw new Error('HTTPS talab qilinadi.');
  }

  const response = await fetch(url, {
    mode: 'cors', credentials: 'omit', referrerPolicy: 'no-referrer', signal: AbortSignal.timeout(10_000),
  });
  const type = response.headers.get('content-type')?.split(';')[0].trim() ?? '';
  if (!response.ok || !response.body || !profileImageFormats.includes(type) ||
    Number(response.headers.get('content-length')) > maximumFileSize) {
    await response.body?.cancel();
    throw new Error('Rasm formati yoki hajmi mos kelmadi.');
  }

  const reader = response.body.getReader();
  const chunks: Uint8Array<ArrayBuffer>[] = [];
  let size = 0;
  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maximumFileSize) {
        await reader.cancel();
        throw new Error('Rasm hajmi 10 MB dan katta.');
      }
      chunks.push(new Uint8Array(value));
    }
  } finally {
    reader.releaseLock();
  }

  const name = url.pathname.split('/').filter(Boolean).pop() || 'Havoladagi rasm';
  return new File(chunks, name, { type });
}

export function ProfileImagePicker({ id, busy, url, onUrlChange, onSelect }: {
  id: string;
  busy: boolean;
  url: string;
  onUrlChange: (url: string) => void;
  onSelect: (load: () => File | Promise<File>, fromUrl?: boolean) => void;
}) {
  const fileInput = useRef<HTMLInputElement>(null);
  const dragDepth = useRef(0);
  const [dragging, setDragging] = useState(false);

  function select(file?: File) {
    if (file && !busy) onSelect(() => file);
  }

  return <>
    <div className="profile-upload-drop" data-dragging={dragging && !busy || undefined}
      onDragEnter={(event) => {
        event.preventDefault();
        if (!event.dataTransfer.types.includes('Files') || busy) return;
        dragDepth.current += 1;
        setDragging(true);
      }}
      onDragOver={(event) => { event.preventDefault(); event.dataTransfer.dropEffect = busy ? 'none' : 'copy'; }}
      onDragLeave={() => {
        dragDepth.current = Math.max(0, dragDepth.current - 1);
        if (!dragDepth.current) setDragging(false);
      }}
      onDrop={(event) => {
        event.preventDefault();
        dragDepth.current = 0;
        setDragging(false);
        select(event.dataTransfer.files[0]);
      }}>
      <span className="profile-upload-file-icon" aria-hidden="true"><FileText size={23} /></span>
      <p>Rasmni shu yerga sudrab tashlang</p>
      <small id={id + '-hint'}>JPG, PNG yoki WebP. 10 MB gacha.</small>
      <input ref={fileInput} type="file" accept={profileImageFormats.join(',')} hidden
        onChange={(event) => {
          select(event.currentTarget.files?.[0]);
          event.currentTarget.value = '';
        }} />
      <button type="button" className="app-dialog-button profile-upload-small" disabled={busy}
        aria-describedby={id + '-hint'} onClick={() => fileInput.current?.click()}>Rasm tanlash</button>
    </div>

    <form className="profile-upload-link" onSubmit={(event) => {
      event.preventDefault();
      const value = url.trim();
      if (value && !busy) onSelect(() => loadPhotoUrl(value), true);
    }}>
      <label htmlFor={id + '-url'}>Yoki havoladan yuklang</label>
      <div className="profile-upload-url">
        <input id={id + '-url'} type="url" inputMode="url" value={url} placeholder="Rasm havolasini kiriting"
          disabled={busy} onChange={(event) => onUrlChange(event.target.value)} />
        <button type="submit" className="app-dialog-button profile-upload-small"
          disabled={!url.trim() || busy}>Yuklash</button>
      </div>
    </form>
  </>;
}
