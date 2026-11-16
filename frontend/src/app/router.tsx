import { useEffect, useSyncExternalStore, type AnchorHTMLAttributes } from 'react';

export const routes = {
  home: '/', login: '/kirish', register: '/royxatdan-otish', recover: '/parolni-tiklash',
  account: '/akkaunt-amali', demo: '/namuna', dashboard: '/organish', vocabulary: '/lugat', games: '/oyinlar', profile: '/profil',
} as const;
const locationEvent = 'leximind:navigation';
const legacyPaths: Record<string, string> = { '#organish': routes.dashboard, '#lugat': routes.vocabulary, '#oyinlar': routes.games };

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
  const legacy = path === '/' ? legacyPaths[url.hash] : undefined;
  const fragment = new URLSearchParams(url.hash.slice(1));
  const action = fragment.get('action');
  const token = fragment.get('token');
  const accountLink = token && (action === 'verify_email' || action === 'reset_password') ? { action, token } : undefined;
  return { path: accountLink ? routes.account : legacy ?? path, legacy, accountLink };
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

export function Link({ href = '/', children, onClick, ...props }: AnchorHTMLAttributes<HTMLAnchorElement>) {
  return <a {...props} href={href} onClick={(event) => {
    onClick?.(event);
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || props.target || !href.startsWith('/') || href.startsWith('//')) return;
    event.preventDefault();
    navigate(href);
  }}>{children}</a>;
}
