import { IHashService } from "src/domain/services/IHashService";
import * as bcrypt from 'bcrypt';

export class BcryptHash implements IHashService {
  hash(plainText: string): Promise<string> {
    return bcrypt.hash(plainText, 10);
  };

  compare(plainText: string, hashedText: string): Promise<boolean> {
    return bcrypt.compare(plainText, hashedText);
  };
};