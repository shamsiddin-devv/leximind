import {
  Body,
  Controller,
  Delete,
  Get,
  Header,
  HttpCode,
  Param,
  ParseUUIDPipe,
  ParseEnumPipe,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CollectionEntries } from '../../../application/use-cases/card/CollectionEntries';
import type { Identity } from '../../../domain/repositories/IAuthRepository';
import type { CollectionSource } from '../../../domain/repositories/ICollectionRepository';
import { PaginationDto } from '../../pagination.dto';
import { CurrentUser } from '../../security';
import {
  AddCollectionEntriesDto,
  CollectionDraftDto,
  ChangeCollectionPinDto,
  ImportCollectionPinsDto,
} from './dto/collection-entries.dto';

const sources = { personal: 'personal', card: 'card' } as const;

@Controller('collection-entries')
@ApiTags('Personal collections')
export class CollectionEntriesController {
  constructor(private readonly collection: CollectionEntries) {}

  @Get()
  @Header('Cache-Control', 'no-store')
  list(@CurrentUser() user: Identity, @Query() query: PaginationDto) {
    return this.collection.list(user.id, query.page, query.limit);
  }

  @Post()
  @Header('Cache-Control', 'no-store')
  add(@CurrentUser() user: Identity, @Body() body: AddCollectionEntriesDto) {
    return this.collection.import(
      user.id,
      body.entries.map(({ createdAt, ...entry }) => ({
        ...entry,
        createdAt: new Date(createdAt),
      })),
    );
  }

  @Post('pins/import')
  @HttpCode(204)
  importPins(
    @CurrentUser() user: Identity,
    @Body() body: ImportCollectionPinsDto,
  ) {
    return this.collection.importPins(user.id, body.ids);
  }

  @Put('pins/:source/:id')
  @HttpCode(204)
  pin(
    @CurrentUser() user: Identity,
    @Param('source', new ParseEnumPipe(sources)) source: CollectionSource,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() draft: ChangeCollectionPinDto,
  ) {
    return this.collection.pin(user.id, source, id, draft.pinned);
  }

  @Put(':id')
  @Header('Cache-Control', 'no-store')
  update(
    @CurrentUser() user: Identity,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() draft: CollectionDraftDto,
  ) {
    return this.collection.update(user.id, id, draft);
  }

  @Delete(':id')
  @HttpCode(204)
  remove(
    @CurrentUser() user: Identity,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ) {
    return this.collection.remove(user.id, id);
  }
}
