import { UpdateCardUseCaseDto } from 'src/application/dto/UpdateCardUseCaseDto';
import { Card } from 'src/domain/entities/Card';
import { NotFoundError } from 'src/domain/errors/NotFoundError';
import { ICardRepository } from 'src/domain/repositories/ICardRepository';

export class UpdateCardUseCase {
  constructor(private readonly cardRepo: ICardRepository) {}

  async execute(id: string, dto: UpdateCardUseCaseDto) {
    const findingCard = await this.cardRepo.findById(id);

    if (!findingCard) throw new NotFoundError('Card not found.');

    const card = new Card({
      userId: dto.userId!,
      wordId: dto.wordId!,
      stability: dto.stability!,
      difficulty: dto.difficulty!,
      reps: dto.reps!,
      due: dto.due!,
      lapses: dto.lapses!,
      state: dto.state!,
      lastReviewedAt: dto.lastReviewedAt!
    });

    const result = await this.cardRepo.update(id, card);
    return result
  }
}
