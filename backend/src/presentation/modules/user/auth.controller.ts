import { Body, Controller, Post, HttpCode } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public, CurrentUser } from '../../security';
import type { Identity } from '../../../domain/repositories/IAuthRepository';
import { LoginUseCase } from '../../../application/use-cases/user/LoginUseCase';
import { CreateUserUseCase } from '../../../application/use-cases/user/CreateUserUseCase';
import { LogoutUseCase } from '../../../application/use-cases/user/LogoutUseCase';
import { CreateUserDto } from './dto/create-user.dto';
import { LoginDto } from './dto/login.dto';
import { userView } from '../../serializers';
import { AccountActions } from '../../../application/use-cases/user/AccountActions';
import {
  ConfirmEmailDto,
  RequestAccountActionDto,
  ResetPasswordDto,
} from './dto/account-action.dto';
@Controller('auth')
@ApiTags('Authentication')
export class AuthController {
  constructor(
    private readonly login: LoginUseCase,
    private readonly register: CreateUserUseCase,
    private readonly signOut: LogoutUseCase,
    private readonly accountActions: AccountActions,
  ) {}
  @Public()
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('register')
  @ApiOperation({ security: [] })
  async signUp(@Body() dto: CreateUserDto) {
    return userView(await this.register.execute(dto));
  }
  @Public()
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Post('login')
  @ApiOperation({ security: [] })
  @HttpCode(200)
  signIn(@Body() dto: LoginDto) {
    return this.login.execute(dto.email, dto.password);
  }
  @Post('logout') @HttpCode(204) async logout(@CurrentUser() user: Identity) {
    await this.signOut.execute(user);
  }
  @Public()
  @ApiOperation({ security: [] })
  @Throttle({ default: { limit: 3, ttl: 60_000 } })
  @Post('email-verification/request')
  @HttpCode(202)
  requestEmailVerification(@Body() dto: RequestAccountActionDto) {
    return this.accountActions.request(dto.email, 'verify_email');
  }

  @Public()
  @ApiOperation({ security: [] })
  @Post('email-verification/confirm')
  @HttpCode(204)
  confirmEmail(@Body() dto: ConfirmEmailDto) {
    return this.accountActions.confirm(dto.token, 'verify_email');
  }

  @Public()
  @ApiOperation({ security: [] })
  @Throttle({ default: { limit: 3, ttl: 60_000 } })
  @Post('password-reset/request')
  @HttpCode(202)
  requestPasswordReset(@Body() dto: RequestAccountActionDto) {
    return this.accountActions.request(dto.email, 'reset_password');
  }

  @Public()
  @ApiOperation({ security: [] })
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('password-reset/confirm')
  @HttpCode(204)
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.accountActions.confirm(
      dto.token,
      'reset_password',
      dto.password,
    );
  }
}
