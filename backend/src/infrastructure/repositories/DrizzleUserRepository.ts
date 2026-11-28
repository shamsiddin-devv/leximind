import { timingSafeEqual } from 'node:crypto';
import { maxEmailCodeAttempts } from '../../application/use-cases/user/AccountActions';
import { Inject, Injectable } from '@nestjs/common';
import { and, asc, count, eq, sql } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import type {
  InitialLearningPreferences,
  IUserRepository,
  RegistrationEmailProof,
} from '../../domain/repositories/IUserRepository';
import { User } from '../../domain/entities/User';
import { referralRewardXp } from '../../domain/repositories/IReferralRepository';
import { Email } from '../../domain/value-objects/Email';
import { socialPlatforms } from '../../domain/value-objects/ProfileSocialLinks';
import { NotFoundError } from '../../domain/errors/NotFoundError';
import { UnavailableError } from '../../domain/errors/UnavailableError';
import { DRIZZLE } from '../db/drizzle/drizzle.provider';
import { relations } from '../db/drizzle/drizzle.relations';
import {
  accountActions,
  avatarCleanupJobs,
  learnerProfiles,
  users,
} from '../db/drizzle/drizzle.schema';
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
  async create(
    data: User,
    hashPassword: () => Promise<string>,
    proof: RegistrationEmailProof,
    preferences?: InitialLearningPreferences,
    referralCode?: string,
  ) {
    return this.db.transaction(async (tx) => {
      const email = data.email.toString();
      const challenge = and(
        eq(accountActions.tokenHash, proof.tokenHash),
        eq(accountActions.email, email),
        eq(accountActions.kind, 'register'),
        sql`${accountActions.otpExpiresAt} > clock_timestamp()`,
      );
      const [code] = await tx
        .select({
          hash: accountActions.otpHash,
          attempts: accountActions.otpAttempts,
        })
        .from(accountActions)
        .where(challenge)
        .for('update');
      if (!code?.hash || code.attempts >= maxEmailCodeAttempts) return null;
      if (
        !timingSafeEqual(
          Buffer.from(code.hash, 'hex'),
          Buffer.from(proof.codeHash, 'hex'),
        )
      ) {
        await tx
          .update(accountActions)
          .set({ otpAttempts: code.attempts + 1 })
          .where(challenge);
        return null;
      }

      await tx
        .delete(accountActions)
        .where(eq(accountActions.tokenHash, proof.tokenHash));
      const [r] = await tx
        .insert(users)
        .values({
          fullName: data.fullName.trim(),
          email,
          passwordHash: await hashPassword(),
          emailVerifiedAt: new Date(),
        })
        .returning();
      await tx.insert(learnerProfiles).values({
        userId: r.id,
        level: 'A1',
        timezone: 'UTC',
        streakDay: 0,
        dailyNewWords: preferences?.dailyNewWords ?? 10,
        dailyStudyMinutes: preferences?.dailyStudyMinutes,
        studyLevel: preferences?.studyLevel,
        xpMultiplier: 1,
      });
      if (referralCode) {
        await tx.execute(sql`
          INSERT INTO referrals (referrer_id, referred_user_id, reward_xp, rewarded_at)
          SELECT id, ${r.id}, ${referralRewardXp}, now()
          FROM users WHERE referral_code=${referralCode} AND id<>${r.id}
          FOR KEY SHARE
        `);
      }
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
  edit(
    id: string,
    change: (current: User, passwordHash: string) => void | Promise<void>,
  ) {
    return this.db.transaction(async (tx) => {
      const [row] = await tx
        .select()
        .from(users)
        .where(eq(users.id, id))
        .for('update');
      if (!row) throw new NotFoundError('User not found.');
      const user = this.toDomain(row);
      await change(user, row.passwordHash);
      const emailChanged = row.email !== user.email.toString();
      const avatarPublicId = user.avatar?.publicId ?? null;
      const avatarChanged = row.avatarPublicId !== avatarPublicId;
      const privacy = user.privacy;
      const socialLinks = user.socialLinks;
      if (
        row.fullName === user.fullName.trim() &&
        !emailChanged &&
        row.bio === user.bio &&
        row.bioFormat === user.bioFormat &&
        row.countryCode === user.countryCode &&
        row.city === user.city &&
        row.administrativeRegion === user.administrativeRegion &&
        row.streetAddress === user.streetAddress &&
        row.addressDetails === user.addressDetails &&
        row.location === user.location &&
        row.gender === user.gender &&
        row.phoneNumber === user.phoneNumber &&
        socialPlatforms.every(
          (key) => row.socialLinks[key] === socialLinks[key],
        ) &&
        row.profilePublic === privacy.profilePublic &&
        row.profileSharing === privacy.profileSharing &&
        row.publicStatistics === privacy.publicStatistics &&
        row.publicCefr === privacy.publicCefr &&
        row.publicBio === privacy.publicBio &&
        row.publicSocialLinks === privacy.publicSocialLinks &&
        !avatarChanged
      )
        return user;
      if (avatarChanged && avatarPublicId) {
        const [reservation] = await tx
          .delete(avatarCleanupJobs)
          .where(
            and(
              eq(avatarCleanupJobs.publicId, avatarPublicId),
              eq(avatarCleanupJobs.attempts, 0),
            ),
          )
          .returning({ publicId: avatarCleanupJobs.publicId });
        if (!reservation) {
          throw new UnavailableError('Avatar upload could not be finalized.');
        }
      }
      if (avatarChanged && row.avatarPublicId) {
        await tx
          .insert(avatarCleanupJobs)
          .values({ publicId: row.avatarPublicId })
          .onConflictDoNothing();
      }
      const [updated] = await tx
        .update(users)
        .set({
          fullName: user.fullName.trim(),
          email: user.email.toString(),
          emailVerifiedAt: user.emailVerifiedAt,
          bio: user.bio,
          bioFormat: user.bioFormat,
          countryCode: user.countryCode,
          city: user.city,
          location: user.location,
          gender: user.gender,
          phoneNumber: user.phoneNumber,
          phoneVerifiedAt: user.phoneVerifiedAt,
          administrativeRegion: user.administrativeRegion,
          streetAddress: user.streetAddress,
          addressDetails: user.addressDetails,
          socialLinks,
          ...privacy,
          avatarUrl: user.avatar?.url ?? null,
          avatarPublicId,
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
  async delete(id: string, expectedHash: string) {
    return this.db.transaction(async (tx) => {
      const [deleted] = await tx
        .delete(users)
        .where(and(eq(users.id, id), eq(users.passwordHash, expectedHash)))
        .returning({ avatarPublicId: users.avatarPublicId });
      if (deleted?.avatarPublicId) {
        await tx
          .insert(avatarCleanupJobs)
          .values({ publicId: deleted.avatarPublicId })
          .onConflictDoNothing();
      }
      return Boolean(deleted);
    });
  }
  private toDomain(r: typeof users.$inferSelect) {
    return new User({
      id: r.id,
      fullName: r.fullName,
      email: new Email(r.email),
      createdAt: r.createdAt,
      emailVerifiedAt: r.emailVerifiedAt,
      bio: r.bio,
      bioFormat: r.bioFormat,
      countryCode: r.countryCode,
      city: r.city,
      location: r.location,
      gender: r.gender,
      phoneNumber: r.phoneNumber,
      phoneVerifiedAt: r.phoneVerifiedAt,
      administrativeRegion: r.administrativeRegion,
      streetAddress: r.streetAddress,
      addressDetails: r.addressDetails,
      socialLinks: r.socialLinks,
      profilePublic: r.profilePublic,
      profileSharing: r.profileSharing,
      publicStatistics: r.publicStatistics,
      publicCefr: r.publicCefr,
      publicBio: r.publicBio,
      publicSocialLinks: r.publicSocialLinks,
      avatar:
        r.avatarUrl && r.avatarPublicId
          ? { url: r.avatarUrl, publicId: r.avatarPublicId }
          : null,
    });
  }
}
