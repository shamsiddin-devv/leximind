import { useState } from 'react';

export function UserAvatar({ name, url, className }: {
  name: string;
  url?: string | null;
  className: string;
}) {
  const [failedUrl, setFailedUrl] = useState<string>();
  const initial = Array.from(name.trim())[0]?.toLocaleUpperCase() ?? '?';

  return <span className={className} aria-hidden="true">
    {url && url !== failedUrl
      ? <img src={url} alt="" decoding="async" onError={() => setFailedUrl(url)} />
      : initial}
  </span>;
}
