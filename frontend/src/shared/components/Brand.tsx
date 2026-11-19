import type { MouseEventHandler } from 'react';
import { BookOpen } from 'lucide-react';
import { Link, routes } from '../../app/router';

export function Brand({ href = routes.home, onClick }: { href?: string; onClick?: MouseEventHandler<HTMLAnchorElement> }) {
  return <Link className="brand" href={href} onClick={onClick} aria-label="LexiMind bosh sahifasi">
    <span className="brand-icon"><BookOpen size={22} strokeWidth={2.4} /></span>Lexi<span>Mind</span>
  </Link>;
}
