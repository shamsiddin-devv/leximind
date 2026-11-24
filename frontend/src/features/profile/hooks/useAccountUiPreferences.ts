import { useEffect, useRef, useState } from 'react';
import { api, explain } from '../../../shared/services/api';
import { defaultProfileAppearance, readProfileAppearance, type ProfileAppearance } from '../data/profileAppearance';
import { prepareLegacyBanner } from '../data/prepareProfileBanner';

const defaults = {
  review: true, streak: false, achievements: false, progress: false,
  weekly: false, push: false, email: false, news: false,
};
export type NotificationChoice = keyof typeof defaults;
const choices = Object.keys(defaults) as NotificationChoice[];

type CoverPatch = Omit<Partial<ProfileAppearance>, 'content'> & {
  content?: Partial<ProfileAppearance['content']>;
};
type AppearanceInput = CoverPatch & { image?: string };
type Changes = { appearance?: AppearanceInput; notifications?: Partial<typeof defaults> };
type Preferences = { appearance: ProfileAppearance | null; notifications: typeof defaults | null };
type QueuedWrite = {
  changes: Changes;
  finish: { resolve: () => void; reject: (error: unknown) => void }[];
};
const path = '/users/me/ui-preferences';

function localKeys(userId: string) {
  return {
    appearance: 'leximind.profile-appearance.' + userId,
    banner: 'leximind.profile-banner.' + userId,
    notifications: 'leximind.notifications.' + userId,
  };
}

function readLocalPreferences(userId: string): Preferences {
  let appearance: ProfileAppearance | null = null;
  let notifications: typeof defaults | null = null;
  try {
    const keys = localKeys(userId);
    if (localStorage.getItem(keys.appearance) !== null || localStorage.getItem(keys.banner) !== null) {
      appearance = readProfileAppearance(userId);
    }
    const raw = localStorage.getItem(keys.notifications);
    if (raw !== null) {
      const parsed = JSON.parse(raw);
      notifications = { ...defaults };
      for (const key of choices) {
        if (typeof parsed?.[key] === 'boolean') notifications[key] = parsed[key];
      }
    }
  } catch { /* Keep any preferences already read. */ }
  return { appearance, notifications };
}

function removeLocal(userId: string, section: keyof Preferences) {
  const keys = localKeys(userId);
  try {
    localStorage.removeItem(keys[section]);
    if (section === 'appearance') localStorage.removeItem(keys.banner);
  } catch { /* Existing entries remain harmless because imports only fill empty sections. */ }
}

function mergeAppearance(previous: AppearanceInput, next: AppearanceInput) {
  const result = { ...previous, ...next };
  if (previous.content || next.content) result.content = { ...previous.content, ...next.content };
  if (next.banner) delete result.image;
  if (next.image) delete result.banner;
  return result;
}

function combine(previous: Changes, next: Changes): Changes {
  return {
    appearance: previous.appearance || next.appearance
      ? mergeAppearance(previous.appearance ?? {}, next.appearance ?? {})
      : undefined,
    notifications: previous.notifications || next.notifications
      ? { ...previous.notifications, ...next.notifications }
      : undefined,
  };
}

function withPending(confirmed: Preferences, patch?: Changes): Preferences {
  const base = confirmed.appearance ?? defaultProfileAppearance;
  const { image, ...changes } = patch?.appearance ?? {};
  return {
    appearance: patch?.appearance ? {
      ...base, ...changes, content: { ...base.content, ...changes.content },
      ...(image ? { banner: image } : {}),
    } : confirmed.appearance,
    notifications: patch?.notifications ? { ...(confirmed.notifications ?? defaults), ...patch.notifications } : confirmed.notifications,
  };
}

