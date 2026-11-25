import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpException,
  HttpStatus,
  Inject,
  Post,
  UnauthorizedException,
} from '@nestjs/common';
import type { Update } from 'grammy/types';
import { SkipThrottle, Throttle } from '@nestjs/throttler';
import { IsString, Matches } from 'class-validator';
import { timingSafeEqual } from 'node:crypto';
import { VerifyProfilePhone } from '../../../application/use-cases/user/VerifyProfilePhone';
import { GetUserByIdUseCase } from '../../../application/use-cases/user/GetUserByIdUseCase';
import { uzbekPhoneNumberPattern } from '../../../domain/entities/User';
import type { Identity } from '../../../domain/repositories/IAuthRepository';
import { CurrentUser, Public } from '../../security';
import { ownUserView } from '../../serializers';
import { TelegramPhoneBot } from '../../../infrastructure/auth/TelegramPhoneBot';

class PhoneRequestDto {
  @IsString() @Matches(uzbekPhoneNumberPattern) phoneNumber!: string;
}

class PhoneCodeDto {
  @IsString() @Matches(/^[0-9]{6}$/) code!: string;
}

@Controller('users/me/phone-verification')
export class PhoneVerificationController {
  constructor(
    private readonly verification: VerifyProfilePhone,
    private readonly users: GetUserByIdUseCase,
  ) {}

  @Get()
  status() {
    return { available: this.verification.available };
  }

  @Post('request')
  @HttpCode(200)
  @Throttle({ default: { limit: 8, ttl: 60_000 } })
  async request(@CurrentUser() user: Identity, @Body() body: PhoneRequestDto) {
    const result = await this.verification.start(user.id, body.phoneNumber);
    if (!result)
      throw new HttpException(
        'Please wait before requesting a new code.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    return result;
  }

  @Post('confirm')
  @HttpCode(200)
  @Throttle({ default: { limit: 12, ttl: 60_000 } })
  async confirm(@CurrentUser() user: Identity, @Body() body: PhoneCodeDto) {
    await this.verification.confirm(user.id, body.code);
    return ownUserView(await this.users.execute(user.id));
  }
}

@Controller('telegram/phone-verification')
export class TelegramPhoneWebhookController {
  private readonly receive?: (update: Update) => Promise<void>;

  constructor(
    verification: VerifyProfilePhone,
    @Inject(TelegramPhoneBot) private readonly bot: TelegramPhoneBot | null,
  ) {
    this.receive = bot?.createHandler(verification);
  }

  @Public()
  @SkipThrottle()
  @Post()
  @HttpCode(200)
  async update(
    @Headers('x-telegram-bot-api-secret-token') received: string | undefined,
    @Body() body: Update | undefined,
  ) {
    const expected = Buffer.from(this.bot?.webhookSecret ?? '');
    const secret = Buffer.from(received ?? '');
    if (
      !this.receive ||
      expected.length !== secret.length ||
      !timingSafeEqual(expected, secret)
    )
      throw new UnauthorizedException();

    if (body && Number.isSafeInteger(body.update_id)) await this.receive(body);
    return { ok: true };
  }
}
