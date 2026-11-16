import { useEffect, useRef, useState } from 'react';
import { api, ApiError, explain } from '../shared/services/api';
import type { Activity, Profile, Round, Session, User } from '../shared/types/api';
import { Notice } from '../shared/components/UI';
import { ProfilePage } from '../features/profile/pages/ProfilePage';
import { Dashboard } from '../features/learning/pages/Dashboard';
import { useLearningData } from '../features/learning/hooks/useLearningData';
import { GamesPage } from '../features/practice/pages/GamesPage';
import { Practice } from '../features/practice/pages/Practice';
import { Review } from '../features/review/pages/Review';
import { Catalog } from '../features/vocabulary/pages/Catalog';
import { AppLayout } from './layouts/AppLayout';
import { navigate, routes } from './router';

export default function Workspace({ path, token, user, onUserChange, onSessionLost, onLogout }: {
  path: string; token: string; user: User; onUserChange: (user: User) => void; onSessionLost: () => void; onLogout: () => void;
}) {
  const { snapshot, error: dataError, reload, updateProfile } = useLearningData(token, onSessionLost);
  const [round, setRound] = useState<{ source: string; value: Round }>();
  const [review, setReview] = useState<{ source: string; value: Session }>();
  const [busy, setBusy] = useState(false);
  const [soundSaving, setSoundSaving] = useState(false);
  const [error, setError] = useState('');
  const startRequest = useRef<AbortController | null>(null);
  const currentRound = round?.source === path ? round.value : undefined;
  const currentReview = review?.source === path ? review.value : undefined;
  const sound = snapshot?.profile.feedbackAudioEnabled ?? false;

  function endPractice() {
    startRequest.current?.abort();
    startRequest.current = null;
    setBusy(false); setRound(undefined); setReview(undefined); setError('');
  }
  useEffect(() => {
    endPractice();
    return () => { startRequest.current?.abort(); };
  }, [path]);

  function handleFailure(failure: unknown, messages?: Record<number, string>) {
    if (failure instanceof ApiError && failure.status === 401) onSessionLost();
    else setError(explain(failure, messages));
  }
  async function startActivity(kind: Activity) {
    if (startRequest.current) return;
    const request = new AbortController();
    startRequest.current = request;
    setBusy(true); setError('');
    try {
      const value = await api<Round>(kind === 'assessment' ? '/assessments' : '/games', {
        token, method: 'POST', signal: request.signal, ...(kind === 'assessment' ? {} : { body: { gameType: kind } }),
      });
      if (!request.signal.aborted) { setRound({ source: path, value }); window.scrollTo(0, 0); }
    } catch (failure) {
      if (!request.signal.aborted) handleFailure(failure, { 409: kind === 'mistake_words' ? 'Hozir qayta ishlash uchun xatolar yo‘q.' : 'Bu mashq uchun lug‘atda mos material yetarli emas.' });
    } finally {
      if (startRequest.current === request) { startRequest.current = null; setBusy(false); }
    }
  }

  async function daily() {
    if (!snapshot || startRequest.current) return;
    if (snapshot.plan.nextAction === 'ADD_OR_RESUME_CARDS') { navigate(routes.vocabulary); return; }
    if (snapshot.plan.nextAction === 'CAUGHT_UP' || snapshot.plan.nextAction === 'DAILY_NEW_LIMIT_REACHED') { navigate(routes.games); return; }
    const request = new AbortController();
    startRequest.current = request;
    setBusy(true); setError('');
    try {
      const value = await api<Session>('/sessions', { token, method: 'POST', body: { limit: 10 }, signal: request.signal });
      if (!request.signal.aborted) { setReview({ source: path, value }); window.scrollTo(0, 0); }
    } catch (failure) {
      if (!request.signal.aborted) handleFailure(failure, { 409: 'Takrorlashga tayyor kartalar yo‘q. Lug‘atdan so‘z qo‘shing.' });
    } finally {
      if (startRequest.current === request) { startRequest.current = null; setBusy(false); }
    }
  }

  async function toggleSound() {
    if (!snapshot || soundSaving) return;
    setSoundSaving(true); setError('');
    try { updateProfile(await api<Profile>('/profile', { token, method: 'PATCH', body: { feedbackAudioEnabled: !sound } })); }
    catch (failure) { handleFailure(failure); }
    finally { setSoundSaving(false); }
  }

  return <AppLayout path={path} name={user.fullName} practicing={Boolean(currentRound || currentReview)}
    sound={sound} soundAvailable={Boolean(snapshot) && !soundSaving} onToggleSound={() => void toggleSound()}
    onExitPractice={endPractice}>
    {(error || dataError) && <div className="container global-notice"><Notice error>{error || dataError}</Notice>
      {dataError && <button className="button secondary" onClick={reload}>Qayta urinish</button>}</div>}
    {currentRound ? <Practice key={currentRound.id} round={currentRound} token={token} onDone={reload} onClose={() => { endPractice(); reload(); }} soundEnabled={sound} />
      : currentReview ? <Review key={currentReview.id} initial={currentReview} token={token} onDone={reload} onClose={() => { endPractice(); reload(); }} />
      : path === routes.vocabulary ? <Catalog token={token} onChange={reload} />
      : path === routes.games ? <GamesPage busy={busy} scores={snapshot?.scores ?? []} onActivity={(kind) => void startActivity(kind)} />
      : path === routes.profile ? <ProfilePage user={user} token={token} profile={snapshot?.profile} statistics={snapshot?.stats}
        onUserChange={onUserChange} onProfileChange={updateProfile} onLogout={onLogout} />
      : <Dashboard name={user.fullName} profile={snapshot?.profile} plan={snapshot?.plan} history={snapshot?.history ?? []} stats={snapshot?.stats} busy={busy}
        onStart={() => void daily()} onActivity={(kind) => void startActivity(kind)} />}
  </AppLayout>;
}
