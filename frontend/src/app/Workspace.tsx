import { useEffect, useRef, useState } from 'react';
import { BellRing, X } from 'lucide-react';
import { api, ApiError, explain } from '../shared/services/api';
import type { Activity, Level, Profile, Round, Session, User } from '../shared/types/api';
import { Notice } from '../shared/components/UI';
import { SectionIntroPage } from '../shared/components/SectionIntroPage';
import { ProfilePage } from '../features/profile/pages/ProfilePage';
import { SettingsPage } from '../features/profile/components/SettingsPage';
import { useNotificationPreferences } from '../features/profile/hooks/useNotificationPreferences';
import { usePreferenceSave } from '../features/profile/hooks/usePreferenceSave';
import { useProfileAppearance } from '../features/profile/hooks/useProfileAppearance';
import { Dashboard } from '../features/learning/pages/Dashboard';
import { LearningSessionsPage } from '../features/learning/pages/LearningSessionsPage';
import { StudyPlanPage } from '../features/learning/pages/StudyPlanPage';
import { StatisticsPage } from '../features/learning/pages/StatisticsPage';
import { LearningCalendarPage } from '../features/learning/pages/LearningCalendarPage';
import { AchievementsPage } from '../features/learning/pages/AchievementsPage';
import { LeaderboardPage } from '../features/learning/pages/LeaderboardPage';
import { useLearningData } from '../features/learning/hooks/useLearningData';
import { useStudyReminder } from '../features/learning/hooks/useStudyReminder';
import { GamesPage } from '../features/practice/pages/GamesPage';
import { MistakesNotebookPage } from '../features/practice/pages/MistakesNotebookPage';
import { Practice } from '../features/practice/pages/Practice';
import { Review } from '../features/review/pages/Review';
import { ReviewCenterPage } from '../features/review/pages/ReviewCenterPage';
import { Catalog } from '../features/vocabulary/pages/Catalog';
import { CollectionsPage } from '../features/vocabulary/pages/CollectionsPage';
import { TopicsExplorerPage } from '../features/vocabulary/pages/TopicsExplorerPage';
import { AppLayout } from './layouts/AppLayout';
import type { AccountAccess } from './layouts/SidebarAccountMenu';
import { navigationPages, settingsNavigation } from './navigation';
import { navigate, routes, settingsParent } from './router';

