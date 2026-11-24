import { useEffect, useSyncExternalStore, type ComponentProps } from 'react';

export const routes = {
  home: '/', login: '/login', register: '/register', recover: '/reset-password',
  account: '/account-action', demo: '/demo', dashboard: '/dashboard', vocabulary: '/vocabulary', games: '/games', profile: '/profile',
  learningSessions: '/learning-sessions', reviewCenter: '/review-center', studyPlan: '/study-plan',
  statistics: '/statistics', topics: '/topics', achievements: '/achievements', leaderboard: '/leaderboard',
  learningCalendar: '/learning-calendar', collections: '/my-collections', referrals: '/referrals', mistakes: '/mistakes-notebook', settings: '/settings',
  settingsAccount: '/settings/account', settingsPassword: '/settings/password', settingsNotifications: '/settings/notifications', settingsAppearance: '/settings/appearance',
  settingsLearning: '/settings/learning-preferences', settingsCustomization: '/settings/ui-customization', settingsPrivacy: '/settings/privacy-security',
  settingsVerifyEmail: '/settings/privacy-security/verify-email',
  settingsProfileBadge: '/settings/privacy-security/profile-badge',
  sharedProfile: '/shared-profile',
} as const;
export function settingsParent(path: string) {
  return path === routes.settingsVerifyEmail || path === routes.settingsProfileBadge ? routes.settingsPrivacy : path;
}
const locationEvent = 'leximind:navigation';
const legacyPaths = new Map([
  ['/kirish', routes.login],
  ['/royxatdan-otish', routes.register],
  ['/parolni-tiklash', routes.recover],
  ['/akkaunt-amali', routes.account],
  ['/namuna', routes.demo],
  ['/organish', routes.dashboard],
  ['/lugat', routes.vocabulary],
  ['/oyinlar', routes.games],
  ['/profil', routes.profile],
  ['/oquv-sessiyalari', routes.learningSessions],
  ['/takrorlash-markazi', routes.reviewCenter],
  ['/oquv-rejasi', routes.studyPlan],
  ['/statistika', routes.statistics],
  ['/mavzular', routes.topics],
  ['/yutuqlar', routes.achievements],
  ['/reyting', routes.leaderboard],
  ['/oquv-taqvimi', routes.learningCalendar],
  ['/toplamlarim', routes.collections],
  ['/friends', routes.referrals],
  ['/xatolar-daftari', routes.mistakes],
  [routes.settings, routes.settingsAccount],
  ['/sozlamalar', routes.settingsAccount],
]);
const legacyHashes: Record<string, string> = { '#organish': routes.dashboard, '#lugat': routes.vocabulary, '#oyinlar': routes.games };

function snapshot() { return location.pathname + location.search + location.hash; }

function subscribe(onChange: () => void) {
  window.addEventListener('popstate', onChange);
  window.addEventListener('hashchange', onChange);
  window.addEventListener(locationEvent, onChange);
  return () => {
    window.removeEventListener('popstate', onChange);
    window.removeEventListener('hashchange', onChange);
    window.removeEventListener(locationEvent, onChange);
  };
}

export function useRoute() {
  const url = new URL(useSyncExternalStore(subscribe, snapshot), location.origin);
  const path = url.pathname.replace(/\/+$/, '') || '/';
  const fragment = new URLSearchParams(url.hash.slice(1));
  const action = fragment.get('action');
  const token = fragment.get('token');
  const accountLink = token && (action === 'verify_email' || action === 'reset_password') ? { action, token } : undefined;
  const hashRoute = path === routes.home ? legacyHashes[url.hash] : undefined;
  const canonicalPath = accountLink ? routes.account : hashRoute ?? legacyPaths.get(path) ?? path;
  const legacy = canonicalPath === path ? undefined : canonicalPath + url.search + (hashRoute ? '' : url.hash);
  return { path: canonicalPath, legacy, accountLink, searchParams: url.searchParams };
}

export function navigate(to: string, replace = false) {
  if (snapshot() !== to) {
    if (replace) history.replaceState(null, '', to);
    else history.pushState(null, '', to);
    window.dispatchEvent(new Event(locationEvent));
  }
}

export function Redirect({ to }: { to: string }) {
  useEffect(() => { navigate(to, true); }, [to]);
  return null;
}

export function Link({ href = '/', children, onClick, ...props }: ComponentProps<'a'>) {
  return <a {...props} href={href} onClick={(event) => {
    onClick?.(event);
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || props.target || !href.startsWith('/') || href.startsWith('//')) return;
    event.preventDefault();
    navigate(href);
  }}>{children}</a>;
}
