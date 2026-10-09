import { CreateWordUseCaseDto } from "src/application/dto/CreateWordDto";
import { Word } from "src/domain/entities/Word";
import { ConflictError } from "src/domain/errors/ConflictError";
import type { IWordRepository } from "src/domain/repositories/IWordRepository";


export class CreateWordUseCase {
  constructor(private readonly wordRepo: IWordRepository) {}

  async execute(dto: CreateWordUseCaseDto) {
    const duplicateInspection = await this.wordRepo.findByText(dto.text, dto.cefrLevel);
    if(duplicateInspection) {
      throw new ConflictError('Word already exists.');
    };

    const wordCreation = new Word({
      text: dto.text,
      cefrLevel: dto.cefrLevel,
      audioUrl: dto.audioUrl,
      sense: dto.sense
    });
    const result = await this.wordRepo.create(wordCreation);

    return result;
  };
};