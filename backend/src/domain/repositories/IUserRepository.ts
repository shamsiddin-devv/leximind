import { User } from '../entities/User';

export interface IUserRepository {
  findById(id: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  findAll(
    page?: number,
    limit?: number,
  ): Promise<{ data: User[]; total: number; page: number; limit: number }>;
  findPasswordHashByUserId(id: string): Promise<string | null>;
  updateHashPassword(
    id: string,
    hashPassword: string,
    expectedHash: string,
  ): Promise<boolean>;
  create(data: User, passwordHash: string): Promise<User>;
  edit(
    id: string,
    change: (current: User, passwordHash: string) => void | Promise<void>,
  ): Promise<User>;
  delete(id: string, expectedHash: string): Promise<{ avatarPublicId: string | null } | null>;
}
