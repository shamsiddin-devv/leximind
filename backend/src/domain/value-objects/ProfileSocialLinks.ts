import { BadRequestError } from '../errors/BadRequestError';

export const socialPlatforms = [
  'telegram',
  'instagram',
  'github',
  'linkedin',
  'x',
  'website',
] as const;
type SocialPlatform = (typeof socialPlatforms)[number];
export type SocialLinks = Partial<Record<SocialPlatform, string>>;
export type SocialLinksPatch = Partial<Record<SocialPlatform, string | null>>;
export const maxSocialLinkLength = 512;

const socialHosts: Record<
  Exclude<SocialPlatform, 'website'>,
  readonly string[]
> = {
  telegram: ['t.me', 'telegram.me'],
  instagram: ['instagram.com'],
  github: ['github.com'],
  linkedin: ['linkedin.com'],
  x: ['x.com', 'twitter.com'],
};

export function updateSocialLinks(
  current: SocialLinks,
  changes: SocialLinksPatch,
): SocialLinks {
  const next = { ...current };
  for (const platform of socialPlatforms) {
    const value = changes[platform];
    if (value === undefined) continue;
    if (value === null) {
      delete next[platform];
      continue;
    }
    const link = value.trim();
    const url = URL.parse(link);
    if (
      !url ||
      !link.toLowerCase().startsWith('https://') ||
      link.length > maxSocialLinkLength ||
      url.protocol !== 'https:' ||
      url.username ||
      url.password ||
      (platform !== 'website' &&
        (url.port ||
          url.pathname === '/' ||
          !socialHosts[platform].includes(url.hostname.replace(/^www\./, ''))))
    ) {
      throw new BadRequestError('Invalid profile link for ' + platform + '.');
    }
    next[platform] = link;
  }
  return next;
}
