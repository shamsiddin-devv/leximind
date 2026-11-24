import { useEffect, useState } from 'react';

export function useEmailCodeCooldown() {
  const [sentAt, setSentAt] = useState(0);

  useEffect(() => {
    if (sentAt === 0) return;
    const delay = Math.max(0, sentAt + 60_000 - Date.now());
    const timer = window.setTimeout(() => setSentAt(0), delay);
    return () => window.clearTimeout(timer);
  }, [sentAt]);

  return { coolingDown: sentAt !== 0, markSent: () => setSentAt(Date.now()), clear: () => setSentAt(0) };
}
