import { Module } from "@nestjs/common";
import { WordController } from "./word.controller";
import { CreateWordUseCase } from "src/application/use-cases/word/CreateWordUseCase";
import { IWordRepository } from "src/domain/repositories/IWordRepository";
import { GetWordByIdUseCase } from "src/application/use-cases/word/GetWordByIdUseCase";
import { SearchWordUseCase } from "src/application/use-cases/word/SearchWordUseCase";
import { CreateManyWordsUseCase } from "src/application/use-cases/word/create-many-words/CreateManyWordsUseCase";

@Module({
  imports: [],
  controllers: [WordController],
  providers: [
    {
      provide: CreateWordUseCase,
      useFactory: (
        wordRepo: IWordRepository
      ) => new CreateWordUseCase(wordRepo),
      inject: ['IWordRepository']
    },
    {
      provide: GetWordByIdUseCase,
      useFactory: (wordRepo: IWordRepository) => new GetWordByIdUseCase(wordRepo),
      inject: ['IWordRepository']
    },
    {
      provide: SearchWordUseCase,
      useFactory: (wordRepo: IWordRepository) => new SearchWordUseCase(wordRepo),
      inject: ['IWordRepository']
    },
    {
      provide: CreateManyWordsUseCase,
      useFactory: (wordRepo: IWordRepository) => new CreateManyWordsUseCase(wordRepo),
      inject: ['IWordRepository']
    },
  ],
})
export class WordModule {}