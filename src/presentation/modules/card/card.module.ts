import { Module } from '@nestjs/common';
import { CardController } from './card.controller';
import { ICardRepository } from '../../../domain/repositories/ICardRepository';
import { CreateCardUseCase } from '../../../application/use-cases/card/CreateCardUseCase';
import { CreateManyCardsUseCase } from '../../../application/use-cases/card/create-many-cards/CreateManyCardsUseCase';
import { OwnedCardsUseCase } from '../../../application/use-cases/card/OwnedCardsUseCase';
@Module({
  controllers: [CardController],
  providers: [
    {
      provide: CreateCardUseCase,
      useFactory: (r: ICardRepository) => new CreateCardUseCase(r),
      inject: ['ICardRepository'],
    },
    {
      provide: CreateManyCardsUseCase,
      useFactory: (r: ICardRepository) => new CreateManyCardsUseCase(r),
      inject: ['ICardRepository'],
    },
    {
      provide: OwnedCardsUseCase,
      useFactory: (r: ICardRepository) => new OwnedCardsUseCase(r),
      inject: ['ICardRepository'],
    },
  ],
})
export class CardModule {}
