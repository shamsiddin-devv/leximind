import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { ChangePasswordUseCase } from 'src/application/use-cases/user/ChangePasswordUseCase';
import { CreateUserUseCase } from 'src/application/use-cases/user/CreateUserUseCase';
import { DeleteUserUseCase } from 'src/application/use-cases/user/DeleteUserUseCase';
import { GetUserByEmailUseCase } from 'src/application/use-cases/user/GetUserByEmailUseCase';
import { GetUserByIdUseCase } from 'src/application/use-cases/user/GetUserByIdUseCase';
import { GetUsersUseCase } from 'src/application/use-cases/user/GetUsersUseCase';
import { UpdateUserUseCase } from 'src/application/use-cases/user/UpdateUserUseCase';
import type { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import type { ChangePasswordDto } from './dto/change-password.dto';

@Controller('users')
export class UserController {
  constructor(
    private readonly getUserByIdUseCase: GetUserByIdUseCase,
    private readonly getUsersUseCase: GetUsersUseCase,
    private readonly getUserByEmailUseCase: GetUserByEmailUseCase,
    private readonly createUserUseCase: CreateUserUseCase,
    private readonly updateUserUseCase: UpdateUserUseCase,
    private readonly deleteUserUseCase: DeleteUserUseCase,
    private readonly changePasswordUseCase: ChangePasswordUseCase,
  ) {}

  @Get(':id')
  async findUserById(@Param('id') id: string) {
    await this.getUserByIdUseCase.execute(id);
  }

  @Get()
  async findUsers() {
    await this.getUsersUseCase.execute();
  }

  @Post()
  async findUserByEmail(@Body() email: string) {
    await this.getUserByEmailUseCase.execute(email);
  }

  @Post()
  async createUser(@Body() dto: CreateUserDto) {
    await this.createUserUseCase.execute(dto);
  }

  @Patch(':id')
  async updateUser(@Param('id') id: string, @Body() dto: UpdateUserDto) {
    await this.updateUserUseCase.execute(id, dto);
  }

  @Patch(':id')
  async changePassword(@Param('id') id: string, @Body() dto: ChangePasswordDto) {
    await this.changePasswordUseCase.execute(id, dto);
  };

  @Delete()
  async deleteUser(@Param('id') id: string) {
    await this.deleteUserUseCase.execute(id);
  }
}
