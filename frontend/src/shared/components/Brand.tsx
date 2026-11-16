import { BookOpen } from 'lucide-react';
import { Link, routes } from '../../app/router';

export function Brand({ href = routes.home }: { href?: string }) {
  return <Link className="brand" href={href} aria-label="LexiMind bosh sahifasi">
    <span className="brand-icon"><BookOpen size={22} strokeWidth={2.4} /></span>Lexi<span>Mind</span>
  </Link>;
}
