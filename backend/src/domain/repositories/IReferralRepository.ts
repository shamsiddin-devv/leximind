export const referralRewardXp = 50;

export interface ReferralSummary {
  code: string;
  registered: number;
  pending: number;
  rewarded: number;
  earnedXp: number;
  recent: {
    id: string;
    registeredAt: string;
    rewardedAt: string | null;
    rewardXp: number;
  }[];
}

export interface IReferralRepository {
  summary(userId: string): Promise<ReferralSummary | undefined>;
}
