import {
  Body,
  Controller,
  Delete,
  Get,
  Header,
  Param,
  Patch,
  Put,
  Query,
  ParseUUIDPipe,
  HttpCode,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Identity } from '../../../domain/repositories/IAuthRepository';
import { CurrentUser, Admin, Public } from '../../security';
import { ownUserView, userView } from '../../serializers';
import { PaginationDto } from '../../pagination.dto';
import { GetUserByIdUseCase } from '../../../application/use-cases/user/GetUserByIdUseCase';
import { GetSharedProfile } from '../../../application/use-cases/user/GetSharedProfile';
import { GetUsersUseCase } from '../../../application/use-cases/user/GetUsersUseCase';
import { UpdateUserUseCase } from '../../../application/use-cases/user/UpdateUserUseCase';
import { DeleteUserUseCase } from '../../../application/use-cases/user/DeleteUserUseCase';
import { ChangePasswordUseCase } from '../../../application/use-cases/user/ChangePasswordUseCase';
import { UpdateUserDto } from './dto/update-user.dto';
import { UpdateAvatarUseCase } from '../../../application/use-cases/user/UpdateAvatarUseCase';
import { UpdateAvatarDto } from './dto/update-avatar.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { DeleteAccountDto } from './dto/delete-account.dto';

@Controller('users')
export class UserController {
  constructor(
    private readonly get: GetUserByIdUseCase,
    private readonly list: GetUsersUseCase,
    private readonly update: UpdateUserUseCase,
    private readonly remove: DeleteUserUseCase,
    private readonly password: ChangePasswordUseCase,
    private readonly avatar: UpdateAvatarUseCase,
    private readonly sharedProfile: GetSharedProfile,
  ) {}
  @Public()
  @Header('Cache-Control', 'no-store')
  @Get('shared/:id')
  shared(@Param('id', ParseUUIDPipe) id: string) {
    return this.sharedProfile.execute(id);
  }

  @Get('me') async me(@CurrentUser() u: Identity) {
    return ownUserView(await this.get.execute(u.id));
  }
  @Patch('me') async edit(
    @CurrentUser() u: Identity,
    @Body() dto: UpdateUserDto,
  ) {
    return ownUserView(await this.update.execute(u.id, dto));
  }
  @Put('me/avatar') async uploadAvatar(
    @CurrentUser() u: Identity,
    @Body() dto: UpdateAvatarDto,
  ) {
    return ownUserView(await this.avatar.execute(u.id, dto.image));
  }
  @Delete('me/avatar') async removeAvatar(@CurrentUser() u: Identity) {
    return ownUserView(await this.avatar.execute(u.id, null));
  }
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Patch('me/password') changePassword(
    @CurrentUser() u: Identity,
    @Body() dto: ChangePasswordDto,
  ) {
    return this.password.execute(u.id, dto);
  }
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Delete('me')
  @HttpCode(204)
  async deleteMe(@CurrentUser() u: Identity, @Body() dto: DeleteAccountDto) {
    await this.remove.execute(u.id, dto.currentPassword);
  }
  @Admin() @Get() async all(@Query() q: PaginationDto) {
    const r = await this.list.execute(q.page, q.limit);
    return { ...r, data: r.data.map(userView) };
  }
  @Admin() @Get(':id') async byId(@Param('id', ParseUUIDPipe) id: string) {
    return userView(await this.get.execute(id));
  }
}
