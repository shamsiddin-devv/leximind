import { Module } from '@nestjs/common';
import { RateLimitStorage } from '../../../infrastructure/auth/RateLimitStorage';
import { NotificationDeliveryRepository } from '../../../infrastructure/notifications/NotificationDeliveryRepository';
import { NotificationDeliveryWorker } from '../../../infrastructure/notifications/NotificationDeliveryWorker';
import { NotificationPushSubscriptions } from '../../../infrastructure/notifications/NotificationPushSubscriptions';
import { NotificationTransport } from '../../../infrastructure/notifications/NotificationTransport';
import { NotificationDeliveryController } from './notification-delivery.controller';

@Module({
  controllers: [NotificationDeliveryController],
  providers: [
    NotificationDeliveryRepository,
    NotificationDeliveryWorker,
    NotificationPushSubscriptions,
    NotificationTransport,
    RateLimitStorage,
  ],
})
export class NotificationDeliveryModule {}
