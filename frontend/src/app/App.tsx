import { lazy, Suspense, useEffect } from 'react';
import { ArrowRight } from 'lucide-react';
import { AuthPage, type AccountLink } from '../features/auth/pages/AuthPage';
import { useSession } from '../features/auth/hooks/useSession';
import { LandingPage } from '../features/landing/pages/LandingPage';
import { Notice } from '../shared/components/UI';
import { PublicLayout } from './layouts/PublicLayout';
import { Link, navigate, Redirect, routes, useRoute } from './router';

const Workspace = lazy(() => import('./Workspace'));
const DemoPage = lazy(() => import('../features/landing/pages/DemoPage').then((module) => ({ default: module.DemoPage })));
const protectedPaths = new Set<string>([routes.dashboard, routes.vocabulary, routes.games, routes.profile]);

function Loading() {
  return <div className="container inner-screen"><p className="empty" role="status">Yuklanmoqda…</p></div>;
}

export function App() {
  const { path, legacy, accountLink } = useRoute();
  const session = useSession();

  useEffect(() => {
    document.title = ({
      [routes.home]: 'LexiMind — Ingliz tilini o‘rganing', [routes.login]: 'Kirish — LexiMind',
      [routes.register]: 'Ro‘yxatdan o‘tish — LexiMind', [routes.recover]: 'Parolni tiklash — LexiMind',
      [routes.dashboard]: 'O‘quv paneli — LexiMind', [routes.vocabulary]: 'Lug‘at — LexiMind',
      [routes.games]: 'O‘yinlar — LexiMind', [routes.profile]: 'Profil — LexiMind', [routes.demo]: 'Sinov mashqlari — LexiMind',
      [routes.account]: 'Akkaunt amallari — LexiMind',
    } as Record<string, string>)[path] ?? 'LexiMind';
    window.scrollTo(0, 0);
    const frame = requestAnimationFrame(() => document.getElementById('main')?.focus({ preventScroll: true }));
    return () => cancelAnimationFrame(frame);
  }, [path]);

  function confirmed(action: AccountLink['action']) {
    if (action === 'reset_password') session.clear();
    else if (session.token) session.retry();
  }

  let content;
  if (legacy) content = <Redirect to={legacy} />;
  else if (protectedPaths.has(path)) {
    if (!session.token) content = <Redirect to={routes.login} />;
    else if (session.user) content = <Suspense fallback={<PublicLayout><Loading /></PublicLayout>}>
      <Workspace key={session.token} path={path} token={session.token} user={session.user} onUserChange={session.updateUser} onSessionLost={session.clear}
        onLogout={() => { session.clear(); navigate(routes.home, true); }} />
    </Suspense>;
    else content = <PublicLayout>{session.error ? <div className="container inner-screen">
      <Notice error>{session.error}</Notice><div className="notice-stack session-actions">
        <button className="button primary" onClick={session.retry}>Qayta urinish</button>
        <button className="button secondary" onClick={session.clear}>Kirish sahifasiga</button>
      </div></div> : <Loading />}</PublicLayout>;
  } else if (path === routes.login || path === routes.register || path === routes.recover) {
    if (session.user && path !== routes.recover) content = <Redirect to={routes.dashboard} />;
    else content = <PublicLayout><AuthPage key={path} mode={path === routes.login ? 'login' : path === routes.register ? 'register' : 'recover'}
      onLogin={session.establish} onConfirmed={confirmed} /></PublicLayout>;
  } else if (path === routes.account && accountLink) {
    const link: AccountLink = { token: accountLink.token, action: accountLink.action === 'verify_email' ? 'verify_email' : 'reset_password' };
    content = <PublicLayout signedIn={Boolean(session.user)}><AuthPage key={link.action + link.token}
      mode={link.action === 'verify_email' ? 'verify' : 'reset'} link={link} onLogin={session.establish} onConfirmed={confirmed} /></PublicLayout>;
  } else {
    content = <PublicLayout signedIn={Boolean(session.user)}>
      {path === routes.home ? <LandingPage signedIn={Boolean(session.user)} />
        : path === routes.demo ? <Suspense fallback={<Loading />}><DemoPage /></Suspense>
        : <div className="container inner-screen page-intro"><h1>Sahifa topilmadi</h1><p><Link className="text-link" href={routes.home}>Bosh sahifa <ArrowRight size={16} /></Link></p></div>}
    </PublicLayout>;
  }
  return <><a href="#main" className="skip-link" onClick={(event) => { event.preventDefault(); document.getElementById('main')?.focus(); }}>Asosiy mazmunga o‘tish</a>{content}</>;
}
