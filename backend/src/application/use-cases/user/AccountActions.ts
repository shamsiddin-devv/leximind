import { BadRequestError } from '../../../domain/errors/BadRequestError';
import type { IUserRepository } from '../../../domain/repositories/IUserRepository';
import type { IHashService } from '../../../domain/services/IHashService';
import type { ITokenService } from '../../../domain/services/ITokenService';
import { Email } from '../../../domain/value-objects/Email';
import { validatePassword } from '../../../domain/value-objects/PasswordPolicy';

export type AccountActionKind = 'verify_email' | 'reset_password';
export interface AccountActionStore {
  issue(
    userId: string,
    email: string,
    kind: AccountActionKind,
    digest: string,
    expires: Date,
    encryptedToken: string,
  ): Promise<void>;
  consume(
    digest: string,
    kind: AccountActionKind,
    passwordHash?: string,
  ): Promise<boolean>;
}
export interface AccountActionMailer {
  ensureConfigured(): void;
  seal(token: string): string;
}

export class AccountActions {
  constructor(
    private readonly users: IUserRepository,
    private readonly actions: AccountActionStore,
    private readonly mailer: AccountActionMailer,
    private readonly tokens: ITokenService,
    private readonly hashes: IHashService,
  ) {}

  async request(email: string, kind: AccountActionKind): Promise<void> {
    this.mailer.ensureConfigured();
    const account = await this.users.findByEmail(new Email(email).toString());
    if (!account?.id) return;
    const token = this.tokens.generate();
    const ttl = kind === 'verify_email' ? 60 * 60_000 : 20 * 60_000;
    await this.actions.issue(
      account.id,
      account.email.toString(),
      kind,
      this.tokens.digest(token),
      new Date(Date.now() + ttl),
      this.mailer.seal(token),
    );
  }

  async confirm(
    token: string,
    kind: AccountActionKind,
    password?: string,
  ): Promise<void> {
    if (kind === 'reset_password') validatePassword(password!);
    const hash =
      password === undefined ? undefined : await this.hashes.hash(password);
    if (!(await this.actions.consume(this.tokens.digest(token), kind, hash))) {
      throw new BadRequestError('Invalid or expired account action.');
    }
  }
}
