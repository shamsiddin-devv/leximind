import { useEffect, useRef, useState } from 'react';
import { Forward, LockKeyhole, X, Zap } from 'lucide-react';
import { Notice } from '../../../shared/components/UI';
import { api, explain } from '../../../shared/services/api';
import { isDialogBackdropPress } from '../../../shared/utils/dialog';
import { levels, type AchievementProgress } from '../../../shared/types/api';
import { achievementCatalog, achievementCategories, rarityLabels, type AchievementDefinition } from '../achievementCatalog';
import './AchievementsPage.css';

const statuses = [{ id: 'all', label: 'Barchasi' }, { id: 'earned', label: 'Qo‘lga kiritilgan' }, { id: 'pending', label: 'Jarayonda' }] as const;
type Category = (typeof achievementCategories)[number]['id'];
type Status = (typeof statuses)[number]['id'];
type Achievement = AchievementDefinition & AchievementProgress;
const number = new Intl.NumberFormat('uz-UZ');
const categoryLabels = new Map(achievementCategories.map(({ id, label }) => [id, label]));

function percentage({ progress, target }: Achievement) {
  return Math.min(100, Math.floor((progress ?? 0) / target * 100));
}

function progressLabel(item: Achievement) {
  if (item.progress === null) return 'Hisoblash mavjud emas';
  if (item.id === 'marathon') return number.format(Math.floor(item.progress / 60)) + ' / ' + number.format(item.target / 60) + ' daq';
  if (item.id === 'level-b2') return (levels[item.progress - 1] ?? 'Test topshirilmagan') + ' / B2';
  return number.format(item.progress) + ' / ' + number.format(item.target);
}

