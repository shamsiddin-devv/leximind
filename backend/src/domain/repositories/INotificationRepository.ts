export type NotificationType =
  | 'review'
  | 'daily'
  | 'streak'
  | 'achievements'
  | 'progress'
  | 'weekly'
  | 'news';

export interface NotificationData {
  count?: number;
  minutes?: number;
  words?: number;
  level?: string;
  achievementId?: string;
  slug?: string;
  title?: string;
  body?: string;
}

export interface UserNotification {
  id: string;
  type: NotificationType;
  data: NotificationData;
  createdAt: string;
  readAt: string | null;
}

export interface NotificationPage {
  data: UserNotification[];
  total: number;
  unreadCount: number;
}

export interface INotificationRepository {
  list(userId: string, page: number, limit: number): Promise<NotificationPage>;
  markRead(userId: string, id: string): Promise<void>;
  markAllRead(userId: string): Promise<void>;
}
