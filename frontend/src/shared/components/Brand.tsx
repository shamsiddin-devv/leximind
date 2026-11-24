import type { MouseEventHandler } from 'react';
import { BookOpen } from 'lucide-react';
import { Link, routes } from '../../app/router';

export function Brand({ href = routes.home, onClick, wordmark = false, label = 'LexiMind bosh sahifasi' }: { href?: string; onClick?: MouseEventHandler<HTMLAnchorElement>; wordmark?: boolean; label?: string }) {
  return <Link className={wordmark ? 'brand brand-wordmark' : 'brand'} href={href} onClick={onClick} aria-label={label}>
    <span className="brand-icon" aria-hidden="true"><BookOpen size={22} strokeWidth={2.4} /></span>Lexi<span>Mind</span>
  </Link>;
}
