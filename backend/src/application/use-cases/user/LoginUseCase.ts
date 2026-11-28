import { IUserRepository } from '../../../domain/repositories/IUserRepository';
import { IAuthRepository } from '../../../domain/repositories/IAuthRepository';
import { IHashService } from '../../../domain/services/IHashService';
import { ITokenService } from '../../../domain/services/ITokenService';
import { UnauthorizedError } from '../../../domain/errors/UnauthorizedError';
import { Email } from '../../../domain/value-objects/Email';
const rememberedSessionMs = 30 * 24 * 60 * 60 * 1000;
const maxAccessSeconds = 60 * 60;
export class LoginUseCase {
  constructor(
    private readonly users: IUserRepository,
    private readonly sessions: IAuthRepository,
    private readonly hash: IHashService,
    private readonly tokens: ITokenService,
    private readonly ttlSeconds: number,
    private readonly dummyHash: string,
  ) {}
  async execute(
    email: string,
    password: string,
    userAgent?: string,
    rememberSession = false,
  ) {
    const user = await this.users.findByEmail(new Email(email).toString());
    const stored = user?.id
      ? await this.users.findPasswordHashByUserId(user.id)
      : null;
    const valid = await this.hash.compare(password, stored ?? this.dummyHash);
    if (!user?.id || !stored || !valid)
      throw new UnauthorizedError('Invalid email or password.');
    const accessToken = this.tokens.generate();
    const now = Date.now();
    const expiresAt = new Date(
      now +
        (rememberSession
          ? Math.min(this.ttlSeconds, maxAccessSeconds)
          : this.ttlSeconds) *
          1000,
    );
    const refreshToken = rememberSession ? this.tokens.generate() : undefined;
    const refreshExpiresAt = new Date(now + rememberedSessionMs);
    const sessionId = await this.sessions.create(
      user.id,
      this.tokens.digest(accessToken),
      refreshToken ? refreshExpiresAt : expiresAt,
      stored,
      userAgent,
      refreshToken
        ? {
            tokenHash: this.tokens.digest(refreshToken),
            accessExpiresAt: expiresAt,
          }
        : undefined,
    );
    if (!sessionId)
      throw new UnauthorizedError('Credentials changed; sign in again.');
    return {
      accessToken,
      tokenType: 'Bearer',
      expiresAt,
      ...(refreshToken && { sessionId, refreshToken, refreshExpiresAt }),
    };
  }

  async refresh(currentToken: string) {
    const accessToken = this.tokens.generate();
    const refreshToken = this.tokens.generate();
    const session = await this.sessions.rotateRefresh(
      this.tokens.digest(currentToken),
      this.tokens.digest(accessToken),
      {
        tokenHash: this.tokens.digest(refreshToken),
        accessExpiresAt: new Date(
          Date.now() + Math.min(this.ttlSeconds, maxAccessSeconds) * 1000,
        ),
      },
    );
    if (!session) throw new UnauthorizedError('Session invalid or expired.');
    return {
      accessToken,
      tokenType: 'Bearer',
      expiresAt: session.accessExpiresAt,
      sessionId: session.id,
      refreshToken,
      refreshExpiresAt: session.expiresAt,
    };
  }
}
