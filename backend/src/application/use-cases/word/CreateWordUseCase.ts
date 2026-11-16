import { CreateWordUseCaseDto } from '../../dto/word/CreateWordUseCaseDto';
import { Word } from '../../../domain/entities/Word';
import { ConflictError } from '../../../domain/errors/ConflictError';
import type { IWordRepository } from '../../../domain/repositories/IWordRepository';

import { WordSense } from '../../../domain/entities/WordSense';

export class CreateWordUseCase {
  constructor(private readonly wordRepo: IWordRepository) {}

  async execute(dto: CreateWordUseCaseDto) {
    const duplicateInspection = await this.wordRepo.findByText(
      dto.text,
      dto.cefrLevel,
    );
    if (duplicateInspection) {
      throw new ConflictError('Word already exists.');
    }

    const wordCreation = new Word({
      text: dto.text,
      cefrLevel: dto.cefrLevel,
      audioUrl: dto.audioUrl,
      topic: dto.topic,
      sense: dto.sense.map((s) => new WordSense(s)),
    });
    const result = await this.wordRepo.create(wordCreation);
    return result;
  }
}
