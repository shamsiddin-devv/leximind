import { Controller, Get, Header } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { GetReferrals } from '../../../application/use-cases/user/GetReferrals';
import type { Identity } from '../../../domain/repositories/IAuthRepository';
import { CurrentUser } from '../../security';

@Controller('referrals')
@ApiTags('Referrals')
export class ReferralsController {
  constructor(private readonly referrals: GetReferrals) {}

  @Get()
  @Header('Cache-Control', 'no-store')
  summary(@CurrentUser() user: Identity) {
    return this.referrals.execute(user.id);
  }
}
