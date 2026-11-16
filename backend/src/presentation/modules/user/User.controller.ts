import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Query,
  ParseUUIDPipe,
  HttpCode,
} from '@nestjs/common';
import type { Identity } from '../../../domain/repositories/IAuthRepository';
import { CurrentUser, Admin } from '../../security';
import { userView } from '../../serializers';
import { PaginationDto } from '../../pagination.dto';
import { GetUserByIdUseCase } from '../../../application/use-cases/user/GetUserByIdUseCase';
import { GetUsersUseCase } from '../../../application/use-cases/user/GetUsersUseCase';
import { UpdateUserUseCase } from '../../../application/use-cases/user/UpdateUserUseCase';
import { DeleteUserUseCase } from '../../../application/use-cases/user/DeleteUserUseCase';
import { ChangePasswordUseCase } from '../../../application/use-cases/user/ChangePasswordUseCase';
import { UpdateUserDto } from './dto/update-user.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
@Controller('users')
export class UserController {
  constructor(
    private readonly get: GetUserByIdUseCase,
    private readonly list: GetUsersUseCase,
    private readonly update: UpdateUserUseCase,
    private readonly remove: DeleteUserUseCase,
    private readonly password: ChangePasswordUseCase,
  ) {}
  @Get('me') async me(@CurrentUser() u: Identity) {
    return userView(await this.get.execute(u.id));
  }
  @Patch('me') async edit(
    @CurrentUser() u: Identity,
    @Body() dto: UpdateUserDto,
  ) {
    return userView(await this.update.execute(u.id, dto));
  }
  @Patch('me/password') changePassword(
    @CurrentUser() u: Identity,
    @Body() dto: ChangePasswordDto,
  ) {
    return this.password.execute(u.id, dto);
  }
  @Delete('me') @HttpCode(204) async deleteMe(@CurrentUser() u: Identity) {
    await this.remove.execute(u.id);
  }
  @Admin() @Get() async all(@Query() q: PaginationDto) {
    const r = await this.list.execute(q.page, q.limit);
    return { ...r, data: r.data.map(userView) };
  }
  @Admin() @Get(':id') async byId(@Param('id', ParseUUIDPipe) id: string) {
    return userView(await this.get.execute(id));
  }
}
