import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type {
  AccountActionKind,
  AccountActionMailer as Mailer,
} from '../../application/use-cases/user/AccountActions';
import { UnavailableError } from '../../domain/errors/UnavailableError';
import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

@Injectable()
export class AccountActionMailer implements Mailer {
  private readonly logger = new Logger(AccountActionMailer.name);
  constructor(private readonly config: ConfigService) {}

  ensureConfigured() {
    if (!this.config.get('EMAIL_API_KEY')) {
      throw new UnavailableError('Account email delivery is not configured.');
    }
  }

  private key() {
    return Buffer.from(
      this.config.getOrThrow<string>('ACCOUNT_EMAIL_KEY'),
      'hex',
    );
  }

  seal(token: string) {
    const nonce = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', this.key(), nonce);
    const data = Buffer.concat([cipher.update(token, 'utf8'), cipher.final()]);
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
    const token = Buffer.concat([
      decipher.update(data.subarray(28)),
      decipher.final(),
    ]).toString('utf8');
    return this.deliver(email, kind, token, digest);
  }

  async deliver(
    email: string,
    kind: AccountActionKind,
    token: string,
    digest: string,
  ) {
    const actionUrl = new URL(
      this.config.getOrThrow<string>('ACCOUNT_ACTION_URL'),
    );
    actionUrl.hash = new URLSearchParams({ action: kind, token }).toString();
    const subject =
      kind === 'verify_email'
        ? 'Verify your LexiMind email'
        : 'Reset your LexiMind password';
    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization:
            'Bearer ' + this.config.getOrThrow<string>('EMAIL_API_KEY'),
          'Content-Type': 'application/json',
          'Idempotency-Key': 'account-action/' + digest,
        },
        body: JSON.stringify({
          from: this.config.getOrThrow<string>('EMAIL_FROM'),
          to: [email],
          subject,
          text:
            subject +
            '\n\n' +
            actionUrl.toString() +
            '\n\nIgnore this email if you did not request it.',
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
}
