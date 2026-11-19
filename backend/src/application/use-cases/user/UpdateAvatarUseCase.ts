import type { IUserRepository } from '../../../domain/repositories/IUserRepository';
import type { IAvatarStorage } from '../../../domain/services/IAvatarStorage';
import { BadRequestError } from '../../../domain/errors/BadRequestError';

const jpegPrefix = 'data:image/jpeg;base64,';
const maxBytes = 65_536;
export const maxAvatarLength = jpegPrefix.length + 4 * Math.ceil(maxBytes / 3);

function validateImage(image: string): void {
  if (!image.startsWith(jpegPrefix) || image.length > maxAvatarLength) {
    throw new BadRequestError('A JPEG image up to 64 KB is required.');
  }

  const encoded = image.slice(jpegPrefix.length);
  const bytes = Buffer.from(encoded, 'base64');
  if (
    bytes.length < 4 ||
    bytes.length > maxBytes ||
    bytes.toString('base64') !== encoded ||
    bytes.readUInt16BE(0) !== 0xffd8 ||
    bytes.readUInt16BE(bytes.length - 2) !== 0xffd9
  ) {
    throw new BadRequestError('Invalid JPEG image.');
  }
}

export class UpdateAvatarUseCase {
  constructor(
    private readonly users: IUserRepository,
    private readonly storage: IAvatarStorage,
  ) {}

  async execute(id: string, image: string | null) {
    if (image !== null) validateImage(image);
    const next = image === null ? null : await this.storage.upload(image);
    let previousId: string | undefined;

    const user = await this.users
      .edit(id, (current) => {
        previousId = current.avatar?.publicId;
        current.setAvatar(next);
      })
      .catch(async (error: unknown) => {
        if (next) await this.storage.remove(next.publicId);
        throw error;
      });

    if (previousId) await this.storage.remove(previousId);
    return user;
  }
}
