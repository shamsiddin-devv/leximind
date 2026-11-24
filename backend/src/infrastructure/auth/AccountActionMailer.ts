import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createTransport, type Transporter } from 'nodemailer';
import type SMTPTransport from 'nodemailer/lib/smtp-transport';
import type {
  AccountActionKind,
  AccountActionMailer as Mailer,
} from '../../application/use-cases/user/AccountActions';
import { UnavailableError } from '../../domain/errors/UnavailableError';
import type { AccountMailProvider } from '../config';
import { accountActionEmail } from './AccountActionEmailTemplate';
import {
  createCipheriv,
  createDecipheriv,
  createHash,
  createHmac,
  randomBytes,
  randomInt,
} from 'node:crypto';

@Injectable()
export class AccountActionMailer implements Mailer {
  private readonly logger = new Logger(AccountActionMailer.name);
  private readonly gmail?: Transporter<SMTPTransport.SentMessageInfo>;

  constructor(private readonly config: ConfigService) {
    if (
      this.config.get<AccountMailProvider>('ACCOUNT_MAIL_PROVIDER') === 'gmail'
    ) {
      this.gmail = createTransport({
        host: 'smtp.gmail.com',
        port: 465,
        secure: true,
        auth: {
          user: this.config.getOrThrow<string>('SMTP_EMAIL').trim(),
          pass: this.config.getOrThrow<string>('SMTP_PASS').replace(/\s/g, ''),
        },
        connectionTimeout: 8000,
        greetingTimeout: 8000,
        socketTimeout: 12_000,
      });
    }
  }

  isConfigured() {
    return Boolean(
      this.config.get<AccountMailProvider>('ACCOUNT_MAIL_PROVIDER'),
    );
  }

  ensureConfigured() {
    if (!this.isConfigured()) {
      throw new UnavailableError('Account email delivery is not configured.');
    }
  }

  private key() {
    return Buffer.from(
      this.config.getOrThrow<string>('ACCOUNT_EMAIL_KEY').trim(),
      'hex',
    );
  }

  generateCode() {
    return String(randomInt(0, 1_000_000)).padStart(6, '0');
  }

  digestCode(email: string, kind: AccountActionKind, code: string) {
    return createHmac('sha256', this.key())
      .update(JSON.stringify(['account-email-code-v1', email, kind, code]))
      .digest('hex');
  }

  seal(token: string, code: string) {
    const nonce = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', this.key(), nonce);
    const data = Buffer.concat([
      cipher.update(JSON.stringify({ token, code }), 'utf8'),
      cipher.final(),
    ]);
    return Buffer.concat([nonce, cipher.getAuthTag(), data]).toString(
      'base64url',
    );
  }

  async send(
    email: string,
    kind: AccountActionKind,
    encryptedToken: string,
    digest: string,
  ) {
    const data = Buffer.from(encryptedToken, 'base64url');
    const decipher = createDecipheriv(
      'aes-256-gcm',
      this.key(),
      data.subarray(0, 12),
    );
    decipher.setAuthTag(data.subarray(12, 28));
    const payload = Buffer.concat([
      decipher.update(data.subarray(28)),
      decipher.final(),
    ]).toString('utf8');
    const { token, code } = payload.startsWith('{')
      ? (JSON.parse(payload) as { token: string; code: string })
      : { token: payload, code: undefined };
    return this.deliver(email, kind, token, digest, code);
  }

  async deliver(
    email: string,
    kind: AccountActionKind,
    token: string,
    digest: string,
    code?: string,
  ) {
    const link = this.config.get<string>('ACCOUNT_ACTION_URL')?.trim();
    const actionUrl = link ? new URL(link) : null;
    if (actionUrl) {
      actionUrl.hash = new URLSearchParams({ action: kind, token }).toString();
    }
    if (!code && !actionUrl) return false;
    const content = accountActionEmail(kind, code, actionUrl);
    try {
      if (this.gmail) {
        const result = await this.gmail.sendMail({
          from: {
            name: 'LexiMind',
            address: this.config.getOrThrow<string>('SMTP_EMAIL').trim(),
          },
          to: email,
          ...content,
          messageId: `<account-action-${digest}@leximind.local>`,
        });
        return result.accepted.length === 1;
      }
      if (
        this.config.get<AccountMailProvider>('ACCOUNT_MAIL_PROVIDER') ===
        'brevo'
      ) {
        return await this.deliverViaBrevo(email, content, digest);
      }
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        redirect: 'error',
        headers: {
          Authorization:
            'Bearer ' + this.config.getOrThrow<string>('EMAIL_API_KEY'),
          'Content-Type': 'application/json',
          'Idempotency-Key': 'account-action/' + digest,
        },
        body: JSON.stringify({
          from: this.config.getOrThrow<string>('EMAIL_FROM'),
          to: [email],
          ...content,
        }),
        signal: AbortSignal.timeout(4000),
      });
      if (!response.ok)
        this.logger.error({
          message: 'Account email rejected',
          status: response.status,
        });
      await response.body?.cancel();
      return response.ok;
    } catch {
      this.logger.error('Account email delivery failed.');
      return false;
    }
  }

  private async deliverViaBrevo(
    email: string,
    { subject, html, text }: ReturnType<typeof accountActionEmail>,
    digest: string,
  ) {
    const key = createHash('sha256')
      .update('leximind/account-action/' + digest)
      .digest('hex');
    const idempotencyKey = `${key.slice(0, 8)}-${key.slice(8, 12)}-4${key.slice(13, 16)}-8${key.slice(17, 20)}-${key.slice(20, 32)}`;
    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      redirect: 'error',
      headers: {
        'api-key': this.config.getOrThrow<string>('BREVO_API_KEY').trim(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sender: {
          name: 'LexiMind',
          email: this.config.getOrThrow<string>('BREVO_FROM_EMAIL').trim(),
        },
        subject,
        htmlContent: html,
        textContent: text,
        messageVersions: [{ to: [{ email }] }],
        headers: { idempotencyKey },
      }),
      signal: AbortSignal.timeout(4000),
    });
    if (response.status === 400 || response.status === 409) {
      const error = (await response.json().catch(() => null)) as {
        code?: string;
      } | null;
      if (error?.code === 'duplicate_parameter') return true;
    } else {
      await response.body?.cancel();
    }
    if (!response.ok) {
      this.logger.error({
        message: 'Brevo account email rejected',
        status: response.status,
      });
    }
    return response.ok;
  }
}
