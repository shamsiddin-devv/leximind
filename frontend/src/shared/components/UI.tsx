import { useEffect, useRef, type ReactNode } from 'react';
import { AlertCircle, Volume2 } from 'lucide-react';

export function Notice({ children, error = false }: { children: ReactNode; error?: boolean }) {
  return <div className={error ? 'notice error' : 'notice'} role={error ? 'alert' : 'status'}>
    {error && <AlertCircle size={17} />}<span>{children}</span>
  </div>;
}

export function Speak({ text, url }: { text: string; url?: string | null }) {
  const player = useRef<HTMLAudioElement | null>(null);
  useEffect(() => () => player.current?.pause(), []);
  function speak() {
    if (url) {
      player.current?.pause();
      player.current = new Audio(url);
      void player.current.play().catch(() => {});
    } else if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'en-US';
      window.speechSynthesis.speak(utterance);
    }
  }
  return <button type="button" className="icon-button speak" aria-label="Talaffuzni tinglash" onClick={speak}><Volume2 size={19} /></button>;
}
