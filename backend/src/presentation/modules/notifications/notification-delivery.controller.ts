import {
  Body,
  Controller,
  Delete,
  Get,
  Header,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { BadRequestError } from '../../../domain/errors/BadRequestError';
import { UnavailableError } from '../../../domain/errors/UnavailableError';
import type { Identity } from '../../../domain/repositories/IAuthRepository';
import { NotificationPushSubscriptions } from '../../../infrastructure/notifications/NotificationPushSubscriptions';
import { NotificationTransport } from '../../../infrastructure/notifications/NotificationTransport';
import {
  normalizePushSubscription,
  type BrowserPushSubscription,
} from '../../../infrastructure/notifications/push-configuration';
import { CurrentUser } from '../../security';
import { PushSubscriptionDto } from './notification-delivery.dto';

@Controller('notifications')
@ApiTags('Notification delivery')
export class NotificationDeliveryController {
  constructor(
    private readonly subscriptions: NotificationPushSubscriptions,
    private readonly transport: NotificationTransport,
  ) {}

  @Get('delivery')
  @Header('Cache-Control', 'no-store')
  async capabilities(@CurrentUser() user: Identity) {
    return {
      ...this.transport.capabilities(),
      deviceIds: await this.subscriptions.listDeviceIds(user),
    };
  }

  @Post('push-subscriptions')
  @Throttle({ default: { limit: 15, ttl: 60_000 } })
  register(@CurrentUser() user: Identity, @Body() body: PushSubscriptionDto) {
    if (!this.transport.capabilities().pushPublicKey)
      throw new UnavailableError('Push delivery is unavailable.');
    let subscription: BrowserPushSubscription;
    try {
      subscription = normalizePushSubscription(body);
    } catch {
      throw new BadRequestError('Invalid browser push subscription.');
    }
    return this.subscriptions.register(user, subscription);
  }

  @Delete('push-subscriptions/:id')
  @HttpCode(204)
  async remove(
    @CurrentUser() user: Identity,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    await this.subscriptions.remove(user.id, id);
  }
}
