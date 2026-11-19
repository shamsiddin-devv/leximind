import { IsString, MaxLength } from 'class-validator';
import { maxAvatarLength } from '../../../../application/use-cases/user/UpdateAvatarUseCase';

export class UpdateAvatarDto {
  @IsString()
  @MaxLength(maxAvatarLength)
  image!: string;
}
