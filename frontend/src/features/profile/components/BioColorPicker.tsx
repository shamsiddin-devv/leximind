import { useEffect, useRef, useState, type CSSProperties } from 'react';

const colors = [
  { label: 'Binafsha', value: '#615bfe' },
  { label: 'Ko‘k', value: '#2868d7' },
  { label: 'Yashil', value: '#19835f' },
  { label: 'Zarg‘aldoq', value: '#be5724' },
  { label: 'Qizil', value: '#c33650' },
  { label: 'Kulrang', value: '#697489' },
];
const hexFormat = /^#?[a-f0-9]{6}$/i;

function swatch(color: string | null): CSSProperties {
  return { backgroundColor: color ?? 'var(--ink)' };
}

export function BioColorPicker({ id, color, disabled, onOpen, onPick }: {
  id: string;
  color: string | null;
  disabled: boolean;
  onOpen: () => void;
  onPick: (color: string | false) => void;
}) {
  const [open, setOpen] = useState(false);
  const [hex, setHex] = useState('');
  const [error, setError] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const firstSwatch = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    firstSwatch.current?.focus({ preventScroll: true });
    function dismiss(event: PointerEvent) {
      if (event.target instanceof Node && !root.current?.contains(event.target)) setOpen(false);
    }
    document.addEventListener('pointerdown', dismiss);
    return () => document.removeEventListener('pointerdown', dismiss);
  }, [open]);

  function pick(value: string | false) {
    setOpen(false);
    onPick(value);
  }

  function pickHex() {
    const value = hex.trim();
    if (!hexFormat.test(value)) {
      setError(true);
      return;
    }
    pick('#' + value.replace(/^#/, '').toLowerCase());
  }

  return <div className="bio-toolbar-group bio-color-picker" ref={root}
    onBlur={(event) => {
      if (event.relatedTarget && !event.currentTarget.contains(event.relatedTarget)) setOpen(false);
    }}
    onKeyDown={(event) => {
      if (!open || event.key !== 'Escape') return;
      event.preventDefault();
      setOpen(false);
      trigger.current?.focus({ preventScroll: true });
    }}>
    <button ref={trigger} type="button" title="Matn rangi" aria-label="Matn rangi" disabled={disabled}
      aria-expanded={open} aria-controls={open ? id : undefined} onClick={() => {
        if (!open) {
          onOpen();
          setHex(color ?? '#615bfe');
          setError(false);
        }
        setOpen(!open);
      }}>
      <span className="bio-color-swatch" style={swatch(color)} />
    </button>
    {open && <div className="bio-color-palette" id={id} role="group" aria-label="Matn rangini tanlash">
      <div className="bio-color-options">
        {colors.map(({ label, value }, index) => <button key={value} ref={index === 0 ? firstSwatch : undefined}
          type="button" title={label} aria-label={label} aria-pressed={color === value} disabled={disabled}
          onClick={() => pick(value)}><span className="bio-color-swatch" style={swatch(value)} /></button>)}
      </div>
      <div className="bio-custom-color">
        <input type="text" aria-label="HEX rang kodi" aria-invalid={error || undefined}
          aria-describedby={error ? id + '-error' : undefined} value={hex} maxLength={7} autoComplete="off" spellCheck={false}
          disabled={disabled} onChange={(event) => { setHex(event.target.value); setError(false); }}
          onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); pickHex(); } }} />
        <button type="button" className="button secondary" disabled={disabled} onClick={pickHex}>Qo‘llash</button>
      </div>
      {error && <small id={id + '-error'} role="alert">Rangni #615BFE shaklida kiriting.</small>}
      <button type="button" className="bio-color-reset" disabled={disabled} onClick={() => pick(false)}>Standart rang</button>
    </div>}
  </div>;
}
