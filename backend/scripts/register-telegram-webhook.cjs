require('dotenv').config({ quiet: true });
const { Api } = require('grammy');

async function configure() {
  const value = (key) => process.env[key]?.trim() ?? '';
  const token = value('TELEGRAM_BOT_TOKEN') || value('TG_BOT_API_KEY');
  const secret = value('TELEGRAM_WEBHOOK_SECRET');
  const origin = value('TELEGRAM_WEBHOOK_ORIGIN');
  if (!/^[0-9]+:[\w-]+$/.test(token) || !/^[\w-]{32,256}$/.test(secret))
    throw new Error('Configure a valid bot token and webhook secret first.');
  const url = new URL(origin);
  if (url.protocol !== 'https:' || url.origin !== origin)
    throw new Error(
      'TELEGRAM_WEBHOOK_ORIGIN must be the HTTPS backend origin.',
    );

  try {
    const api = new Api(token, { timeoutSeconds: 10 });
    await api.setWebhook(url.origin + '/api/telegram/phone-verification', {
      secret_token: secret,
      allowed_updates: ['message'],
    });
  } catch {
    throw new Error('Telegram did not accept the webhook.');
  }
  console.log('Telegram phone verification webhook registered.');
}

configure().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