export function AchievementsPage({ token }: { token: string }) {
  const [progress, setProgress] = useState<AchievementProgress[]>();
  const [error, setError] = useState('');
  const [version, setVersion] = useState(0);
  const [category, setCategory] = useState<Category>('');
  const [status, setStatus] = useState<Status>('all');
  const [selected, setSelected] = useState<Achievement>();
  const [shareStatus, setShareStatus] = useState<{ text: string; error?: boolean }>();
  const dialog = useRef<HTMLDialogElement>(null);
  const close = useRef<HTMLButtonElement>(null);
  const backdropPress = useRef(false);

  useEffect(() => {
    const controller = new AbortController();
    void api<AchievementProgress[]>('/achievements', { token, signal: controller.signal }).then((data) => {
      if (!controller.signal.aborted) setProgress(data);
    }).catch((failure) => {
      if (!controller.signal.aborted) setError(explain(failure));
    });
    return () => controller.abort();
  }, [token, version]);

  useEffect(() => {
    if (selected && dialog.current && !dialog.current.open) {
      dialog.current.showModal();
      close.current?.focus();
    }
  }, [selected]);

  const byId = new Map(progress?.map((item) => [item.id, item]));
  const achievements = achievementCatalog.flatMap((item) => {
    const data = byId.get(item.id);
    return data ? [{ ...item, ...data }] : [];
  });
  const earned = achievements.filter((item) => item.earnedOn);
  const reward = earned.reduce((sum, item) => sum + item.rewardXp, 0);
  const pending = achievements.filter((item) => !item.earnedOn && item.progress !== null);
  const next = ['streak-100', 'words-2000'].flatMap((id) => pending.filter((item) => item.id === id));
  for (const item of pending) {
    if (next.length >= 2) break;
    if (!next.includes(item)) next.push(item);
  }
  const filtered = achievements.filter((item) => (!category || item.category === category)
    && (status === 'all' || (status === 'earned' ? Boolean(item.earnedOn) : !item.earnedOn)));

  async function share() {
    setShareStatus(undefined);
    const text = 'LexiMind’da ' + earned.length + ' / ' + achievements.length + ' yutuq va ' + number.format(reward) + ' yutuq XP to‘pladim.';
    try {
      if (navigator.share) {
        try { await navigator.share({ title: 'LexiMind yutuqlari', text }); return; }
        catch (failure) { if (failure instanceof DOMException && failure.name === 'AbortError') return; }
      }
      await navigator.clipboard.writeText(text);
      setShareStatus({ text: 'Natija nusxalandi.' });
    } catch {
      setShareStatus({ text: 'Natijani ulashib bo‘lmadi.', error: true });
    }
  }

  return <div className="container screen achievements-page">
    <header className="achievements-heading">
      <div><p className="achievements-kicker">Yutuqlar</p>
        <h1 lang="en">Achievements</h1>
        <p>Har bir mashaqqat ortida kichik g‘alaba bor. To‘plangan yutuqlaringizni ko‘rib chiqing.</p></div>
      <button type="button" className="button secondary achievements-share" disabled={!progress} onClick={() => void share()}>
        <Forward size={15} aria-hidden="true" /> Natijani ulashish
      </button>
    </header>
    {shareStatus && <div className="achievements-notice"><Notice error={shareStatus.error}>{shareStatus.text}</Notice></div>}
    {error && <div className="achievements-notice"><Notice error>{error}</Notice>
      <button type="button" className="button secondary" onClick={() => { setError(''); setVersion((value) => value + 1); }}>Qayta urinish</button>
    </div>}
    {!progress && !error && <p className="achievements-muted" role="status">Yutuqlar yuklanmoqda…</p>}
    {progress && <>
      <AchievementOverview count={earned.length} total={achievements.length} reward={reward} next={next} />
      <div className="achievements-filters">
        <div className="achievements-categories" role="group" aria-label="Yutuq toifasi">
          {achievementCategories.map(({ id, label }) => <button type="button" key={id} aria-pressed={id === category}
            onClick={() => setCategory(id)}>{label}</button>)}
        </div>
        <div className="achievements-statuses" role="group" aria-label="Yutuq holati">
          {statuses.map(({ id, label }) => <button type="button" key={id} aria-pressed={id === status}
            onClick={() => setStatus(id)}>{label}</button>)}
        </div>
      </div>
      {filtered.length ? <div className="achievements-grid">
        {filtered.map((item) => <AchievementCard item={item} key={item.id} onOpen={() => setSelected(item)} />)}
      </div> : <p className="achievements-muted" role="status">Tanlangan filtrlarga mos yutuq topilmadi.</p>}
    </>}
    <dialog className="app-dialog achievement-dialog" ref={dialog} aria-labelledby="achievement-dialog-label" closedby="any"
      onClose={() => { setSelected(undefined); backdropPress.current = false; }}
      onPointerDown={(event) => {
        if (!('closedBy' in HTMLDialogElement.prototype)) backdropPress.current = event.button === 0 && isDialogBackdropPress(event);
      }}
      onClick={(event) => {
        if (backdropPress.current && isDialogBackdropPress(event)) event.currentTarget.close();
        backdropPress.current = false;
      }}>
      {selected && <>
        <header className="app-dialog-heading">
          <h2 id="achievement-dialog-label">Yutuq tafsiloti</h2>
          <button type="button" ref={close} className="app-dialog-close" aria-label="Tafsilotni yopish"
            onClick={() => dialog.current?.close()}><X size={16} aria-hidden="true" /></button>
        </header>
        <div className="achievement-dialog-content" data-rarity={selected.rarity} data-earned={Boolean(selected.earnedOn)}>
          <AwardIcon item={selected} large />
          <p className="achievement-dialog-category">{rarityLabels[selected.rarity]} · {selected.id === 'first-step' ? 'Boshlanish' : categoryLabels.get(selected.category)}</p>
          <h3>{selected.name}</h3>
          <p className="achievement-dialog-requirement">{selected.requirement}</p>
          <dl className="achievement-dialog-data">
            <div><dt>Mukofot</dt><dd>{number.format(selected.rewardXp)} XP</dd></div>
            <div><dt>Holat</dt><dd>{selected.earnedOn ? 'Qo‘lga kiritilgan' : selected.progress === null ? 'Hisobga olinmaydi' : 'Jarayonda'}</dd></div>
          </dl>
          {selected.earnedOn ? <p className="achievement-dialog-date">Qo‘lga kiritilgan sana · <time dateTime={selected.earnedOn}>{selected.earnedOn}</time></p>
            : selected.progress === null ? <p className="achievement-dialog-date">Do‘st takliflari hisobi hali ulanmagan.</p>
            : <div className="achievement-dialog-progress"><p>{progressLabel(selected)}</p><AchievementBar item={selected} /></div>}
        </div>
        <footer className="app-dialog-actions">
          <button type="button" className="app-dialog-button" data-tone="accent" onClick={() => dialog.current?.close()}>Yopish</button>
        </footer>
      </>}
    </dialog>
  </div>;
}

