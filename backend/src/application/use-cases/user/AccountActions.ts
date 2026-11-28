import { ConflictError } from '../../../domain/errors/ConflictError';
import { DomainError } from '../../../domain/errors/DomainError';
import type { RegistrationEmailProof } from '../../../domain/repositories/IUserRepository';
import { BadRequestError } from '../../../domain/errors/BadRequestError';
import type { IUserRepository } from '../../../domain/repositories/IUserRepository';
import type { IHashService } from '../../../domain/services/IHashService';
import type { ITokenService } from '../../../domain/services/ITokenService';
import { Email } from '../../../domain/value-objects/Email';
import { validatePassword } from '../../../domain/value-objects/PasswordPolicy';

export type AccountActionKind = 'verify_email' | 'reset_password';
export type AccountEmailKind = AccountActionKind | 'register';
export const maxEmailCodeAttempts = 5;

export interface RegistrationCode {
  email: string;
  tokenHash: string;
  codeHash: string;
  encryptedCode: string;
}
export interface AccountActionStore {
  issueRegistration(challenge: RegistrationCode): Promise<boolean>;
  issue(
    userId: string,
    email: string,
    kind: AccountActionKind,
    digest: string,
    expires: Date,
    encryptedToken: string,
    codeDigest: string,
  ): Promise<void>;
  consume(
    digest: string,
    kind: AccountActionKind,
    passwordHash?: string,
  ): Promise<boolean>;
  consumeCode(
    email: string,
    kind: AccountActionKind,
    codeDigest: string,
    hashPassword?: () => Promise<string>,
  ): Promise<boolean>;
}
export interface AccountActionMailer {
  ensureConfigured(): void;
  generateCode(): string;
  digestCode(
    email: string,
    kind: AccountEmailKind,
    code: string,
    binding?: string,
  ): string;
  seal(token: string, code: string): string;
}

export class AccountActions {
  constructor(
    private readonly users: IUserRepository,
    private readonly actions: AccountActionStore,
    private readonly mailer: AccountActionMailer,
    private readonly tokens: ITokenService,
    private readonly hashes: IHashService,
  ) {}

  async requestRegistration(
    email: string,
  ): Promise<{ registrationToken: string }> {
    const address = new Email(email).toString();
    if (await this.users.findByEmail(address)) {
      throw new ConflictError('An account with this email already exists.');
    }

    const registrationToken = this.tokens.generate();
    const code = this.mailer.generateCode();
    const proof = this.registrationProof(address, registrationToken, code);
    const issued = await this.actions.issueRegistration({
      email: address,
      ...proof,
      encryptedCode: this.mailer.seal('', code),
    });
    if (!issued) {
      throw new DomainError(
        'Wait before requesting another registration code.',
        'RATE_LIMITED',
      );
    }
    return { registrationToken };
  }

  registrationProof(
    email: string,
    token: string,
    code: string,
  ): RegistrationEmailProof {
    this.mailer.ensureConfigured();
    const tokenHash = this.tokens.digest(token);
    return {
      tokenHash,
      codeHash: this.mailer.digestCode(
        new Email(email).toString(),
        'register',
        code,
        tokenHash,
      ),
    };
  }

  async request(email: string, kind: AccountActionKind): Promise<void> {
    this.mailer.ensureConfigured();
    const account = await this.users.findByEmail(new Email(email).toString());
    if (!account?.id) return;
    const token = this.tokens.generate();
    const code = this.mailer.generateCode();
    const address = account.email.toString();
    const ttl = kind === 'verify_email' ? 60 * 60_000 : 20 * 60_000;
    await this.actions.issue(
      account.id,
      address,
      kind,
      this.tokens.digest(token),
      new Date(Date.now() + ttl),
      this.mailer.seal(token, code),
      this.mailer.digestCode(address, kind, code),
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

  async confirmCode(
    email: string,
    code: string,
    kind: AccountActionKind,
    password?: string,
  ) {
    this.mailer.ensureConfigured();
    if (kind === 'reset_password') validatePassword(password!);
    const address = new Email(email).toString();
    const digest = this.mailer.digestCode(address, kind, code);
    if (
      !(await this.actions.consumeCode(
        address,
        kind,
        digest,
        password === undefined ? undefined : () => this.hashes.hash(password),
      ))
    ) {
      throw new BadRequestError('Invalid or expired account action code.');
    }
  }
}
