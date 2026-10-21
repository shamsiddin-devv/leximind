import { CardFilters, ICardRepository } from "src/domain/repositories/ICardRepository";

export class SearchCardUseCase {
  constructor(private readonly cardRepo: ICardRepository) {};

  async execute(filter: CardFilters) {
    return this.cardRepo.findAll(filter);
  }
}