function AchievementOverview({ count, total, reward, next }: { count: number; total: number; reward: number; next: Achievement[] }) {
  const ratio = Math.round(count / Math.max(1, total) * 100);
  return <div className="achievements-overview">
    <section className="achievement-panel achievement-overall" aria-labelledby="achievement-overall">
      <div className="achievement-ring">
        <progress className="achievement-sr-only" max={Math.max(1, total)} value={count}
          aria-label="Qo‘lga kiritilgan yutuqlar" aria-valuetext={count + ' / ' + total + ' yutuq'} />
        <svg viewBox="0 0 104 104" aria-hidden="true">
          <circle cx="52" cy="52" r="49" className="achievement-ring-track" />
          <circle cx="52" cy="52" r="49" pathLength="100" strokeDasharray="100"
            strokeDashoffset={100 - ratio} className="achievement-ring-value" />
        </svg>
        <div aria-hidden="true"><strong>{count}/{total}</strong><span>Yutuq</span></div>
      </div>
      <div><p className="achievements-kicker">Umumiy natija</p>
        <h2 id="achievement-overall">{ratio}% bajarildi</h2>
        <p className="achievements-muted">Yutuqlardan {number.format(reward)} XP to‘plandi.</p></div>
    </section>
    <section className="achievement-panel achievement-next" aria-labelledby="achievement-next">
      <h2 id="achievement-next" className="achievements-kicker">Keyingi maqsad</h2>
      {next.length ? <div className="achievement-next-goals">
        {next.map((item) => <div key={item.id}>
          <p><strong>{item.name}</strong><span>{progressLabel(item)}</span></p>
          <AchievementBar item={item} />
        </div>)}
      </div> : <p className="achievements-muted">Hozircha yangi maqsad yo‘q.</p>}
    </section>
  </div>;
}

function AwardIcon({ item, large = false }: { item: Achievement; large?: boolean }) {
  const Icon = item.earnedOn ? item.icon : LockKeyhole;
  return <span className="achievement-icon" data-large={large}><Icon size={large ? 25 : 18} aria-hidden="true" /></span>;
}

function AchievementCard({ item, onOpen }: { item: Achievement; onOpen: () => void }) {
  return <article className="achievement-card" data-rarity={item.rarity} data-earned={Boolean(item.earnedOn)}>
    <header><AwardIcon item={item} /><span className="achievement-rarity">{rarityLabels[item.rarity]}</span></header>
    <h2>{item.name}</h2><p className="achievements-muted">{item.requirement}</p>
    <footer>
      <div><strong><Zap size={13} fill="currentColor" aria-hidden="true" /> {number.format(item.rewardXp)} XP</strong>
        {item.earnedOn ? <time dateTime={item.earnedOn}>{item.earnedOn}</time>
          : <span>{item.progress === null ? '—' : percentage(item) + '%'}</span>}</div>
      {!item.earnedOn && item.progress !== null && <AchievementBar item={item} />}
    </footer>
    <button className="achievement-card-open" type="button" aria-haspopup="dialog" aria-label={item.name + ' · Yutuq tafsiloti'} onClick={onOpen} />
  </article>;
}

function AchievementBar({ item }: { item: Achievement }) {
  return <progress className="achievement-bar" value={Math.min(item.target, item.progress ?? 0)}
    max={item.target} aria-label={item.name} aria-valuetext={progressLabel(item)} />;
}
