import type { ReactNode } from 'react';
import { BookOpen, Gamepad2, House, Volume2, VolumeX } from 'lucide-react';
import { Brand } from '../../shared/components/Brand';
import { Link, routes } from '../router';

const navigation = [
  { href: routes.dashboard, label: 'O‘rganish', icon: House },
  { href: routes.vocabulary, label: 'Lug‘at', icon: BookOpen },
  { href: routes.games, label: 'O‘yinlar', icon: Gamepad2 },
];

export function AppLayout({ children, path, name, practicing, sound, soundAvailable, onToggleSound, onExitPractice }: {
  children: ReactNode; path: string; name: string; practicing: boolean; sound: boolean; soundAvailable: boolean;
  onToggleSound: () => void; onExitPractice: () => void;
}) {
  return <>
    <header className="site-header">
      <div className="container header-inner">
        <Brand href={routes.dashboard} />
        <nav className="nav" aria-label="Asosiy navigatsiya">
          {navigation.map(({ href, label, icon: Icon }) => <Link key={href} href={href}
            aria-current={!practicing && path === href ? 'page' : undefined}
            onClick={(event) => { if (href === path && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey) onExitPractice(); }}>
            <Icon size={18} />{label}
          </Link>)}
        </nav>
        <div className="header-actions">
          <button className="icon-button sound-button" aria-label="O‘yin ovozlari" aria-pressed={sound} disabled={!soundAvailable}
            title={sound ? 'O‘yin ovozlari yoqilgan' : 'O‘yin ovozlari o‘chiq'} onClick={onToggleSound}>{sound ? <Volume2 size={20} /> : <VolumeX size={20} />}</button>
          <Link className="avatar" href={routes.profile} aria-label="Profil" title="Profil" aria-current={path === routes.profile ? 'page' : undefined}>{Array.from(name.trim())[0]?.toLocaleUpperCase()}</Link>
        </div>
      </div>
    </header>
    <main id="main" tabIndex={-1}>{children}</main>
    <footer className="footer"><div className="container"><span><BookOpen size={16} /> LexiMind</span>
      <span>Inglizcha so‘zlarni o‘rganish va takrorlash</span></div></footer>
  </>;
}
