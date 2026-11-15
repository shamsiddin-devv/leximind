import { ICardRepository } from '../../../../domain/repositories/ICardRepository';
import { CreateManyCardsResult } from './CreateManyCardsResult';
import { BadRequestError } from '../../../../domain/errors/BadRequestError';
import { Card } from '../../../../domain/entities/Card';

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
