import { NotFoundError } from 'src/domain/errors/NotFoundError';
import { ICardRepository } from 'src/domain/repositories/ICardRepository';

export class GetCardByIdUseCase {
  constructor(private readonly cardRepo: ICardRepository) {}

  async execute(id: string) {
    const findCard = await this.cardRepo.findById(id);
    if(!findCard) throw new NotFoundError('Card not found.');
    return findCard;
  };
}
