import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'node:crypto';
import { UnavailableError } from '../../domain/errors/UnavailableError';
import type { IAvatarStorage } from '../../domain/services/IAvatarStorage';

@Injectable()
export class CloudinaryAvatarStorage implements IAvatarStorage {
  private readonly logger = new Logger(CloudinaryAvatarStorage.name);

  constructor(private readonly config: ConfigService) {}

  async upload(image: string) {
    const folder = 'LexiMind';
    const name = randomUUID();
    const publicId = folder + '/' + name;
    const form = new FormData();
    form.set('file', image);
    form.set('folder', folder);
    form.set('public_id', name);
    form.set('overwrite', 'false');
    form.set('allowed_formats', 'jpg,jpeg');
    form.set('transformation', 'c_limit,h_256,w_256');
    const response = await this.request('upload', form).catch(
      async (error: unknown) => {
        if (this.config.get<string>('CLOUDINARY_CLOUD_NAME'))
          await this.remove(publicId);
        throw error;
      },
    );
    const payload = (await response.json().catch(() => null)) as {
      secure_url?: unknown;
      public_id?: unknown;
    } | null;
    if (
      !payload ||
      payload.public_id !== publicId ||
      typeof payload.secure_url !== 'string' ||
      !payload.secure_url.startsWith('https://res.cloudinary.com/')
    ) {
      await this.remove(publicId);
      throw new UnavailableError(
        'Avatar storage returned an invalid response.',
      );
    }
    return { url: payload.secure_url, publicId };
  }

  async remove(publicId: string) {
    const form = new FormData();
    form.set('public_id', publicId);
    form.set('invalidate', 'true');
    try {
      await this.request('destroy', form);
    } catch {
      this.logger.warn('Avatar removal failed in Cloudinary.');
    }
  }

  private async request(action: 'upload' | 'destroy', body: FormData) {
    const cloud = this.config.get<string>('CLOUDINARY_CLOUD_NAME');
    const key = this.config.get<string>('CLOUDINARY_API_KEY');
    const secret = this.config.get<string>('CLOUDINARY_API_SECRET');
    if (!cloud || !key || !secret) {
      throw new UnavailableError('Avatar storage is not configured.');
    }

    const credentials = Buffer.from(key + ':' + secret).toString('base64');
    const endpoint =
      'https://api.cloudinary.com/v1_1/' +
      encodeURIComponent(cloud) +
      '/image/' +
      action;
    const result = await fetch(endpoint, {
      method: 'POST',
      headers: { Authorization: 'Basic ' + credentials },
      body,
      signal: AbortSignal.timeout(8_000),
      redirect: 'error',
    }).catch(() => {
      throw new UnavailableError('Avatar storage could not be reached.');
    });
    if (!result.ok) {
      this.logger.warn(
        'Cloudinary image request failed with status ' + result.status,
      );
      throw new UnavailableError(
        'Avatar storage could not complete the request.',
      );
    }
    return result;
  }
}
