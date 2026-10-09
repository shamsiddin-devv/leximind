import { IWordRepository, WordFilters } from "src/domain/repositories/IWordRepository";

export class SearchWordUseCase {
  constructor(private readonly wordRepo: IWordRepository) {};

  async execute(filter: WordFilters) {
    return this.wordRepo.findAll(filter);
  };
};