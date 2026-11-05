import { OmitType, PartialType } from '@nestjs/mapped-types';
import { CreateUserUseCaseDto } from './CreateUserUseCaseDto';

export class UpdateUserUseCaseDto extends PartialType(
  OmitType(CreateUserUseCaseDto, ['password'] as const)
) {};
