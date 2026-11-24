import { useCallback, useEffect, useRef, type ReactNode } from 'react';
import { AlertCircle, Volume2 } from 'lucide-react';

export function Notice({ children, error = false }: { children: ReactNode; error?: boolean }) {
  return <div className={error ? 'notice error' : 'notice'} role={error ? 'alert' : 'status'}>
    {error && <AlertCircle size={17} />}<span>{children}</span>
  </div>;
}

export function Speak({ text, url, autoplay = false, label = 'Talaffuzni tinglash' }: { text: string; url?: string | null; autoplay?: boolean; label?: string }) {
  const player = useRef<HTMLAudioElement | null>(null);
  const speech = useRef<SpeechSynthesisUtterance | null>(null);
  const stop = useCallback(() => {
    player.current?.pause();
    player.current = null;
    if (speech.current) {
      window.speechSynthesis.cancel();
      speech.current = null;
    }
  }, []);
  const speak = useCallback(() => {
    stop();
    if (url) {
      player.current = new Audio(url);
      void player.current.play().catch(() => {});
    } else if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'en-US';
      const clear = () => { if (speech.current === utterance) speech.current = null; };
      utterance.onend = clear;
      utterance.onerror = clear;
      speech.current = utterance;
      window.speechSynthesis.speak(utterance);
    }
  }, [stop, text, url]);
  useEffect(() => {
    if (autoplay) speak();
    return stop;
  }, [autoplay, speak, stop]);
  return <button type="button" className="icon-button speak" aria-label={label} onClick={speak}><Volume2 size={19} /></button>;
}
