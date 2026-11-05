import { User } from "../entities/User";

export interface IUserRepository {
  findById(id: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>
  findAll(): Promise<void>;
  findPasswordHashByUserId(id: string): Promise<string | null>;
  updateHashPassword(id: string, hashPassword: string): Promise<void>;
  create(data: User, passwordHash: string): Promise<User | null>;
  update(id: string, data: User): Promise<User>;
  delete(id: string): Promise<void>
};