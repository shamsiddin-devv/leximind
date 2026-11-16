import { CreateCardUseCaseDto } from '../../dto/card/CreateCardUseCaseDto';
import { Card } from '../../../domain/entities/Card';
import { ConflictError } from '../../../domain/errors/ConflictError';
import { ICardRepository } from '../../../domain/repositories/ICardRepository';
export class CreateCardUseCase {
  constructor(private readonly repo: ICardRepository) {}
  async execute(dto: CreateCardUseCaseDto) {
    if (await this.repo.findUnique(dto.userId, dto.wordId))
      throw new ConflictError('Card already exists.');
    return this.repo.create(Card.createNew(dto.userId, dto.wordId, new Date()));
  }
}
