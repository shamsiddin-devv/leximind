import { NotFoundError } from "src/domain/errors/NotFoundError";
import { ICardRepository } from "src/domain/repositories/ICardRepository";

export class GetCardByUserIdUseCase {
  constructor(private readonly cardRepo: ICardRepository) {};

  async execute(userId: string) {
    const findingUser = await this.cardRepo.findByUserId(userId);
    
    if(!findingUser) throw new NotFoundError('No card associated with this user was found.');
    
    return findingUser;
  };
}