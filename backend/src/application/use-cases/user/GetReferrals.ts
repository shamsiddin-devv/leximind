import { NotFoundError } from '../../../domain/errors/NotFoundError';
import {
  referralRewardXp,
  type IReferralRepository,
} from '../../../domain/repositories/IReferralRepository';

export class GetReferrals {
  constructor(private readonly referrals: IReferralRepository) {}

  async execute(userId: string) {
    const data = await this.referrals.summary(userId);
    if (!data) throw new NotFoundError('Account not found.');
    return { ...data, rewardXp: referralRewardXp };
  }
}