export function useAccountUiPreferences(userId: string, token: string) {
  const [local] = useState(() => readLocalPreferences(userId));
  const [values, setValues] = useState<Preferences>(local);
  const [ready, setReady] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);
  const confirmed = useRef<Preferences>(local);
  const pending = useRef<QueuedWrite | undefined>(undefined);
  const active = useRef(false);
  const timeout = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const session = useRef<AbortController | undefined>(undefined);

  useEffect(() => {
    const controller = new AbortController();
    session.current = controller;
    const options = { token, signal: controller.signal };

    async function load() {
      try {
        let server = await api<Preferences>(path, options);
        const legacy = readLocalPreferences(userId);
        let importError = '';
        if (!server.notifications && legacy.notifications) {
          try {
            server = await api<Preferences>(path, { ...options, method: 'PATCH', body: {
              initialize: true, notifications: legacy.notifications,
            } });
          } catch (failure) {
            importError = explain(failure);
          }
        }
        if (!server.appearance && legacy.appearance) {
          const { banner, ...settings } = legacy.appearance;
          try {
            const source = banner.startsWith('data:') ? { image: await prepareLegacyBanner(banner) } : { banner };
            server = await api<Preferences>(path, { ...options, method: 'PATCH', body: {
              initialize: true, appearance: { ...settings, ...source },
            } });
          } catch (failure) {
            importError = explain(failure);
          }
        }
        if (controller.signal.aborted) return;
        if (server.appearance) removeLocal(userId, 'appearance');
        if (server.notifications) removeLocal(userId, 'notifications');
        const initial = {
          appearance: server.appearance ?? legacy.appearance,
          notifications: server.notifications ?? legacy.notifications,
        };
        confirmed.current = initial;
        setValues(initial);
        setError(importError ? 'Eski sozlamalarni ko‘chirib bo‘lmadi. ' + importError : '');
        setReady(true);
      } catch (failure) {
        if (!controller.signal.aborted) setError(explain(failure));
      }
    }

    void load();
    return () => {
      controller.abort();
      clearTimeout(timeout.current);
      for (const { reject } of pending.current?.finish ?? []) reject(new Error('Preference request cancelled.'));
      pending.current = undefined;
    };
  }, [token, userId, revision]);

  async function flush(controller: AbortController) {
    if (active.current || controller.signal.aborted) return;
    active.current = true;
    try {
      while (pending.current && !controller.signal.aborted) {
        const batch = pending.current;
        pending.current = undefined;
        try {
          const remote = await api<Preferences>(path, {
            token, method: 'PATCH', body: batch.changes, signal: controller.signal,
          });
          if (batch.changes.appearance && remote.appearance) removeLocal(userId, 'appearance');
          if (batch.changes.notifications && remote.notifications) removeLocal(userId, 'notifications');
          confirmed.current = {
            appearance: remote.appearance ?? confirmed.current.appearance,
            notifications: remote.notifications ?? confirmed.current.notifications,
          };
          for (const { resolve } of batch.finish) resolve();
        } catch (failure) {
          if (!controller.signal.aborted) setError(explain(failure));
          for (const { reject } of batch.finish) reject(failure);
        }
        if (!controller.signal.aborted) setValues(withPending(confirmed.current, nextChanges()));
      }
    } finally {
      active.current = false;
      if (!controller.signal.aborted) setSaving(false);
    }
  }

  function nextChanges() {
    return pending.current?.changes;
  }

  function save(changes: Changes) {
    const controller = session.current;
    if (!ready || !controller) return Promise.reject(new Error('Preferences are not ready.'));
    setValues((current) => withPending(current, changes));
    setSaving(true);
    setError('');
    return new Promise<void>((resolve, reject) => {
      const current = pending.current;
      pending.current = {
        changes: combine(current?.changes ?? {}, changes),
        finish: [...(current?.finish ?? []), { resolve, reject }],
      };
      if (!active.current) {
        clearTimeout(timeout.current);
        timeout.current = setTimeout(() => void flush(controller), 150);
      }
    });
  }

  const status = {
    ready, saving, error,
    retry: () => {
      setReady(false);
      setError('');
      setRevision((current) => current + 1);
    },
  };
  return {
    appearance: {
      ...status,
      saved: values.appearance ?? defaultProfileAppearance,
      save: (appearance: CoverPatch) => save({ appearance }),
      saveBanner: (banner: string) => save({
        appearance: banner.startsWith('data:') ? { image: banner } : { banner },
      }),
    },
    notifications: {
      ...status,
      choices,
      values: values.notifications ?? defaults,
      save: (notifications: Partial<typeof defaults>) => save({ notifications }),
    },
  };
}

export type ProfileAppearanceState = ReturnType<typeof useAccountUiPreferences>['appearance'];
export type NotificationPreferences = ReturnType<typeof useAccountUiPreferences>['notifications'];
