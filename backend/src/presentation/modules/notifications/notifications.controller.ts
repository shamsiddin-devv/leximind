import {
  Controller,
  Get,
  Header,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Query,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { UserNotifications } from '../../../application/use-cases/user/UserNotifications';
import type { Identity } from '../../../domain/repositories/IAuthRepository';
import { PaginationDto } from '../../pagination.dto';
import { CurrentUser } from '../../security';

@ApiTags('Notifications')
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notifications: UserNotifications) {}

  @Get()
  @Header('Cache-Control', 'no-store')
  list(@CurrentUser() user: Identity, @Query() query: PaginationDto) {
    return this.notifications.list(user.id, query.page, query.limit);
  }

  @Patch('read-all')
  @HttpCode(204)
  markAllRead(@CurrentUser() user: Identity) {
    return this.notifications.markAllRead(user.id);
  }

  @Patch(':id/read')
  @HttpCode(204)
  markRead(
    @CurrentUser() user: Identity,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.notifications.markRead(user.id, id);
  }
}
