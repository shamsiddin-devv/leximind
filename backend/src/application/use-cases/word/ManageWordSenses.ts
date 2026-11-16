import { IWordSenseProps, WordSense } from '../../../domain/entities/WordSense';
import { ConflictError } from '../../../domain/errors/ConflictError';
import { NotFoundError } from '../../../domain/errors/NotFoundError';
import { IWordRepository } from '../../../domain/repositories/IWordRepository';

type SenseInput = Omit<IWordSenseProps, 'id' | 'wordId'>;

export class ManageWordSenses {
  constructor(private readonly words: IWordRepository) {}

  async list(wordId: string) {
    const word = await this.words.findById(wordId);
    if (!word) throw new NotFoundError('Word not found.');
    return word.sense;
  }

  async get(wordId: string, id: string) {
    return this.requireSense(await this.list(wordId), id);
  }

  async add(wordId: string, input: SenseInput) {
    const word = await this.words.editSenses(wordId, (word) =>
      word.withSenses([...word.sense, new WordSense(input)]),
    );
    return word.sense.find((sense) => sense.orderIndex === input.orderIndex)!;
  }

  async replace(wordId: string, id: string, input: SenseInput) {
    const word = await this.words.editSenses(wordId, (word) => {
      this.requireSense(word.sense, id);
      return word.withSenses(
        word.sense.map((sense) =>
          sense.id === id ? new WordSense({ ...input, id, wordId }) : sense,
        ),
      );
    });
    return this.requireSense(word.sense, id);
  }

  async remove(wordId: string, id: string) {
    await this.words.editSenses(wordId, (word) => {
      this.requireSense(word.sense, id);
      if (word.sense.length === 1)
        throw new ConflictError('The word must keep at least one sense.');
      return word.withSenses(word.sense.filter((sense) => sense.id !== id));
    });
  }

  private requireSense(senses: WordSense[], id: string) {
    const sense = senses.find((sense) => sense.id === id);
    if (!sense) throw new NotFoundError('Sense not found.');
    return sense;
  }
}
