import { ICardRepository } from 'src/domain/repositories/ICardRepository';
import { CreateManyCardsResult } from './CreateManyCardsResult';
import { BadRequestError } from 'src/domain/errors/BadRequestError';
import { Card } from 'src/domain/entities/Card';

export class CreateManyCardsUseCase {
  constructor(private readonly cardRepo: ICardRepository) {}

  async execute(cards: Card[]): Promise<CreateManyCardsResult> {
    if (!cards.length) throw new BadRequestError('Data must not be empty.');

    await this.cardRepo.createMany(cards);

    return {
      cards: cards.length,
    };
  }
}
