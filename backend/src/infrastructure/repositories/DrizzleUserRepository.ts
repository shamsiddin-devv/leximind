import { Inject, Injectable } from '@nestjs/common';
import { and, asc, count, eq, sql } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { IUserRepository } from '../../domain/repositories/IUserRepository';
import { User } from '../../domain/entities/User';
import { Email } from '../../domain/value-objects/Email';
import { NotFoundError } from '../../domain/errors/NotFoundError';
import { DRIZZLE } from '../db/drizzle/drizzle.provider';
import { relations } from '../db/drizzle/drizzle.relations';
import { users, learnerProfiles } from '../db/drizzle/drizzle.schema';
@Injectable()
export class DrizzleUserRepository implements IUserRepository {
  constructor(
    @Inject(DRIZZLE) private readonly db: NodePgDatabase<typeof relations>,
  ) {}
  async findById(id: string) {
    const [r] = await this.db.select().from(users).where(eq(users.id, id));
    return r ? this.toDomain(r) : null;
  }
  async findByEmail(email: string) {
    const [r] = await this.db
      .select()
      .from(users)
      .where(eq(users.email, email.trim().toLowerCase()));
    return r ? this.toDomain(r) : null;
  }
  async findPasswordHashByUserId(id: string) {
    const [r] = await this.db
      .select({ hash: users.passwordHash })
      .from(users)
      .where(eq(users.id, id));
    return r?.hash ?? null;
  }
  async findAll(page = 1, limit = 20) {
    const rows = await this.db
      .select()
      .from(users)
      .orderBy(asc(users.id))
      .limit(limit)
      .offset((page - 1) * limit);
    const [c] = await this.db.select({ total: count() }).from(users);
    return {
      data: rows.map((r) => this.toDomain(r)),
      total: c.total,
      page,
      limit,
    };
  }
  async create(data: User, passwordHash: string) {
    return this.db.transaction(async (tx) => {
      const [r] = await tx
        .insert(users)
        .values({
          fullName: data.fullName.trim(),
          email: data.email.toString(),
          passwordHash,
        })
        .returning();
      await tx.insert(learnerProfiles).values({
        userId: r.id,
        level: 'A1',
        timezone: 'UTC',
        streakDay: 0,
        dailyNewWords: 10,
        xpMultiplier: 1,
      });
      return this.toDomain(r);
    });
  }
  async updateHashPassword(
    id: string,
    passwordHash: string,
    expectedHash: string,
  ) {
    return this.db.transaction(async (tx) => {
      const changed = await tx
        .update(users)
        .set({ passwordHash })
        .where(and(eq(users.id, id), eq(users.passwordHash, expectedHash)))
        .returning({ id: users.id });
      if (!changed.length) return false;
      await tx.execute(sql`DELETE FROM auth_sessions WHERE user_id = ${id}`);
      await tx.execute(
        sql`DELETE FROM account_actions WHERE user_id = ${id} AND kind='reset_password'`,
      );
      return true;
    });
  }
  edit(id: string, change: (current: User) => void) {
    return this.db.transaction(async (tx) => {
      const [row] = await tx
        .select()
        .from(users)
        .where(eq(users.id, id))
        .for('update');
      if (!row) throw new NotFoundError('User not found.');
      const user = this.toDomain(row);
      change(user);
      const emailChanged = row.email !== user.email.toString();
      if (
        row.fullName === user.fullName.trim() &&
        row.email === user.email.toString()
      )
        return user;
      const [updated] = await tx
        .update(users)
        .set({
          fullName: user.fullName.trim(),
          email: user.email.toString(),
          emailVerifiedAt: emailChanged ? null : row.emailVerifiedAt,
        })
        .where(eq(users.id, id))
        .returning();
      if (emailChanged) {
        await tx.execute(
          sql`DELETE FROM account_actions WHERE user_id = ${id}`,
        );
      }
      return this.toDomain(updated);
    });
  }
  async delete(id: string) {
    await this.db.delete(users).where(eq(users.id, id));
  }
  private toDomain(r: typeof users.$inferSelect) {
    return new User({
      id: r.id,
      fullName: r.fullName,
      email: new Email(r.email),
      createdAt: r.createdAt,
      emailVerifiedAt: r.emailVerifiedAt,
    });
  }
}
