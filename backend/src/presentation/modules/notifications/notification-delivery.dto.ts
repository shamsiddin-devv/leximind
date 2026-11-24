import { Type } from 'class-transformer';
import { IsDefined, IsString, Length, ValidateNested } from 'class-validator';

class PushSubscriptionKeysDto {
  @IsString() @Length(87, 88) declare p256dh: string;
  @IsString() @Length(22, 24) declare auth: string;
}

export class PushSubscriptionDto {
  @IsString() @Length(20, 2048) declare endpoint: string;
  @IsDefined()
  @ValidateNested()
  @Type(() => PushSubscriptionKeysDto)
  declare keys: PushSubscriptionKeysDto;
}
