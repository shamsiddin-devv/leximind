import { Module } from '@nestjs/common';
import { WordController } from './word.controller';
import { CreateWordUseCase } from '../../../application/use-cases/word/CreateWordUseCase';
import { IWordRepository } from '../../../domain/repositories/IWordRepository';
import { GetWordByIdUseCase } from '../../../application/use-cases/word/GetWordByIdUseCase';
import { SearchWordUseCase } from '../../../application/use-cases/word/SearchWordUseCase';
import { CreateManyWordsUseCase } from '../../../application/use-cases/word/create-many-words/CreateManyWordsUseCase';

import { ManageWordUseCase } from '../../../application/use-cases/word/ManageWordUseCase';
import { ManageWordSenses } from '../../../application/use-cases/word/ManageWordSenses';
import { WordSenseController } from './word-sense.controller';

@Module({
  imports: [],
  controllers: [WordController, WordSenseController],
  providers: [
    {
      provide: ManageWordSenses,
      useFactory: (repo: IWordRepository) => new ManageWordSenses(repo),
      inject: ['IWordRepository'],
    },
    {
      provide: ManageWordUseCase,
      useFactory: (repo: IWordRepository) => new ManageWordUseCase(repo),
      inject: ['IWordRepository'],
    },
    {
      provide: CreateWordUseCase,
      useFactory: (wordRepo: IWordRepository) =>
        new CreateWordUseCase(wordRepo),
      inject: ['IWordRepository'],
    },
    {
      provide: GetWordByIdUseCase,
      useFactory: (wordRepo: IWordRepository) =>
        new GetWordByIdUseCase(wordRepo),
      inject: ['IWordRepository'],
    },
    {
      provide: SearchWordUseCase,
      useFactory: (wordRepo: IWordRepository) =>
        new SearchWordUseCase(wordRepo),
      inject: ['IWordRepository'],
    },
    {
      provide: CreateManyWordsUseCase,
      useFactory: (wordRepo: IWordRepository) =>
        new CreateManyWordsUseCase(wordRepo),
      inject: ['IWordRepository'],
    },
  ],
})
export class WordModule {}
