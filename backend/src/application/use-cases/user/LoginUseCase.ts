import { IUserRepository } from '../../../domain/repositories/IUserRepository';
import { IAuthRepository } from '../../../domain/repositories/IAuthRepository';
import { IHashService } from '../../../domain/services/IHashService';
import { ITokenService } from '../../../domain/services/ITokenService';
import { UnauthorizedError } from '../../../domain/errors/UnauthorizedError';
import { Email } from '../../../domain/value-objects/Email';
export class LoginUseCase {
  constructor(
    private readonly users: IUserRepository,
    private readonly sessions: IAuthRepository,
    private readonly hash: IHashService,
    private readonly tokens: ITokenService,
    private readonly ttlSeconds: number,
    private readonly dummyHash: string,
  ) {}
  async execute(email: string, password: string, userAgent?: string) {
    const user = await this.users.findByEmail(new Email(email).toString());
    const stored = user?.id
      ? await this.users.findPasswordHashByUserId(user.id)
      : null;
    const valid = await this.hash.compare(password, stored ?? this.dummyHash);
    if (!user?.id || !stored || !valid)
      throw new UnauthorizedError('Invalid email or password.');
    const accessToken = this.tokens.generate(),
      expiresAt = new Date(Date.now() + this.ttlSeconds * 1000);
    const created = await this.sessions.create(
      user.id,
      this.tokens.digest(accessToken),
      expiresAt,
      stored,
      userAgent,
    );
    if (!created)
      throw new UnauthorizedError('Credentials changed; sign in again.');
    return { accessToken, tokenType: 'Bearer', expiresAt };
  }
}
