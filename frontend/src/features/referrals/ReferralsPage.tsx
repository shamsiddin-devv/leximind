import { useEffect, useRef, useState } from 'react';
import { ArrowUpRight, Check, CircleCheck, Clock3, Copy, History, Link2, Send, Share2, UserPlus, Zap } from 'lucide-react';
import { routes } from '../../app/router';
import { Notice } from '../../shared/components/UI';
import { api, explain } from '../../shared/services/api';
import './ReferralsPage.css';

type ReferralOverview = {
  code: string;
  rewardXp: number;
  registered: number;
  pending: number;
  rewarded: number;
  earnedXp: number;
  recent: { id: string; registeredAt: string; rewardedAt: string | null; rewardXp: number }[];
};

const date = new Intl.DateTimeFormat('uz-UZ', { day: 'numeric', month: 'long', year: 'numeric' });
const number = new Intl.NumberFormat('uz-UZ');

export function ReferralsPage({ token }: { token: string }) {
  const [overview, setOverview] = useState<ReferralOverview>();
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState('');
  const [retry, setRetry] = useState(0);
  const linkField = useRef<HTMLInputElement>(null);
  const url = new URL(routes.register, window.location.origin);
  if (overview) url.searchParams.set('ref', overview.code);
  const inviteUrl = url.href;

  useEffect(() => {
    const request = new AbortController();
    void api<ReferralOverview>('/referrals', { token, signal: request.signal })
      .then((result) => { if (!request.signal.aborted) setOverview(result); })
      .catch((failure: unknown) => {
        if (!request.signal.aborted) setError(explain(failure));
      });
    return () => request.abort();
  }, [token, retry]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setFeedback('Havola nusxalandi.');
    } catch {
      linkField.current?.focus();
      linkField.current?.select();
      setFeedback('Havola belgilandi. Uni qo‘lda nusxalashingiz mumkin.');
    }
  }

  async function share() {
    try {
      await navigator.share({ title: 'LexiMind’ga taklif', text: 'LexiMind’da ingliz tilini birga o‘rganamiz!', url: inviteUrl });
    } catch (failure) {
      if (failure instanceof DOMException && failure.name === 'AbortError') return;
      await copy();
    }
  }

  return <div className="container screen referrals-page">
    <section className="referrals-hero" aria-labelledby="referrals-title">
      <div className="referrals-intro">
        <span className="referrals-icon"><Send size={23} aria-hidden="true" /></span>
        <h1 id="referrals-title">Birga o‘rganing</h1>
        <p>LexiMind’ni tanishlaringizga ulashing. Taklifingiz orqali qo‘shilgan foydalanuvchi emailini tasdiqlasa, bonus XP olasiz.</p>
      </div>
      {overview && <div className="referrals-reward">
        <Zap size={26} aria-hidden="true" />
        <strong>+{number.format(overview.rewardXp)} <span>XP</span></strong>
        <span>Har bir tasdiqlangan taklif uchun</span>
      </div>}
    </section>
    {error && <div className="referrals-error">
      <Notice error>{error}</Notice>
      <button type="button" className="button secondary" onClick={() => { setError(''); setRetry((value) => value + 1); }}>Qayta urinish</button>
    </div>}
    {!overview && !error && <p className="referrals-loading" role="status">Taklif havolasi yuklanmoqda…</p>}
    {overview && <>
      <section className="panel referrals-link-panel" aria-labelledby="referral-link-title">
        <div className="referrals-section-heading">
          <span className="referrals-icon"><Link2 size={20} aria-hidden="true" /></span>
          <div><h2 id="referral-link-title">Taklif havolangiz</h2><p>Havolani nusxalang yoki telefoningizdan ulashing.</p></div>
        </div>
        <div className="referrals-link-actions">
          <input ref={linkField} type="url" value={inviteUrl} readOnly dir="ltr" aria-label="Shaxsiy taklif havolangiz" onFocus={(event) => event.currentTarget.select()} />
          <button type="button" className="button primary" onClick={() => void copy()}>
            {feedback === 'Havola nusxalandi.' ? <Check size={17} aria-hidden="true" /> : <Copy size={17} aria-hidden="true" />} Nusxalash
          </button>
          {typeof navigator.share === 'function' && <button type="button" className="button secondary" onClick={() => void share()}><Share2 size={17} aria-hidden="true" /> Ulashish</button>}
        </div>
        <p className="referrals-status" role="status">{feedback}</p>
      </section>

      <dl className="referrals-metrics">
        <div className="panel"><UserPlus size={20} aria-hidden="true" /><dt>Ro‘yxatdan o‘tgan</dt><dd>{number.format(overview.registered)}</dd></div>
        <div className="panel"><Clock3 size={20} aria-hidden="true" /><dt>Tasdiqlash kutilmoqda</dt><dd>{number.format(overview.pending)}</dd></div>
        <div className="panel"><CircleCheck size={20} aria-hidden="true" /><dt>Tasdiqlangan</dt><dd>{number.format(overview.rewarded)}</dd></div>
        <div className="panel"><Zap size={20} aria-hidden="true" /><dt>Olingan bonus</dt><dd>{number.format(overview.earnedXp)} <small>XP</small></dd></div>
      </dl>

      <div className="referrals-details">
        <section className="panel referrals-history" aria-labelledby="referral-history-title">
          <div className="referrals-section-heading">
            <span className="referrals-icon"><History size={20} aria-hidden="true" /></span>
            <div><h2 id="referral-history-title">Takliflar tarixi</h2><p>Oxirgi ro‘yxatdan o‘tishlar va ularning holati.</p></div>
          </div>
          {overview.recent.length ? <ul className="referrals-recent">
            {overview.recent.map((item) => <li key={item.id}>
              <time dateTime={item.registeredAt}>{date.format(new Date(item.registeredAt))}</time>
              <span className="referrals-state" data-rewarded={Boolean(item.rewardedAt)}>
                {item.rewardedAt ? <><Check size={14} aria-hidden="true" /> Tasdiqlandi · +{number.format(item.rewardXp)} XP</>
                  : <><Clock3 size={14} aria-hidden="true" /> Tasdiqlash kutilmoqda</>}
              </span>
            </li>)}
          </ul> : <div className="referrals-empty">
            <Send size={20} aria-hidden="true" />
            <p>Hali taklif orqali ro‘yxatdan o‘tilmagan.</p>
          </div>}
        </section>
        <section className="panel referrals-guide" aria-labelledby="referral-guide-title">
          <div className="referrals-section-heading">
            <span className="referrals-icon"><ArrowUpRight size={20} aria-hidden="true" /></span>
            <div><h2 id="referral-guide-title">Taklif qanday ishlaydi?</h2></div>
          </div>
          <ol>
            <li><strong>Havolangizni yuboring</strong><span>Taklifni xohlagan messenjer orqali ulashing.</span></li>
            <li><strong>Yangi akkaunt yaratiladi</strong><span>Taklif oluvchi havolani ochib ro‘yxatdan o‘tadi.</span></li>
            <li><strong>Email tasdiqlanadi</strong><span>Sizga {number.format(overview.rewardXp)} XP avtomatik qo‘shiladi.</span></li>
          </ol>
        </section>
      </div>
    </>}
  </div>;
}
