import { NotFoundError } from "src/domain/errors/NotFoundError";
import { IWordRepository } from "src/domain/repositories/IWordRepository";


export class GetWordByIdUseCase {
  constructor(private readonly wordRepo: IWordRepository) {};

  async execute(id: string) {
    const wordExistence = await this.wordRepo.findById(id);
    if(!wordExistence) throw new NotFoundError('Word not found.');
    return wordExistence;
  };
};