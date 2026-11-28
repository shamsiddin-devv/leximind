import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  Param,
  ParseUUIDPipe,
  Post,
  HttpCode,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public, CurrentUser } from '../../security';
import type { Identity } from '../../../domain/repositories/IAuthRepository';
import { LoginUseCase } from '../../../application/use-cases/user/LoginUseCase';
import { CreateUserUseCase } from '../../../application/use-cases/user/CreateUserUseCase';
import { LogoutUseCase } from '../../../application/use-cases/user/LogoutUseCase';
import { ConfirmRegistrationDto } from './dto/create-user.dto';
import { LoginDto, RefreshSessionDto } from './dto/login.dto';
import { userView } from '../../serializers';
import { AccountSessions } from '../../../application/use-cases/user/AccountSessions';
import { AccountActions } from '../../../application/use-cases/user/AccountActions';
import {
  ConfirmEmailCodeDto,
  ConfirmEmailDto,
  RequestAccountActionDto,
  ResetPasswordCodeDto,
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
    private readonly sessions: AccountSessions,
  ) {}
  @Public()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('register/request')
  @HttpCode(202)
  @ApiOperation({ security: [] })
  requestRegistration(@Body() dto: RequestAccountActionDto) {
    return this.accountActions.requestRegistration(dto.email);
  }

  @Public()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('register')
  @ApiOperation({ security: [] })
  async signUp(@Body() dto: ConfirmRegistrationDto) {
    const { registrationToken, code, ...account } = dto;
    const proof = this.accountActions.registrationProof(
      account.email,
      registrationToken,
      code,
    );
    return userView(await this.register.execute(account, proof));
  }
  @Public()
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Post('login')
  @ApiOperation({ security: [] })
  @HttpCode(200)
  signIn(@Body() dto: LoginDto, @Headers('user-agent') userAgent?: string) {
    return this.login.execute(
      dto.email,
      dto.password,
      userAgent,
      dto.rememberSession,
    );
  }
  @Public()
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  @Post('refresh')
  @ApiOperation({ security: [] })
  @HttpCode(200)
  refresh(@Body() dto: RefreshSessionDto) {
    return this.login.refresh(dto.refreshToken);
  }
  @Post('logout') @HttpCode(204) async logout(@CurrentUser() user: Identity) {
    await this.signOut.execute(user);
  }
  @Get('sessions') listSessions(@CurrentUser() user: Identity) {
    return this.sessions.list(user);
  }

  @Delete('sessions/others') @HttpCode(204) async revokeOtherSessions(
    @CurrentUser() user: Identity,
  ) {
    await this.sessions.revokeOthers(user);
  }

  @Delete('sessions/:id') @HttpCode(204) async revokeSession(
    @CurrentUser() user: Identity,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    await this.sessions.revoke(user, id);
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
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('email-verification/confirm-code')
  @HttpCode(204)
  confirmEmailCode(@Body() dto: ConfirmEmailCodeDto) {
    return this.accountActions.confirmCode(dto.email, dto.code, 'verify_email');
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

  @Public()
  @ApiOperation({ security: [] })
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('password-reset/confirm-code')
  @HttpCode(204)
  resetPasswordCode(@Body() dto: ResetPasswordCodeDto) {
    return this.accountActions.confirmCode(
      dto.email,
      dto.code,
      'reset_password',
      dto.password,
    );
  }
}
