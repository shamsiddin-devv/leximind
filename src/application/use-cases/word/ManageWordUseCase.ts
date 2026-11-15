import { IWordRepository } from '../../../domain/repositories/IWordRepository';
import { Word } from '../../../domain/entities/Word';
import { WordSense } from '../../../domain/entities/WordSense';
import { NotFoundError } from '../../../domain/errors/NotFoundError';
import { CreateWordUseCaseDto } from '../../dto/word/CreateWordUseCaseDto';
export class ManageWordUseCase {
  constructor(private readonly repo: IWordRepository) {}
  async update(id: string, dto: CreateWordUseCaseDto) {
    if (!(await this.repo.findById(id)))
      throw new NotFoundError('Word not found.');
    return this.repo.update(
      id,
      new Word({ ...dto, sense: dto.sense.map((s) => new WordSense(s)) }),
    );
  }
  delete(id: string) {
    return this.repo.delete(id);
  }
}
