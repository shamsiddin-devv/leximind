import { ArrowRight, type LucideIcon } from 'lucide-react';
import { Link } from '../../app/router';
import './SectionIntroPage.css';

export function SectionIntroPage({ title, icon: Icon, description, related }: {
  title: string;
  icon: LucideIcon;
  description: string;
  related?: { href: string; label: string };
}) {
  return <div className="container screen inner-screen">
    <div className="page-intro">
      <span className="tile-icon violet"><Icon size={26} aria-hidden="true" /></span>
      <h1 lang="en">{title}</h1>
      <p>{description}</p>
    </div>
    <div className="panel section-intro">
      <p>Bu bo‘lim tayyorlanmoqda.</p>
      {related && <Link className="text-link" href={related.href}>
        {related.label}<ArrowRight size={16} aria-hidden="true" />
      </Link>}
    </div>
  </div>;
}
