import { BadgeCheck } from 'lucide-react';
import './VerifiedBadge.css';

export function VerifiedBadge({ size = 20, decorative = false, className = '' }: {
  size?: number; decorative?: boolean; className?: string;
}) {
  return <BadgeCheck className={('verified-badge ' + className).trim()} size={size} focusable="false"
    aria-hidden={decorative || undefined} role={decorative ? undefined : 'img'}
    aria-label={decorative ? undefined : 'Tasdiqlangan LexiMind profili'} />;
}
