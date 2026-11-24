import { Module } from '@nestjs/common';
import { CardController } from './card.controller';
import { ICardRepository } from '../../../domain/repositories/ICardRepository';
import { CreateCardUseCase } from '../../../application/use-cases/card/CreateCardUseCase';
import { CreateManyCardsUseCase } from '../../../application/use-cases/card/create-many-cards/CreateManyCardsUseCase';
import { OwnedCardsUseCase } from '../../../application/use-cases/card/OwnedCardsUseCase';
import { CollectionEntries } from '../../../application/use-cases/card/CollectionEntries';
import { DrizzleCollectionRepository } from '../../../infrastructure/repositories/DrizzleCollectionRepository';
import { CollectionEntriesController } from './collection-entries.controller';
@Module({
  controllers: [CardController, CollectionEntriesController],
  providers: [
    DrizzleCollectionRepository,
    {
      provide: CollectionEntries,
      useFactory: (repository: DrizzleCollectionRepository) =>
        new CollectionEntries(repository),
      inject: [DrizzleCollectionRepository],
    },
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
