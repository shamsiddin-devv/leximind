import type { Avatar } from '../services/IAvatarStorage';
import type {
  PublicProfileCover,
  UserUiPreferences,
  UserUiPreferencePatch,
} from '../value-objects/UserUiPreferences';

export interface IUserUiPreferenceRepository {
  read(userId: string): Promise<UserUiPreferences>;
  publicCover(userId: string): Promise<PublicProfileCover | undefined>;
  update(
    userId: string,
    patch: UserUiPreferencePatch,
    initialize: boolean,
    uploadedImage?: Avatar,
  ): Promise<UserUiPreferences>;
}
