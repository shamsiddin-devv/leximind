import type { INotificationRepository } from '../../../domain/repositories/INotificationRepository';

export class UserNotifications {
  constructor(private readonly repository: INotificationRepository) {}

  list(userId: string, page: number, limit: number) {
    return this.repository.list(userId, page, limit);
  }

  markRead(userId: string, id: string) {
    return this.repository.markRead(userId, id);
  }

  markAllRead(userId: string) {
    return this.repository.markAllRead(userId);
  }
}
