import { IWordRepository } from '../../../../domain/repositories/IWordRepository';
import { CreateManyWordsResult } from './CreateManyWordsResult';
import { BadRequestError } from '../../../../domain/errors/BadRequestError';
import { Word } from '../../../../domain/entities/Word';

export class CreateManyWordsUseCase {
  constructor(private readonly wordRepo: IWordRepository) {}

  async execute(words: Word[]): Promise<CreateManyWordsResult> {
    if (!words.length) throw new BadRequestError('Data must not be empty.');

    await this.wordRepo.createMany(words);

    return {
      createWords: words.length,
      createdSenses: words.reduce(
        (total, word) => total + word.sense.length,
        0,
      ),
    };
  }
}
