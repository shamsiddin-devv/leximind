import { NotFoundError } from '../../../domain/errors/NotFoundError';
import { IWordRepository } from '../../../domain/repositories/IWordRepository';

export class GetWordByIdUseCase {
  constructor(private readonly wordRepo: IWordRepository) {}

  async execute(id: string) {
    const wordExistence = await this.wordRepo.findById(id);
    if (!wordExistence) throw new NotFoundError('Word not found.');
    return wordExistence;
  }
}
