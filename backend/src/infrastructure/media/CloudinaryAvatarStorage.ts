import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'node:crypto';
import { UnavailableError } from '../../domain/errors/UnavailableError';
import type { IAvatarStorage } from '../../domain/services/IAvatarStorage';
import { AvatarCleanupQueue } from './AvatarCleanupQueue';

@Injectable()
export class CloudinaryAvatarStorage implements IAvatarStorage {
  private readonly logger = new Logger(CloudinaryAvatarStorage.name);

  constructor(
    private readonly config: ConfigService,
    private readonly cleanup: AvatarCleanupQueue,
  ) {}

  isConfigured() {
    return Boolean(
      this.config.get('CLOUDINARY_CLOUD_NAME') &&
      this.config.get('CLOUDINARY_API_KEY') &&
      this.config.get('CLOUDINARY_API_SECRET'),
    );
  }

  upload(image: string) {
    return this.uploadImage(image, 'LexiMind', 'c_limit,h_256,w_256');
  }

  uploadBanner(image: string) {
    return this.uploadImage(image, 'LexiMind/banners', 'c_limit,h_1620,w_1620');
  }

  private async uploadImage(
    image: string,
    folder: string,
    transformation: string,
  ) {
    const name = randomUUID();
    const publicId = folder + '/' + name;
    if (!this.isConfigured()) {
      throw new UnavailableError('Image storage is not configured.');
    }
    await this.cleanup.reserve(publicId);
    const form = new FormData();
    form.set('file', image);
    form.set('folder', folder);
    form.set('public_id', name);
    form.set('overwrite', 'false');
    form.set('allowed_formats', 'jpg,jpeg');
    form.set('transformation', transformation);
    const response = await this.request('upload', form);
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
      throw new UnavailableError('Image storage returned an invalid response.');
    }
    return { url: payload.secure_url, publicId };
  }

  async remove(publicId: string) {
    const form = new FormData();
    form.set('public_id', publicId);
    form.set('invalidate', 'true');
    const response = await this.request('destroy', form);
    const payload = (await response.json().catch(() => null)) as {
      result?: unknown;
    } | null;
    if (payload?.result !== 'ok' && payload?.result !== 'not found') {
      throw new UnavailableError('Image storage returned an invalid response.');
    }
  }

  private async request(action: 'upload' | 'destroy', body: FormData) {
    const cloud = this.config.get<string>('CLOUDINARY_CLOUD_NAME');
    const key = this.config.get<string>('CLOUDINARY_API_KEY');
    const secret = this.config.get<string>('CLOUDINARY_API_SECRET');
    if (!cloud || !key || !secret) {
      throw new UnavailableError('Image storage is not configured.');
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
      throw new UnavailableError('Image storage could not be reached.');
    });
    if (!result.ok) {
      this.logger.warn(
        'Cloudinary image request failed with status ' + result.status,
      );
      throw new UnavailableError(
        'Image storage could not complete the request.',
      );
    }
    return result;
  }
}
