import { Module } from '@nestjs/common';
import { UserNotifications } from '../../../application/use-cases/user/UserNotifications';
import { LearningNotificationRepository } from '../../../infrastructure/repositories/LearningNotificationRepository';
import { LearningNotificationWorker } from '../../../infrastructure/repositories/LearningNotificationWorker';
import { NotificationRepository } from '../../../infrastructure/repositories/NotificationRepository';
import { NotificationsController } from './notifications.controller';

@Module({
  controllers: [NotificationsController],
  providers: [
    NotificationRepository,
    LearningNotificationRepository,
    LearningNotificationWorker,
    {
      provide: UserNotifications,
      useFactory: (repository: NotificationRepository) =>
        new UserNotifications(repository),
      inject: [NotificationRepository],
    },
  ],
})
export class NotificationsModule {}
