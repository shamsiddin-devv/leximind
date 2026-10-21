import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { CreateManyCardsUseCase } from 'src/application/use-cases/card/create-many-cards/CreateManyCardsUseCase';
import { CreateCardUseCase } from 'src/application/use-cases/card/CreateCardUseCase';
import { GetCardByIdUseCase } from 'src/application/use-cases/card/GetCardByIdUseCase';
import { SearchCardUseCase } from 'src/application/use-cases/card/SearchCardUseCase';
import { type SearchCardFilterDto } from './dto/search-card-filter.dto';
import { GetCardByUserIdUseCase } from 'src/application/use-cases/card/GetCardByUserIdUseCase';
import { GetCardByUserIdAndWordIdUseCase } from 'src/application/use-cases/card/GetCardByUserIdAndWordIdUseCase';
import { type CreateCardDto } from './dto/create-card.dto';
import { Card } from 'src/domain/entities/Card';
import { UpdateCardUseCase } from 'src/application/use-cases/card/UpdateCardUseCase';
import { UpdateCardDto } from './dto/update-card.dto';

@Controller('cards')
export class CardController {
  constructor(
    private readonly createCardUseCase: CreateCardUseCase,
    private readonly getCardByIdUseCase: GetCardByIdUseCase,
    private readonly searchCardUseCase: SearchCardUseCase,
    private readonly createManyCardsUseCase: CreateManyCardsUseCase,
    private readonly getCardByUserIdUseCase: GetCardByUserIdUseCase,
    private readonly getCardByUserIdAndWordIdUseCase: GetCardByUserIdAndWordIdUseCase,
    private readonly updateCardUseCase: UpdateCardUseCase
  ) {};

  @Get(':id')
  async findById(@Param('id') id: string) {
    return this.getCardByIdUseCase.execute(id);
  };

  @Get(':userId')
  async findByUserId(@Param('userId') userId: string) {
    return this.getCardByUserIdUseCase.execute(userId);
  };

  @Get(':userId/:wordId')
  async findUnique(@Param('userId') userId: string, @Param('wordId') wordId: string) {
    return this.getCardByUserIdAndWordIdUseCase.execute(userId, wordId);
  };

  @Get()
  async findAll(@Query() filter: SearchCardFilterDto) {
    return this.searchCardUseCase.execute(filter);
  };

  @Post()
  async create(@Body() dto: CreateCardDto) {
    return this.createCardUseCase.execute(dto);
  };

  @Post('bulk')
  async createMany(@Body() card: Card[]) {
    return this.createManyCardsUseCase.execute(card);
  };

  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateCardDto) {
    return this.updateCardUseCase.execute(id, dto);
  };
}
