import {
  ICardRepository,
  CardFilters,
} from '../../../domain/repositories/ICardRepository';
import { NotFoundError } from '../../../domain/errors/NotFoundError';
export class OwnedCardsUseCase {
  constructor(private readonly repo: ICardRepository) {}
  async get(id: string, userId: string) {
    const c = await this.repo.findById(id);
    if (!c || c.userId !== userId) throw new NotFoundError('Card not found.');
    return c;
  }
  async remove(id: string, userId: string) {
    await this.repo.delete(id, userId);
  }
  setPaused(id: string, userId: string, paused: boolean) {
    return this.repo.setPaused(id, userId, paused);
  }
  list(userId: string, filters: CardFilters) {
    return this.repo.findAll({ ...filters, userId });
  }
}
