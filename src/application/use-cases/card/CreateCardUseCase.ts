import { CreateCardUseCaseDto } from 'src/application/dto/CreateCardUseCaseDto';
import { Card } from 'src/domain/entities/Card';
import { ConflictError } from 'src/domain/errors/ConflictError';
import { ICardRepository } from 'src/domain/repositories/ICardRepository';

export class CreateCardUseCase {
  constructor(private readonly cardRepo: ICardRepository) {}

  async execute(dto: CreateCardUseCaseDto) {
    const findCard = await this.cardRepo.findUnique(dto.userId, dto.wordId);
    if (findCard) throw new ConflictError('Card already exists.');

    const card = new Card({
      userId: dto.userId,
      wordId: dto.wordId,
      difficulty: dto.difficulty,
      stability: dto.stability,
      due: dto.due,
      lapses: dto.lapses,
      reps: dto.reps,
      state: dto.state,
    });
    const result = await this.cardRepo.create(card);
    return result;
  }
}
