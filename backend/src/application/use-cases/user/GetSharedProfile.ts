import { NotFoundError } from '../../../domain/errors/NotFoundError';
import type { IUserRepository } from '../../../domain/repositories/IUserRepository';
import type { LearningUseCases } from '../LearningUseCases';

export class GetSharedProfile {
  constructor(
    private readonly users: IUserRepository,
    private readonly learning: Pick<LearningUseCases, 'profile' | 'statistics' | 'analytics'>,
  ) {}

  async execute(id: string) {
    const user = await this.users.findById(id);
    if (!user) throw new NotFoundError('Profile is unavailable.');
    const privacy = user.privacy;
    if (!privacy.profilePublic || !privacy.profileSharing) {
      throw new NotFoundError('Profile is unavailable.');
    }

    const [profile, statistics, analytics] = await Promise.all([
      privacy.publicCefr || privacy.publicStatistics ? this.learning.profile(id) : undefined,
      privacy.publicStatistics ? this.learning.statistics(id) : undefined,
      privacy.publicStatistics ? this.learning.analytics(id) : undefined,
    ]);
    return {
      fullName: user.fullName,
      avatarUrl: user.avatar?.url ?? null,
      hasProfileBadge: user.hasProfileBadge,
      bio: privacy.publicBio ? user.bio ?? undefined : undefined,
      socialLinks: privacy.publicSocialLinks ? user.socialLinks : undefined,
      level: privacy.publicCefr ? profile?.level : undefined,
      statistics: statistics && profile ? {
        learnedWords: statistics.learnedWords,
        streakDay: profile.streakDay,
        sessions: statistics.sessions,
        xp: analytics?.totalXp ?? 0,
        accuracy: analytics?.accuracy ?? null,
        studySeconds: analytics?.studySeconds ?? 0,
        weeklyXp: analytics?.weeks.map(({ date, xp }) => ({ date, xp })) ?? [],
      } : undefined,
    };
  }
}
