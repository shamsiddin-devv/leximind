import { Inject, Injectable } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { NotFoundError } from '../../domain/errors/NotFoundError';
import { UnavailableError } from '../../domain/errors/UnavailableError';
import type { IUserUiPreferenceRepository } from '../../domain/repositories/IUserUiPreferenceRepository';
import type { Avatar } from '../../domain/services/IAvatarStorage';
import {
  defaultInterfaceSettings,
  defaultNotifications,
  defaultProfileAppearance,
  type UserUiPreferencePatch,
} from '../../domain/value-objects/UserUiPreferences';
import { DRIZZLE } from '../db/drizzle/drizzle.provider';
import type { relations } from '../db/drizzle/drizzle.relations';
import {
  avatarCleanupJobs,
  users,
  userUiPreferences,
} from '../db/drizzle/drizzle.schema';

@Injectable()
export class DrizzleUserUiPreferenceRepository implements IUserUiPreferenceRepository {
  constructor(
    @Inject(DRIZZLE) private readonly db: NodePgDatabase<typeof relations>,
  ) {}

  async read(userId: string) {
    const [saved] = await this.db
      .select({
        appearance: userUiPreferences.appearance,
        notifications: userUiPreferences.notifications,
        interfaceSettings: userUiPreferences.interfaceSettings,
      })
      .from(userUiPreferences)
      .where(eq(userUiPreferences.userId, userId));
    return (
      saved ?? {
        appearance: null,
        notifications: null,
        interfaceSettings: null,
      }
    );
  }

  async publicCover(userId: string) {
    const [saved] = await this.db
      .select({ appearance: userUiPreferences.appearance })
      .from(userUiPreferences)
      .where(eq(userUiPreferences.userId, userId));
    if (!saved?.appearance) return;
    const { banner, position, height, overlay } = saved.appearance;
    return { banner, position, height, overlay };
  }

  update(
    userId: string,
    patch: UserUiPreferencePatch,
    initialize: boolean,
    uploadedImage?: Avatar,
  ) {
    return this.db.transaction(async (tx) => {
      const [user] = await tx
        .select({ id: users.id })
        .from(users)
        .where(eq(users.id, userId))
        .for('update');
      if (!user) throw new NotFoundError('Account is unavailable.');
      const [current] = await tx
        .select()
        .from(userUiPreferences)
        .where(eq(userUiPreferences.userId, userId));

      let appearance = current?.appearance ?? null;
      let notifications = current?.notifications ?? null;
      let interfaceSettings = current?.interfaceSettings ?? null;
      let bannerPublicId = current?.bannerPublicId ?? null;
      if (patch.appearance && (!initialize || !appearance)) {
        const previous = appearance ?? defaultProfileAppearance;
        appearance = {
          ...previous,
          ...patch.appearance,
          content: { ...previous.content, ...patch.appearance.content },
        };
        if (uploadedImage || patch.appearance.banner) {
          if (bannerPublicId) {
            await tx
              .insert(avatarCleanupJobs)
              .values({ publicId: bannerPublicId })
              .onConflictDoNothing();
          }
          bannerPublicId = uploadedImage?.publicId ?? null;
          if (uploadedImage) {
            const [reservation] = await tx
              .delete(avatarCleanupJobs)
              .where(
                and(
                  eq(avatarCleanupJobs.publicId, uploadedImage.publicId),
                  eq(avatarCleanupJobs.attempts, 0),
                ),
              )
              .returning({ publicId: avatarCleanupJobs.publicId });
            if (!reservation)
              throw new UnavailableError(
                'Banner upload could not be finalized.',
              );
            appearance.banner = uploadedImage.url;
          }
        }
      }
      if (patch.notifications && (!initialize || !notifications)) {
        notifications = {
          ...(notifications ?? defaultNotifications),
          ...patch.notifications,
        };
      }

      if (patch.interfaceSettings && (!initialize || !interfaceSettings)) {
        const previous = interfaceSettings ?? defaultInterfaceSettings;
        interfaceSettings = {
          ...previous,
          ...patch.interfaceSettings,
          appearance: {
            ...previous.appearance,
            ...patch.interfaceSettings.appearance,
          },
        };
      }

      const next = {
        appearance,
        notifications,
        interfaceSettings,
        bannerPublicId,
      };
      await tx
        .insert(userUiPreferences)
        .values({ userId, ...next })
        .onConflictDoUpdate({
          target: userUiPreferences.userId,
          set: next,
        });
      return { appearance, notifications, interfaceSettings };
    });
  }
}