export default function Workspace({ path, token, user, accountAccess, onUserChange, onSessionLost, onLogout }: {
  path: string; token: string; user: User; onUserChange: (user: User) => void; onSessionLost: () => void; onLogout: () => void;
  accountAccess: AccountAccess;
}) {
  const { snapshot, error: dataError, reload, updateProfile } = useLearningData(token, onSessionLost);
  const preferences = usePreferenceSave(token, updateProfile);
  const profileAppearance = useProfileAppearance(user.id);
  const notifications = useNotificationPreferences(user.id);
  const [round, setRound] = useState<{ source: string; value: Round }>();
  const [review, setReview] = useState<{ source: string; value: Session }>();
  const [busy, setBusy] = useState(false);
  const [soundSaving, setSoundSaving] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [error, setError] = useState('');
  const startRequest = useRef<AbortController | null>(null);
  const currentRound = round?.source === path ? round.value : undefined;
  const currentReview = review?.source === path ? review.value : undefined;
  const sound = snapshot?.profile.feedbackAudioEnabled ?? false;
  const autoplayPronunciation = snapshot?.profile.autoplayPronunciation ?? false;
  const reminder = useStudyReminder(user.id, snapshot?.profile, snapshot?.scores[0]?.playedAt);
  const page = navigationPages.get(path);
  const settingsSection = settingsNavigation.items.find((item) => item.href === settingsParent(path));

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
  async function startActivity(kind: Activity, cefrLevel?: Level, topic?: string) {
    if (startRequest.current) return;
    const request = new AbortController();
    startRequest.current = request;
    setBusy(true); setError('');
    try {
      const value = await api<Round>(kind === 'assessment' ? '/assessments' : '/games', {
        token, method: 'POST', signal: request.signal, ...(kind === 'assessment' ? {} : { body: { gameType: kind, cefrLevel, topic } }),
      });
      if (!request.signal.aborted) { setRound({ source: path, value }); window.scrollTo(0, 0); }
    } catch (failure) {
      if (!request.signal.aborted) handleFailure(failure, { 409: cefrLevel ? `${cefrLevel} darajasi uchun lug‘atda so‘zlar yetarli emas.`
        : kind === 'mistake_words' ? 'Hozir qayta ishlash uchun xatolar yo‘q.' : 'Bu mashq uchun lug‘atda mos material yetarli emas.' });
    } finally {
      if (startRequest.current === request) { startRequest.current = null; setBusy(false); }
    }
  }

  async function daily() {
    if (!snapshot || startRequest.current) return;
    if (snapshot.profile.reviewMode === 'random' && !snapshot.plan.activeSessionId) {
      await startActivity('meaning_match', snapshot.profile.studyLevel ?? snapshot.profile.level);
      return;
    }
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

  async function logout() {
    if (loggingOut) return;
    setError('');
    setLoggingOut(true);
    try {
      await api('/auth/logout', { token, method: 'POST' });
      onLogout();
    } catch (failure) {
      handleFailure(failure);
    } finally {
      setLoggingOut(false);
    }
  }

  return <AppLayout path={path} token={token} user={user} accountAccess={accountAccess} practicing={Boolean(currentRound || currentReview)}
    dueCount={notifications.values.review ? (snapshot?.plan.availableNow ?? 0) : 0} sound={sound} soundAvailable={Boolean(snapshot) && !soundSaving} onToggleSound={() => void toggleSound()}
    collapsed={sidebarCollapsed} onCollapsedChange={setSidebarCollapsed}
    onExitPractice={endPractice} loggingOut={loggingOut} onLogout={() => void logout()}>
    {(error || dataError) && <div className="container global-notice"><Notice error>{error || dataError}</Notice>
      {dataError && <button className="button secondary" onClick={reload}>Qayta urinish</button>}</div>}
    {reminder.visible && !currentRound && !currentReview && <div className="container global-notice">
      <aside className="notice study-reminder" aria-label="O‘rganish eslatmasi">
        <BellRing size={18} aria-hidden="true" />
        <span role="status">Bugungi mashqingiz vaqti keldi.</span>
        <button type="button" className="button quiet" aria-label="Eslatmani yopish" onClick={reminder.dismiss}><X size={17} aria-hidden="true" /></button>
      </aside>
    </div>}
    {currentRound ? <Practice key={currentRound.id} round={currentRound} token={token} onDone={reload} onClose={() => { endPractice(); reload(); }} soundEnabled={sound} autoplayPronunciation={autoplayPronunciation} />
      : currentReview ? <Review key={currentReview.id} initial={currentReview} token={token} onDone={reload} onClose={() => { endPractice(); reload(); }}
        autoplayPronunciation={autoplayPronunciation}
        doneActionLabel={path === routes.studyPlan ? 'Rejaga qaytish' : path === routes.learningSessions ? 'Seanslar tarixiga' : undefined} />
      : path === routes.vocabulary ? <Catalog token={token} onChange={reload} />
      : path === routes.collections ? <CollectionsPage key={user.id} token={token} userId={user.id} />
      : path === routes.topics ? <TopicsExplorerPage key={user.id} token={token} busy={busy}
        onStart={(topic) => void startActivity('type_word', undefined, topic)} />
      : path === routes.games ? <GamesPage busy={busy} scores={snapshot?.scores ?? []} onActivity={(kind) => void startActivity(kind)} />
      : path === routes.mistakes ? <MistakesNotebookPage key={user.id} token={token} />
      : path === routes.learningSessions ? <LearningSessionsPage token={token} profile={snapshot?.profile} plan={snapshot?.plan}
        busy={busy} planFailed={Boolean(dataError)} onStart={() => void daily()} />
      : path === routes.studyPlan ? <StudyPlanPage profile={snapshot?.profile} plan={snapshot?.plan}
        busy={busy} planFailed={Boolean(dataError)} onStart={() => void daily()} onPractice={(kind) => void startActivity(kind)} />
      : path === routes.statistics ? <StatisticsPage key={user.id} token={token} />
      : path === routes.learningCalendar ? <LearningCalendarPage key={user.id} token={token} streak={snapshot?.plan.activity.currentStreak} />
      : path === routes.achievements ? <AchievementsPage key={user.id} token={token} />
      : path === routes.leaderboard ? <LeaderboardPage key={user.id} token={token} />
      : path === routes.reviewCenter ? <ReviewCenterPage key={user.id} token={token} statistics={snapshot?.stats}
        autoplayPronunciation={autoplayPronunciation} onReview={reload} />
      : path === routes.profile ? <ProfilePage user={user} token={token} profile={snapshot?.profile}
        appearance={profileAppearance} onUserChange={onUserChange} preferences={preferences} />
      : settingsSection ? <SettingsPage key={path} path={path} section={settingsSection} user={user} profile={snapshot?.profile} token={token}
        preferences={preferences} notifications={notifications} appearance={profileAppearance} statistics={snapshot?.stats} forecast={snapshot?.plan.forecast}
        onUserChange={onUserChange} onPasswordChanged={onSessionLost} onDeleted={onLogout} />
      : page?.intro ? <SectionIntroPage title={page.label} icon={page.icon} {...page.intro} />
      : <Dashboard name={user.fullName} profile={snapshot?.profile} plan={snapshot?.plan} history={snapshot?.history ?? []} stats={snapshot?.stats} busy={busy}
        onStart={() => void daily()} onActivity={(kind) => void startActivity(kind)} />}
  </AppLayout>;
}
