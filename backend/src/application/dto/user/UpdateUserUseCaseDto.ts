import type { UserDetails } from '../../../domain/entities/User';

export interface UpdateUserUseCaseDto extends UserDetails {
  fullName?: string;
  email?: string;
  currentPassword?: string;
}
