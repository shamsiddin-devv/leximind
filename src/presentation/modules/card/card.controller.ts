import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Patch,
  Delete,
  Query,
  ParseUUIDPipe,
  HttpCode,
} from '@nestjs/common';
import { CreateCardUseCase } from '../../../application/use-cases/card/CreateCardUseCase';
import { CreateManyCardsUseCase } from '../../../application/use-cases/card/create-many-cards/CreateManyCardsUseCase';
import { OwnedCardsUseCase } from '../../../application/use-cases/card/OwnedCardsUseCase';
import { Card } from '../../../domain/entities/Card';
import type { Identity } from '../../../domain/repositories/IAuthRepository';
import { CurrentUser } from '../../security';
import { cardView } from '../../serializers';
import { CreateCardDto, BulkCardsDto } from './dto/create-card.dto';
import { SearchCardFilterDto } from './dto/search-card-filter.dto';
import { UpdateCardDto } from './dto/update-card.dto';
@Controller('cards')
export class CardController {
  constructor(
    private readonly create: CreateCardUseCase,
    private readonly bulk: CreateManyCardsUseCase,
    private readonly owned: OwnedCardsUseCase,
  ) {}
  @Get('due') async due(
    @CurrentUser() u: Identity,
    @Query() q: SearchCardFilterDto,
  ) {
    const r = await this.owned.list(u.id, { ...q, dueBefore: new Date() });
    return { ...r, data: r.data.map(cardView) };
  }
  @Get(':id') async byId(
    @CurrentUser() u: Identity,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return cardView(await this.owned.get(id, u.id));
  }
  @Get() async all(
    @CurrentUser() u: Identity,
    @Query() q: SearchCardFilterDto,
  ) {
    const r = await this.owned.list(u.id, q);
    return { ...r, data: r.data.map(cardView) };
  }
  @Post() async add(@CurrentUser() u: Identity, @Body() dto: CreateCardDto) {
    return cardView(
      await this.create.execute({ userId: u.id, wordId: dto.wordId }),
    );
  }
  @Post('bulk') addMany(@CurrentUser() u: Identity, @Body() dto: BulkCardsDto) {
    return this.bulk.execute(
      dto.wordIds.map((id) => Card.createNew(u.id, id, new Date())),
    );
  }
  @Patch(':id')
  async update(
    @CurrentUser() u: Identity,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCardDto,
  ) {
    return cardView(await this.owned.setPaused(id, u.id, dto.paused));
  }
  @Delete(':id') @HttpCode(204) async remove(
    @CurrentUser() u: Identity,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    await this.owned.remove(id, u.id);
  }
}
