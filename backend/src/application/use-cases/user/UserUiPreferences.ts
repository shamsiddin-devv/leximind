import { BadRequestError } from '../../../domain/errors/BadRequestError';
import type { IUserUiPreferenceRepository } from '../../../domain/repositories/IUserUiPreferenceRepository';
import type { Avatar } from '../../../domain/services/IAvatarStorage';
import type {
  AppearancePatch,
  UserUiPreferencePatch,
} from '../../../domain/value-objects/UserUiPreferences';

const jpegPrefix = 'data:image/jpeg;base64,';
const maxBannerBytes = 180 * 1024;
export const maxBannerLength =
  jpegPrefix.length + 4 * Math.ceil(maxBannerBytes / 3);

type PreferencesInput = Omit<UserUiPreferencePatch, 'appearance'> & {
  appearance?: AppearancePatch & { image?: string };
  initialize?: boolean;
};

export class UserUiPreferences {
  constructor(
    private readonly repository: IUserUiPreferenceRepository,
    private readonly uploadBanner: (image: string) => Promise<Avatar>,
  ) {}

  read(userId: string) {
    return this.repository.read(userId);
  }

  async update(
    userId: string,
    {
      appearance,
      notifications,
      interfaceSettings,
      initialize = false,
    }: PreferencesInput,
  ) {
    if (!appearance && !notifications && !interfaceSettings)
      throw new BadRequestError('No preferences supplied.');
    const { image, ...appearancePatch } = appearance ?? {};
    if (image && appearancePatch.banner)
      throw new BadRequestError('Select one banner source.');
    let uploadedImage: Avatar | undefined;

    if (image) {
      validateBanner(image);
      if (!initialize || !(await this.repository.read(userId)).appearance) {
        uploadedImage = await this.uploadBanner(image);
      }
    }

    return this.repository.update(
      userId,
      {
        appearance: appearance ? appearancePatch : undefined,
        notifications,
        interfaceSettings,
      },
      initialize,
      uploadedImage,
    );
  }
}

function validateBanner(image: string) {
  if (!image.startsWith(jpegPrefix) || image.length > maxBannerLength) {
    throw new BadRequestError('A JPEG banner up to 180 KiB is required.');
  }
  const encoded = image.slice(jpegPrefix.length);
  const bytes = Buffer.from(encoded, 'base64');
  if (
    bytes.length < 4 ||
    bytes.length > maxBannerBytes ||
    bytes.toString('base64') !== encoded ||
    bytes.readUInt16BE() !== 0xffd8 ||
    bytes.readUInt16BE(bytes.length - 2) !== 0xffd9
  ) {
    throw new BadRequestError('Invalid JPEG banner.');
  }
}
