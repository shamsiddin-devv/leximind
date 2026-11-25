import { isIP } from 'node:net';
import { validateVapidCredentials } from './notifications/push-configuration';

export function validateEnvironment(env: Record<string, unknown>) {
  const url = typeof env.DATABASE_URL === 'string' ? env.DATABASE_URL : '';
  try {
    const database = new URL(url);
    if (
      !['postgres:', 'postgresql:'].includes(database.protocol) ||
      !database.hostname
    )
      throw new Error();
  } catch {
    throw new Error('DATABASE_URL must be a PostgreSQL URL with a host.');
  }
  const port = Number(env.PORT ?? 3000),
    pool = Number(env.DB_POOL_MAX ?? 10),
    ttl = Number(env.AUTH_TTL_SECONDS ?? 604800);
  if (!Number.isInteger(port) || port < 1 || port > 65535)
    throw new Error('Invalid PORT.');
  if (!Number.isInteger(pool) || pool < 1 || pool > 100)
    throw new Error('Invalid DB_POOL_MAX.');
  if (!Number.isInteger(ttl) || ttl < 300 || ttl > 2592000)
    throw new Error('Invalid AUTH_TTL_SECONDS.');
  const mode = typeof env.NODE_ENV === 'string' ? env.NODE_ENV : 'development';
  if (!['production', 'development', 'test'].includes(mode))
    throw new Error('Invalid NODE_ENV.');
  const origins = (typeof env.CORS_ORIGINS === 'string' ? env.CORS_ORIGINS : '')
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean);
  for (const origin of origins) {
    try {
      const parsed = new URL(origin);
      if (
        parsed.origin !== origin ||
        !['http:', 'https:'].includes(parsed.protocol)
      )
        throw new Error();
    } catch {
      throw new Error('CORS_ORIGINS must contain exact HTTP origins.');
    }
  }
  const trustedProxies = (
    typeof env.TRUSTED_PROXIES === 'string' ? env.TRUSTED_PROXIES : ''
  )
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
  for (const proxy of trustedProxies) {
    const [ip, prefix, extra] = proxy.split('/');
    const family = isIP(ip);
    if (
      !family ||
      extra !== undefined ||
      (prefix !== undefined &&
        (!/^\d+$/.test(prefix) ||
          Number(prefix) < 1 ||
          Number(prefix) > (family === 4 ? 32 : 128)))
    ) {
      throw new Error(
        'TRUSTED_PROXIES must contain explicit IP addresses or non-default CIDR ranges.',
      );
    }
  }
  const accountMailProvider = validateAccountEmail(env);
  validateNotificationDelivery(env);
  validateTelegramBot(env);
  return {
    ...env,
    NODE_ENV: mode,
    PORT: port,
    DATABASE_URL: url,
    DB_POOL_MAX: pool,
    AUTH_TTL_SECONDS: ttl,
    CORS_ORIGINS: origins.join(','),
    TRUSTED_PROXIES: trustedProxies,
    ACCOUNT_MAIL_PROVIDER: accountMailProvider,
    NOTIFICATION_DELIVERY_ENABLED: env.NOTIFICATION_DELIVERY_ENABLED === 'true',
  };
}

function validateNotificationDelivery(env: Record<string, unknown>) {
  const enabled = env.NOTIFICATION_DELIVERY_ENABLED;
  if (
    enabled !== undefined &&
    enabled !== '' &&
    enabled !== 'true' &&
    enabled !== 'false'
  )
    throw new Error('NOTIFICATION_DELIVERY_ENABLED must be true or false.');

  const [subject, publicKey, privateKey] = [
    env.VAPID_SUBJECT,
    env.VAPID_PUBLIC_KEY,
    env.VAPID_PRIVATE_KEY,
  ].map((value) => (typeof value === 'string' ? value.trim() : ''));
  if (subject || publicKey || privateKey) {
    try {
      validateVapidCredentials({ subject, publicKey, privateKey });
    } catch {
      throw new Error(
        'Configure a valid VAPID_SUBJECT and matching VAPID key pair.',
      );
    }
  }
}

function validateTelegramBot(env: Record<string, unknown>) {
  const [token, username, secret] = [
    env.TELEGRAM_BOT_TOKEN || env.TG_BOT_API_KEY,
    env.TELEGRAM_BOT_USERNAME,
    env.TELEGRAM_WEBHOOK_SECRET,
  ].map((value) => (typeof value === 'string' ? value.trim() : ''));
  if (token || username || secret) {
    if (
      !/^[0-9]+:[\w-]+$/.test(token) ||
      !/^[A-Za-z0-9_]{5,32}$/.test(username) ||
      !/^[A-Za-z0-9_-]{32,256}$/.test(secret)
    ) {
      throw new Error(
        'Configure a Telegram bot token, username, and random webhook secret together.',
      );
    }
  }
}

export type AccountMailProvider = 'gmail' | 'resend' | 'brevo';

function validateAccountEmail(
  env: Record<string, unknown>,
): AccountMailProvider | null {
  const value = (key: string) =>
    typeof env[key] === 'string' ? env[key].trim() : '';
  const smtpEmail = value('SMTP_EMAIL');
  const smtpPass = value('SMTP_PASS');
  const apiKey = value('EMAIL_API_KEY');
  const from = value('EMAIL_FROM');
  const brevoKey = value('BREVO_API_KEY');
  const brevoFrom = value('BREVO_FROM_EMAIL');
  const actionUrl = value('ACCOUNT_ACTION_URL');
  const localKey = value('ACCOUNT_EMAIL_KEY');
  if (Boolean(smtpEmail) !== Boolean(smtpPass)) {
    throw new Error('Configure SMTP_EMAIL and SMTP_PASS together.');
  }
  if (smtpEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(smtpEmail)) {
    throw new Error('SMTP_EMAIL must be an email address.');
  }
  if ((apiKey || from) && (!apiKey || !from || !actionUrl)) {
    throw new Error(
      'Resend requires EMAIL_API_KEY, EMAIL_FROM and ACCOUNT_ACTION_URL.',
    );
  }
  if ((brevoKey || brevoFrom) && (!brevoKey || !brevoFrom || !actionUrl)) {
    throw new Error(
      'Brevo requires BREVO_API_KEY, BREVO_FROM_EMAIL and ACCOUNT_ACTION_URL.',
    );
  }
  if (brevoFrom && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(brevoFrom)) {
    throw new Error('BREVO_FROM_EMAIL must be an email address.');
  }
  const provider = brevoKey
    ? 'brevo'
    : smtpEmail
      ? 'gmail'
      : apiKey
        ? 'resend'
        : null;
  if ((provider || localKey) && !/^[a-f0-9]{64}$/i.test(localKey))
    throw new Error(
      'ACCOUNT_EMAIL_KEY must contain 32 random bytes represented as hex.',
    );
  if (actionUrl) {
    try {
      const action = new URL(actionUrl);
      if (
        action.protocol !== 'https:' ||
        action.username ||
        action.password ||
        action.search ||
        action.hash
      )
        throw new Error();
    } catch {
      throw new Error(
        'ACCOUNT_ACTION_URL must be an HTTPS page URL without credentials, query or fragment.',
      );
    }
  }
  return provider;
}
