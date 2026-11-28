import { lazy, Suspense, useCallback, useEffect } from 'react';
import { ArrowRight } from 'lucide-react';
import { AuthPage, MissingAccountLink, type AccountLink } from '../features/auth/pages/AuthPage';
import { RegisterPage } from '../features/auth/pages/RegisterPage';
import { useSession } from '../features/auth/hooks/useSession';
import { LandingPage } from '../features/landing/pages/LandingPage';
import { landingCopy } from '../features/landing/copy';
import { useInterfaceLanguage } from './language';
import { useAccountInterfacePreferences } from './useAccountInterfacePreferences';
import { LoadingScreen } from '../shared/components/LoadingScreen';
import { Notice } from '../shared/components/UI';
import { PublicLayout } from './layouts/PublicLayout';
import { routeLabel } from './shellCopy';
import { navigationPages } from './navigation';
import { Link, navigate, Redirect, routes, useRoute, workspaceParent } from './router';
import '@fontsource-variable/manrope';
import '@fontsource-variable/instrument-sans';
import '@fontsource/instrument-serif/latin-400.css';
import '@fontsource/instrument-serif/latin-400-italic.css';
import '../styles/welcome.css';

const Workspace = lazy(() => import('./Workspace'));
const DemoPage = lazy(() => import('../features/landing/pages/DemoPage').then((module) => ({ default: module.DemoPage })));
const SharedProfile = lazy(() => import('../features/profile/pages/SharedProfile'));
const protectedPaths = new Set<string>(navigationPages.keys());

export function App() {
  const { path, legacy, accountLink, searchParams } = useRoute();
  const session = useSession();
  useAccountInterfacePreferences(session.user?.id, session.token);
  const language = useInterfaceLanguage();
  const pageLanguage = path === routes.home || path === routes.dashboard ? language : 'uz';
  const publicCopy = landingCopy[pageLanguage];
  const { clear, token } = session;
  const clearCurrent = useCallback(() => { if (token) clear(token); }, [clear, token]);
  const protectedPage = protectedPaths.has(workspaceParent(path));
  const sharedProfileId = path.startsWith(routes.sharedProfile + '/') ? path.slice(routes.sharedProfile.length + 1) : '';
  const signInPage = path === routes.login || path === routes.register;
  const restoringSession = Boolean(session.token && !session.user);

  useEffect(() => {
    const pageTitle = ({
      [routes.home]: publicCopy.pageTitle, [routes.login]: 'Log In', [routes.register]: 'Sign Up',
      [routes.recover]: 'Reset Password', [routes.profile]: 'Profile', [routes.demo]: 'Practice Demo',
      [routes.account]: accountLink?.action === 'verify_email' ? 'Verify Email' : accountLink ? 'Reset Password' : 'Account Link',
      [routes.settingsVerifyEmail]: 'Verify Email', [routes.settingsProfileBadge]: 'Profile Badge',
    } as Record<string, string>)[path];
    document.title = (pageTitle ?? routeLabel(language, workspaceParent(path), navigationPages.get(workspaceParent(path))?.label ?? (sharedProfileId ? 'Shared Profile' : 'Page Not Found'))) + ' — LexiMind';
    document.documentElement.lang = pageLanguage;
    document.querySelector('meta[name=description]')?.setAttribute('content', publicCopy.description);
  }, [path, accountLink?.action, sharedProfileId, language, pageLanguage, publicCopy]);

  useEffect(() => {
    window.scrollTo(0, 0);
    const frame = requestAnimationFrame(() => document.getElementById('main')?.focus({ preventScroll: true }));
    return () => cancelAnimationFrame(frame);
  }, [path, accountLink?.action, sharedProfileId]);

  function confirmed(action: AccountLink['action']) {
    if (action === 'reset_password') session.clear();
    else if (session.token) session.retry();
  }

  let content;
  if (legacy) content = <><Redirect to={legacy} /><LoadingScreen /></>;
  else if (restoringSession && !session.error) content = <LoadingScreen />;
  else if (restoringSession && (protectedPage || signInPage || path === routes.home)) content = <main id="main" className="loading-screen" tabIndex={-1}>
    <div className="container">
      <Notice error>{session.error}</Notice><div className="notice-stack session-actions">
        <button className="button primary" onClick={session.retry}>Qayta urinish</button>
        <button className="button secondary" onClick={() => { session.clear(); navigate(routes.login, true); }}>Kirish sahifasiga</button>
      </div>
    </div>
  </main>;
  else if (protectedPage) {
    if (session.token && session.user) content = <Workspace key={session.key} path={path} token={session.token} user={session.user}
      accountAccess={{ accounts: session.accounts, addAccount: session.addAccount, switchAccount: session.switchAccount }}
      onUserChange={session.updateUser} onSessionLost={clearCurrent} onLogout={() => { if (clear(session.token)) navigate(routes.home, true); }} />;
    else content = <><Redirect to={routes.login} /><LoadingScreen /></>;
  } else if (signInPage || path === routes.recover) {
    if (session.user && signInPage) content = <><Redirect to={routes.dashboard} /><LoadingScreen /></>;
    else if (path === routes.register) content = <RegisterPage referralCode={searchParams.get('ref') ?? undefined} onLogin={session.establish} />;
    else content = <AuthPage key={path} mode={path === routes.login ? 'login' : 'recover'} onLogin={session.establish} onConfirmed={confirmed} />;
  } else if (path === routes.account && accountLink) {
    const link: AccountLink = { token: accountLink.token, action: accountLink.action === 'verify_email' ? 'verify_email' : 'reset_password' };
    content = <AuthPage key={link.action + link.token}
      mode={link.action === 'verify_email' ? 'verify' : 'reset'} link={link} signedIn={Boolean(session.user)} onLogin={session.establish} onConfirmed={confirmed} />;
  } else if (path === routes.account) {
    content = <MissingAccountLink signedIn={Boolean(session.user)} />;
  } else if (sharedProfileId) {
    content = <SharedProfile key={sharedProfileId} id={sharedProfileId} token={session.user ? token : undefined} />;
  } else if (path === routes.home) {
    content = session.user ? <><Redirect to={routes.dashboard} /><LoadingScreen /></> : <LandingPage signedIn={false} language={language} />;
  } else {
    content = <PublicLayout signedIn={Boolean(session.user)}>
      {path === routes.demo ? <DemoPage />
        : <div className="container inner-screen page-intro"><h1 lang="en">Page Not Found</h1><p><Link className="text-link" href={routes.home}>Bosh sahifa <ArrowRight size={16} /></Link></p></div>}
    </PublicLayout>;
  }
  return <><a href="#main" className="skip-link" onClick={(event) => { event.preventDefault(); document.getElementById('main')?.focus(); }}>{publicCopy.skip}</a><Suspense fallback={<LoadingScreen />}>{content}</Suspense></>;
}
