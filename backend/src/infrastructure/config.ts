import { isIP } from 'node:net';

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
  validateAccountEmail(env);
  return {
    ...env,
    NODE_ENV: mode,
    PORT: port,
    DATABASE_URL: url,
    DB_POOL_MAX: pool,
    AUTH_TTL_SECONDS: ttl,
    CORS_ORIGINS: origins.join(','),
    TRUSTED_PROXIES: trustedProxies,
  };
}

function validateAccountEmail(env: Record<string, unknown>) {
  const emailValues = [
    'EMAIL_API_KEY',
    'EMAIL_FROM',
    'ACCOUNT_ACTION_URL',
    'ACCOUNT_EMAIL_KEY',
  ].map((key) => {
    const value = env[key];
    return typeof value === 'string' && value.trim().length > 0;
  });
  if (emailValues.some(Boolean) && !emailValues.every(Boolean)) {
    throw new Error('Configure all account email variables together.');
  }
  if (
    emailValues[3] &&
    !/^[a-f0-9]{64}$/i.test(env.ACCOUNT_EMAIL_KEY as string)
  )
    throw new Error(
      'ACCOUNT_EMAIL_KEY must contain 32 random bytes represented as hex.',
    );
  if (emailValues[2]) {
    try {
      const action = new URL(env.ACCOUNT_ACTION_URL as string);
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
}
