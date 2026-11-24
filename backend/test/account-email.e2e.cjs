const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ConfigService } = require('@nestjs/config');
const nodemailer = require('nodemailer');
const { validateEnvironment } = require('../dist/src/infrastructure/config');
const {
  AccountActionMailer,
} = require('../dist/src/infrastructure/auth/AccountActionMailer');

const config = {
  DATABASE_URL: 'postgresql://localhost/leximind_test',
  SMTP_EMAIL: 'sender@example.com',
  SMTP_PASS: 'abcd efgh ijkl mnop',
  ACCOUNT_EMAIL_KEY: 'a1'.repeat(32),
};

test('sends an OTP via Gmail without requiring an action link or Resend', async (t) => {
  const sendMail = t.mock.fn(async () => ({
    accepted: ['learner@example.com'],
  }));
  const createTransport = t.mock.method(nodemailer, 'createTransport', () => ({
    sendMail,
  }));
  const mailer = new AccountActionMailer(
    new ConfigService(validateEnvironment(config)),
  );

  mailer.ensureConfigured();
  assert.equal(
    await mailer.send(
      'learner@example.com',
      'reset_password',
      mailer.seal('unused-token', '001234'),
      'digest',
    ),
    true,
  );

  const [options] = createTransport.mock.calls[0].arguments;
  assert.equal(options.host, 'smtp.gmail.com');
  assert.equal(options.port, 465);
  assert.equal(options.secure, true);
  assert.deepEqual(options.auth, {
    user: config.SMTP_EMAIL,
    pass: 'abcdefghijklmnop',
  });
  const [message] = sendMail.mock.calls[0].arguments;
  assert.deepEqual(message.from, {
    name: 'LexiMind',
    address: config.SMTP_EMAIL,
  });
  assert.equal(message.to, 'learner@example.com');
  assert.match(message.text, /001234/);
  assert.doesNotMatch(message.text, /unused-token/);
  assert.match(message.html, /Parolingizni tiklang/);
  assert.match(message.html, />001234<\/p>/);
  assert.doesNotMatch(message.html, /href=|unused-token/);
});

test('includes the styled template and action link in Resend email', async (t) => {
  const fetch = t.mock.method(
    globalThis,
    'fetch',
    async () => new Response(null, { status: 200 }),
  );
  const mailer = new AccountActionMailer(
    new ConfigService(
      validateEnvironment({
        ...config,
        SMTP_EMAIL: '',
        SMTP_PASS: '',
        EMAIL_API_KEY: 'test-key',
        EMAIL_FROM: 'test@example.com',
        ACCOUNT_ACTION_URL: 'https://example.com/account-action',
      }),
    ),
  );

  assert.equal(
    await mailer.deliver(
      'learner@example.com',
      'verify_email',
      'test-token',
      'digest',
      '012345',
    ),
    true,
  );
  const [, request] = fetch.mock.calls[0].arguments;
  const message = JSON.parse(request.body);
  assert.match(message.text, /012345/);
  assert.match(message.html, /Email manzilingizni tasdiqlang/);
  assert.match(message.html, /action=verify_email&amp;token=test-token/);
});

test('requires an SMTP credential pair and a separate local OTP key', () => {
  assert.throws(
    () => validateEnvironment({ ...config, SMTP_PASS: '' }),
    /SMTP_EMAIL and SMTP_PASS/,
  );
  assert.throws(
    () => validateEnvironment({ ...config, ACCOUNT_EMAIL_KEY: '' }),
    /ACCOUNT_EMAIL_KEY/,
  );
});

test('sends an OTP via Brevo HTTPS and recognizes the same accepted message on retry', async (t) => {
  let attempt = 0;
  const fetch = t.mock.method(globalThis, 'fetch', async () => {
    attempt++;
    return attempt === 1
      ? new Response(null, { status: 201 })
      : Response.json({ code: 'duplicate_parameter' }, { status: 400 });
  });
  const env = {
    ...config,
    BREVO_API_KEY: 'brevo-test-key',
    BREVO_FROM_EMAIL: 'otp@example.com',
    ACCOUNT_ACTION_URL: 'https://example.com/account-action',
  };
  assert.throws(
    () => validateEnvironment({ ...env, BREVO_FROM_EMAIL: '' }),
    /Brevo requires/,
  );
  const parsed = validateEnvironment(env);
  assert.equal(parsed.ACCOUNT_MAIL_PROVIDER, 'brevo');
  const mailer = new AccountActionMailer(new ConfigService(parsed));
  const send = () =>
    mailer.deliver(
      'learner@example.com',
      'verify_email',
      'token',
      'digest',
      '012345',
    );
  assert.equal(await send(), true);
  assert.equal(await send(), true);
  const [url, request] = fetch.mock.calls[0].arguments;
  assert.equal(url, 'https://api.brevo.com/v3/smtp/email');
  assert.equal(request.headers['api-key'], env.BREVO_API_KEY);
  const message = JSON.parse(request.body);
  assert.deepEqual(message.sender, {
    name: 'LexiMind',
    email: env.BREVO_FROM_EMAIL,
  });
  assert.deepEqual(message.messageVersions, [
    { to: [{ email: 'learner@example.com' }] },
  ]);
  assert.match(message.textContent, /012345/);
  assert.match(message.htmlContent, /action=verify_email&amp;token=token/);
  assert.match(
    message.headers.idempotencyKey,
    /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-8[a-f0-9]{3}-[a-f0-9]{12}$/,
  );
  assert.equal(fetch.mock.calls[1].arguments[1].body, request.body);
});
