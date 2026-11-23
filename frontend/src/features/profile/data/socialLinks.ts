import { AtSign, Github, Globe, Instagram, Linkedin, Send, type LucideIcon } from 'lucide-react';
import type { ProfileSocialLinks } from '../../../shared/types/api';

export type SocialPlatform = {
  key: keyof ProfileSocialLinks;
  label: string;
  icon: LucideIcon;
  example: string;
  hosts?: readonly string[];
};

export const profileSocialPlatforms: readonly SocialPlatform[] = [
  { key: 'telegram', label: 'Telegram', icon: Send, example: 'https://t.me/foydalanuvchi', hosts: ['t.me', 'telegram.me'] },
  { key: 'instagram', label: 'Instagram', icon: Instagram, example: 'https://instagram.com/foydalanuvchi', hosts: ['instagram.com'] },
  { key: 'github', label: 'GitHub', icon: Github, example: 'https://github.com/foydalanuvchi', hosts: ['github.com'] },
  { key: 'linkedin', label: 'LinkedIn', icon: Linkedin, example: 'https://linkedin.com/in/foydalanuvchi', hosts: ['linkedin.com'] },
  { key: 'x', label: 'X (Twitter)', icon: AtSign, example: 'https://x.com/foydalanuvchi', hosts: ['x.com', 'twitter.com'] },
  { key: 'website', label: 'Shaxsiy sayt', icon: Globe, example: 'https://example.com' },
];

export function profileLinkHref(value: string | undefined, platform: SocialPlatform): string | undefined {
  if (!value?.toLowerCase().startsWith('https://')) return undefined;
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' || url.username || url.password) return undefined;
    if (platform.hosts && (url.port || url.pathname === '/' || !platform.hosts.includes(url.hostname.replace(/^www\./, '')))) {
      return undefined;
    }
    return url.href;
  } catch {
    return undefined;
  }
}
