import { IHashService } from '../../domain/services/IHashService';
import * as bcrypt from 'bcrypt';

export class BcryptHash implements IHashService {
  hash(plainText: string): Promise<string> {
    return bcrypt.hash(plainText, 12);
  }

  compare(plainText: string, hashedText: string): Promise<boolean> {
    if (Buffer.byteLength(plainText, 'utf8') > 72)
      return Promise.resolve(false);
    return bcrypt.compare(plainText, hashedText);
  }
}
