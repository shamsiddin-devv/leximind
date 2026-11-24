import { mediaUrl } from '../../shared/services/api';

function cdnBase(value: string | undefined) {
  if (!value?.trim()) return;
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash) return;
    if (!url.pathname.endsWith('/')) url.pathname += '/';
    return url;
  } catch {
    return;
  }
}

const cdn = cdnBase(import.meta.env.VITE_FEEDBACK_AUDIO_BASE_URL);
const feedbackClip = /^\/api\/feedback-audio\/([a-z0-9-]+\.wav(?:\?v=\d+)?)$/;
const cdnStartTimeoutMs = 1800;

export function playFeedbackAudio(path: string) {
  const filename = feedbackClip.exec(path)?.[1];
  const remote = cdn && filename ? new URL(filename, cdn).href : undefined;
  const local = mediaUrl(path);
  const audio = new Audio();
  let timer: number | undefined;
  let stopped = false;

  function fallback() {
    if (stopped || audio.getAttribute('src') !== remote) return;
    window.clearTimeout(timer);
    audio.src = local;
    void audio.play().catch(() => {});
  }

  audio.volume = 0.6;
  audio.preload = 'none';
  if (remote) {
    audio.addEventListener('error', fallback);
    timer = window.setTimeout(fallback, cdnStartTimeoutMs);
  }
  audio.src = remote ?? local;
  void audio.play().then(
    () => window.clearTimeout(timer),
    (error: unknown) => {
      window.clearTimeout(timer);
      if (remote && !(error instanceof DOMException && error.name === 'NotAllowedError')) fallback();
    },
  );

  return () => {
    stopped = true;
    window.clearTimeout(timer);
    audio.removeEventListener('error', fallback);
    audio.pause();
    audio.removeAttribute('src');
    audio.load();
  };
}
