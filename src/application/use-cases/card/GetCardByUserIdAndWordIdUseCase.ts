import { NotFoundError } from "src/domain/errors/NotFoundError";
import { ICardRepository } from "src/domain/repositories/ICardRepository";

export class GetCardByUserIdAndWordIdUseCase {
  constructor(private readonly cardRepo: ICardRepository) {};

  async execute(userId: string, wordId: string) {
    const findingUserAndWord = await this.cardRepo.findUnique(userId, wordId);

    if(!findingUserAndWord) throw new NotFoundError('No card associated with this User ID and Word ID was found.');

    return findingUserAndWord;
  };
}