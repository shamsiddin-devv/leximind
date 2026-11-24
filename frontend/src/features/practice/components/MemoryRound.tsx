import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent } from 'react';
import { ArrowLeft, ArrowRight, Delete, Eye, Play, Timer } from 'lucide-react';
import type { activities } from '../activities';
import { Notice } from '../../../shared/components/UI';
import './MemoryGames.css';

export type MemoryActivity = Extract<(typeof activities)[number], { category: 'memory' }>;

export const memoryInstructions = {
  word_span: 'So‘zlarni ustida ko‘rsatilgan tartibda eslab qoling.',
  sequence_memory: 'Raqamlar ketma-ketligini boshidan oxirigacha eslab qoling.',
  visual_grid: 'Ajratilgan kataklar va ulardagi raqamlar tartibini eslab qoling.',
} satisfies Record<MemoryActivity['id'], string>;

type Props = {
  activity: MemoryActivity;
  stimulus: string[];
  gridSize?: number;
  previewMs: number;
  busy: boolean;
  error: string;
  onClose: () => void;
  onSubmit: (answers: string[]) => void;
};

export function MemoryRound({ activity, stimulus, gridSize, previewMs, busy, error, onClose, onSubmit }: Props) {
  const [phase, setPhase] = useState<'ready' | 'preview' | 'recall'>('ready');
  const [selected, setSelected] = useState<string[]>([]);
  const [words, setWords] = useState('');
  const heading = useRef<HTMLHeadingElement>(null);
  const wordInput = useRef<HTMLTextAreaElement>(null);
  const length = stimulus.length;
  const isWords = activity.id === 'word_span';
  const isDigits = activity.id === 'sequence_memory';
  const answers = isWords ? words.trim().split(/\s+/).filter(Boolean) : selected;
  const previewing = phase === 'preview';
  const Icon = activity.icon;

  useEffect(() => {
    if (phase === 'recall' && isWords) wordInput.current?.focus({ preventScroll: true });
    else heading.current?.focus({ preventScroll: true });
    if (phase !== 'preview') return;
    const timer = window.setTimeout(() => setPhase('recall'), previewMs);
    return () => window.clearTimeout(timer);
  }, [phase, isWords, previewMs]);

  function choose(value: string) {
    if (busy) return;
    setSelected((current) => {
      if (!isDigits && current.includes(value)) return current.filter((item) => item !== value);
      return current.length < length ? [...current, value] : current;
    });
  }

  function erase() {
    if (!busy) setSelected((current) => current.slice(0, -1));
  }

  function handleKey(event: KeyboardEvent<HTMLFormElement>) {
    if (phase !== 'recall' || !isDigits || event.altKey || event.ctrlKey || event.metaKey) return;
    if (/^\d$/.test(event.key)) {
      event.preventDefault();
      choose(event.key);
    } else if (event.key === 'Backspace') {
      event.preventDefault();
      erase();
    }
  }

  return <div className="container screen practice-screen memory-screen">
    <div className="memory-round-top">
      <button type="button" className="icon-button" aria-label="Mashqdan chiqish" onClick={onClose}><ArrowLeft size={20} aria-hidden="true" /></button>
      <div className="memory-round-steps" aria-label="Raund bosqichlari">
        <span aria-current={phase === 'ready' ? 'step' : undefined}>Tayyorgarlik</span>
        <span aria-current={previewing ? 'step' : undefined}>Eslab qolish</span>
        <span aria-current={phase === 'recall' ? 'step' : undefined}>Javob</span>
      </div>
    </div>
    <form className={`panel memory-round memory-${activity.id}`} onKeyDown={handleKey} onSubmit={(event) => {
      event.preventDefault();
      if (phase === 'recall' && !busy && answers.length > 0 && answers.length <= length) onSubmit(answers);
    }}>
      <header className="memory-round-heading">
        <span className="memory-round-icon"><Icon size={25} aria-hidden="true" /></span>
        <h1 ref={heading} tabIndex={-1}>{phase === 'ready' ? activity.title : previewing ? 'Eslab qoling' : 'Tartibni takrorlang'}</h1>
        <p id="memory-instruction">
          {phase === 'ready' ? memoryInstructions[activity.id] : previewing ? 'Birinchi elementdan boshlab tartibni yodda saqlang.'
            : isWords ? 'So‘zlarni ko‘rgan tartibingizda bo‘sh joy bilan ajratib yozing.'
              : isDigits ? 'Raqamlarni bosing yoki klaviaturada tering.' : 'Kataklarni ko‘rgan tartibingizda tanlang. Tanlovni bekor qilish uchun katakni yana bosing.'}
        </p>
      </header>
      {phase === 'ready' && <div className="memory-ready">
        <p><Timer size={18} aria-hidden="true" /> Ko‘rish uchun {previewMs / 1000} soniya <span aria-hidden="true">·</span> {length} ta {isWords ? 'so‘z' : isDigits ? 'raqam' : 'katak'}</p>
        <button type="button" className="button primary" onClick={() => setPhase('preview')}><Play size={16} aria-hidden="true" /> Boshlash</button>
      </div>}
      {phase !== 'ready' && <div className="memory-stage" key={phase}>
        {previewing && <div className="memory-preview-time">
          <span><Eye size={16} aria-hidden="true" /> {previewMs / 1000} soniya</span>
          <span className="memory-time-track" aria-hidden="true" style={{ '--preview-time': previewMs + 'ms' } as CSSProperties}><span /></span>
        </div>}
        {gridSize ? <div className="memory-board" role="group" aria-label="Xotira kataklari" style={{ '--memory-grid-size': gridSize } as CSSProperties}>
          {Array.from({ length: gridSize ** 2 }, (_, index) => {
            const cell = String(index);
            const position = (previewing ? stimulus : selected).indexOf(cell);
            const label = (index + 1) + '-katak' + (position < 0 ? '' : ', tartibda ' + (position + 1));
            return previewing
              ? <span key={cell} aria-hidden="true" className="memory-square" data-highlight={position >= 0}>{position + 1 || ''}</span>
              : <button key={cell} type="button" className="memory-square" aria-label={label} aria-pressed={position >= 0}
                disabled={busy || (selected.length >= length && position < 0)} onClick={() => choose(cell)}>{position + 1 || ''}</button>;
          })}
          {previewing && <span className="memory-visually-hidden">{stimulus.map((cell) => (Number(cell) + 1) + '-katak').join(', ')}</span>}
        </div> : previewing ? <ol className={`memory-items${isDigits ? ' numeric' : ''}`} lang={isWords ? 'en' : undefined} aria-label="Eslab qolinadigan ketma-ketlik">
          {stimulus.map((item, index) => <li key={index}><small aria-hidden="true">{index + 1}</small><strong>{item}</strong></li>)}
        </ol> : isDigits ? <>
          <ol className="memory-items numeric memory-digit-answer" aria-label="Kiritilgan ketma-ketlik">
            {stimulus.map((_, index) => <li key={index} data-highlight={index === selected.length && index < length}><strong>{selected[index] ?? '–'}</strong></li>)}
          </ol>
          <div className="memory-keypad" role="group" aria-label="Raqamlar klaviaturasi">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 0].map((digit) => <button key={digit} type="button" className={digit === 0 ? 'memory-zero' : undefined}
              aria-disabled={busy || selected.length >= length} onClick={() => choose(String(digit))}>{digit}</button>)}
            <button type="button" aria-label="Oxirgi raqamni o‘chirish" aria-disabled={busy || !selected.length} onClick={erase}><Delete size={20} aria-hidden="true" /></button>
          </div>
        </> : <label className="memory-word-answer">Javobingiz
          <textarea ref={wordInput} aria-describedby="memory-instruction" autoComplete="off" spellCheck={false}
            rows={3} maxLength={255} value={words} onChange={(event) => setWords(event.target.value)} disabled={busy} />
        </label>}
      </div>}
      {phase === 'recall' && <footer className="memory-round-actions">
        <p role="status">{answers.length} / {length} {answers.length > length ? '· Ortiqcha so‘zni olib tashlang' : 'kiritildi'}</p>
        <button type="button" className="button quiet" disabled={busy} onClick={() => onSubmit([])}>O‘tkazib yuborish</button>
        <button type="submit" className="button primary" disabled={busy || !answers.length || answers.length > length}>
          {busy ? 'Tekshirilmoqda…' : 'Tekshirish'} <ArrowRight size={17} aria-hidden="true" />
        </button>
      </footer>}
      {error && <Notice error>{error}</Notice>}
    </form>
  </div>;
}
