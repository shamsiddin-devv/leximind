import { createECDH, ECDH } from 'node:crypto';

export type PushCredentials = {
  subject: string;
  publicKey: string;
  privateKey: string;
};

export type BrowserPushSubscription = {
  endpoint: string;
  keys: { p256dh: string; auth: string };
};

function keyBytes(value: string, length: number) {
  if (!/^[A-Za-z0-9_-]+={0,2}$/.test(value)) throw new Error('Invalid key.');
  const bytes = Buffer.from(value, 'base64url');
  if (
    bytes.length !== length ||
    bytes.toString('base64url') !== value.replace(/=+$/, '')
  )
    throw new Error('Invalid key.');
  return bytes;
}

export function validateVapidCredentials(credentials: PushCredentials) {
  const contact = new URL(credentials.subject);
  if (
    !['mailto:', 'https:'].includes(contact.protocol) ||
    contact.username ||
    contact.password ||
    contact.hash ||
    (contact.protocol === 'mailto:' &&
      !/^[^@/?]+@[^@/?]+\.[^@/?]+$/.test(contact.pathname)) ||
    (contact.protocol === 'https:' && !contact.hostname.includes('.'))
  )
    throw new Error('Invalid VAPID contact.');

  const ecdh = createECDH('prime256v1');
  ecdh.setPrivateKey(keyBytes(credentials.privateKey, 32));
  if (!ecdh.getPublicKey().equals(keyBytes(credentials.publicKey, 65)))
    throw new Error('Mismatched VAPID keys.');
}

function trustedPushEndpoint(source: string) {
  if (source.length > 2048 || !/^https:\/\/[^\s\\]+$/.test(source))
    throw new Error('Invalid endpoint.');
  const endpoint = new URL(source);
  if (endpoint.port || endpoint.username || endpoint.password || endpoint.hash)
    throw new Error('Invalid endpoint.');
  const { hostname, pathname, search } = endpoint;
  const supported =
    (hostname === 'fcm.googleapis.com' &&
      /^\/fcm\/send\/[A-Za-z0-9:_-]{16,}$/.test(pathname) &&
      !search) ||
    (hostname === 'updates.push.services.mozilla.com' &&
      /^\/wpush\/v[12]\/[A-Za-z0-9_-]{16,}$/.test(pathname) &&
      !search) ||
    (hostname.endsWith('.push.apple.com') &&
      /^\/[A-Za-z0-9_-]{16,}$/.test(pathname) &&
      !search) ||
    (hostname.endsWith('.notify.windows.com') &&
      /^\/(?:w\/)?$/.test(pathname) &&
      /^\?token=[A-Za-z0-9_%+/=.-]{16,}$/.test(search));
  if (!supported) throw new Error('Unsupported push service.');
  return endpoint.href;
}

export function normalizePushSubscription(
  subscription: BrowserPushSubscription,
): BrowserPushSubscription {
  const publicKey = keyBytes(subscription.keys.p256dh, 65);
  if (publicKey[0] !== 4) throw new Error('Invalid public key.');
  ECDH.convertKey(publicKey, 'prime256v1');
  return {
    endpoint: trustedPushEndpoint(subscription.endpoint),
    keys: {
      p256dh: publicKey.toString('base64url'),
      auth: keyBytes(subscription.keys.auth, 16).toString('base64url'),
    },
  };
}
