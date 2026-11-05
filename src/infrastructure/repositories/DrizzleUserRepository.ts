import { IUserRepository } from 'src/domain/repositories/IUserRepository';
import { DRIZZLE } from '../db/drizzle/drizzle.provider';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { relations } from '../db/drizzle/drizzle.relations';
import { User } from 'src/domain/entities/User';
import { Inject } from '@nestjs/common';
import { users } from '../db/drizzle/drizzle.schema';
import { eq } from 'drizzle-orm';

export class DrizzleUserRepository implements IUserRepository {
  constructor(
    @Inject(DRIZZLE) private readonly db: NodePgDatabase<typeof relations>,
  ) {}

  async findById(id: string): Promise<User | null> {
    const row = await this.db.query.users.findFirst({ where: { id } });
    return this.toDomain(row);
  }

  async findByEmail(email: string): Promise<User | null> {
    const row = await this.db.query.users.findFirst({ where: { email } });
    return this.toDomain(row);
  }

  async findPasswordHashByUserId(id: string): Promise<string | null> {
    const [row] = await this.db.select({passwordHash: users.passwordHash}).from(users).where(eq(users.id, id));
    return row.passwordHash;
  };

  async findAll(): Promise<void> {
    await this.db.select().from(users);
  };

  async create(data: User): Promise<User | null> {
    const row = await this.db.insert(users).values(this.toPersistence(data));
    return this.toDomain(row);
  };

  async updateHashPassword(id: string, hashPassword: string): Promise<void> {
    await this.db.update(users).set({passwordHash: hashPassword}).where(eq(users.id, id));
  };

  async update(id: string, data: User): Promise<User> {
    const row = await this.db.update(users).set(this.toPersistence(data)).where(eq(users.id, id));
    return this.toDomain(row);
  };

  async delete(id: string): Promise<void> {
    await this.db.delete(users).where(eq(users.id, id));
  };

  private toDomain(row): User {
    return new User({
      id: row.id,
      fullName: row.fullName,
      email: row.email,
      createdAt: row.createdAt,
    });
  }

  private toPersistence(row: User): any {
    return {
      id: row.id,
      fullName: row.fullName,
      email: row.email,
      createdAt: row.createdAt,
    };
  }
}
