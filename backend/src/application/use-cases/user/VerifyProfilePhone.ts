import {
  createHash,
  createHmac,
  randomBytes,
  timingSafeEqual,
} from 'node:crypto';
import { BadRequestError } from '../../../domain/errors/BadRequestError';
import { UnavailableError } from '../../../domain/errors/UnavailableError';

export interface PhoneChallengeStore {
  start(userId: string, phone: string, startHash: string): Promise<boolean>;
  link(startHash: string, chatId: number, updateId: number): Promise<boolean>;
  acceptContact(
    chatId: number,
    phone: string,
    updateId: number,
  ): Promise<string | null>;
  confirm(
    userId: string,
    isCorrect: (startHash: string) => boolean,
  ): Promise<boolean>;
}

export interface PhoneVerificationConfig {
  username: string;
  webhookSecret: string;
}

export class VerifyProfilePhone {
  constructor(
    private readonly challenges: PhoneChallengeStore,
    private readonly bot: PhoneVerificationConfig | null,
  ) {}

  get available() {
    return Boolean(this.bot);
  }

  async start(userId: string, phone: string) {
    const bot = this.requiredBot();
    const startToken = 'phone_' + randomBytes(24).toString('base64url');
    if (!(await this.challenges.start(userId, phone, this.hash(startToken))))
      return null;
    return { url: 'https://t.me/' + bot.username + '?start=' + startToken };
  }

  linkTelegram(startToken: string, chatId: number, updateId: number) {
    if (!/^phone_[A-Za-z0-9_-]{32}$/.test(startToken)) return false;
    return this.challenges.link(this.hash(startToken), chatId, updateId);
  }

  async codeForContact(phone: string, chatId: number, updateId: number) {
    const startHash = await this.challenges.acceptContact(
      chatId,
      '+' + phone.replace(/[^0-9]/g, ''),
      updateId,
    );
    return startHash ? this.code(startHash) : null;
  }

  async confirm(userId: string, code: string) {
    this.requiredBot();
    const valid =
      /^[0-9]{6}$/.test(code) &&
      (await this.challenges.confirm(userId, (startHash) =>
        timingSafeEqual(Buffer.from(this.code(startHash)), Buffer.from(code)),
      ));
    if (!valid)
      throw new BadRequestError(
        'Phone code is invalid, expired or not yet issued.',
      );
  }

  private hash(value: string) {
    return createHash('sha256').update(value).digest('hex');
  }

  private code(startHash: string) {
    const secret = this.requiredBot().webhookSecret;
    const value = createHmac('sha256', secret)
      .update('leximind-phone-otp:' + startHash)
      .digest()
      .readUInt32BE();
    return String(value % 1_000_000).padStart(6, '0');
  }

  private requiredBot() {
    if (!this.bot)
      throw new UnavailableError(
        'Telegram phone verification is not configured.',
      );
    return this.bot;
  }
}
