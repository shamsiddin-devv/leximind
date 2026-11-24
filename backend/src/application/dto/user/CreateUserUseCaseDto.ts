import type { InitialLearningPreferences } from '../../../domain/repositories/IUserRepository';

export interface CreateUserUseCaseDto extends InitialLearningPreferences {
  fullName: string;
  email: string;
  password: string;
  referralCode?: string;
}
