import { Module } from '@nestjs/common';
import { CardController } from './card.controller';
import { CreateCardUseCase } from 'src/application/use-cases/card/CreateCardUseCase';
import { ICardRepository } from 'src/domain/repositories/ICardRepository';
import { GetCardByIdUseCase } from 'src/application/use-cases/card/GetCardByIdUseCase';
import { GetCardByUserIdUseCase } from 'src/application/use-cases/card/GetCardByUserIdUseCase';
import { GetCardByUserIdAndWordIdUseCase } from 'src/application/use-cases/card/GetCardByUserIdAndWordIdUseCase';
import { SearchCardUseCase } from 'src/application/use-cases/card/SearchCardUseCase';
import { CreateManyCardsUseCase } from 'src/application/use-cases/card/create-many-cards/CreateManyCardsUseCase';
import { UpdateCardUseCase } from 'src/application/use-cases/card/UpdateCardUseCase';

@Module({
  imports: [],
  controllers: [CardController],
  providers: [
    {
      provide: CreateCardUseCase,
      useFactory: (cardRepo: ICardRepository) =>
        new CreateCardUseCase(cardRepo),
      inject: ['ICardRepository'],
    },
    {
      provide: GetCardByIdUseCase,
      useFactory: (cardRepo: ICardRepository) =>
        new GetCardByIdUseCase(cardRepo),
      inject: ['ICardRepository'],
    },
    {
      provide: GetCardByUserIdUseCase,
      useFactory: (cardRepo: ICardRepository) =>
        new GetCardByUserIdUseCase(cardRepo),
      inject: ['ICardRepository'],
    },
    {
      provide: GetCardByUserIdAndWordIdUseCase,
      useFactory: (cardRepo: ICardRepository) =>
        new GetCardByUserIdAndWordIdUseCase(cardRepo),
      inject: ['ICardRepository'],
    },
    {
      provide: SearchCardUseCase,
      useFactory: (cardRepo: ICardRepository) =>
        new SearchCardUseCase(cardRepo),
      inject: ['ICardRepository'],
    },
    {
      provide: CreateManyCardsUseCase,
      useFactory: (cardRepo: ICardRepository) =>
        new CreateManyCardsUseCase(cardRepo),
      inject: ['ICardRepository'],
    },
    {
      provide: UpdateCardUseCase,
      useFactory: (cardRepo: ICardRepository) =>
        new UpdateCardUseCase(cardRepo),
      inject: ['ICardRepository'],
    },
  ],
})
export class CardModule {}
