import { Body, Controller, Get, Header, Patch } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { UserUiPreferences } from '../../../application/use-cases/user/UserUiPreferences';
import type { Identity } from '../../../domain/repositories/IAuthRepository';
import { CurrentUser } from '../../security';
import { UserUiPreferencesDto } from './dto/user-ui-preferences.dto';

@ApiTags('Account preferences')
@Controller('users/me/ui-preferences')
export class UserUiPreferencesController {
  constructor(private readonly preferences: UserUiPreferences) {}

  @Get()
  @Header('Cache-Control', 'no-store')
  read(@CurrentUser() user: Identity) {
    return this.preferences.read(user.id);
  }

  @Patch()
  @Header('Cache-Control', 'no-store')
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  update(@CurrentUser() user: Identity, @Body() dto: UserUiPreferencesDto) {
    return this.preferences.update(user.id, dto);
  }
}
