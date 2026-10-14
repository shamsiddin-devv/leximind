import { Body, Controller, Get, Param, Post, Query } from "@nestjs/common";
import { CreateWordUseCase } from "src/application/use-cases/word/CreateWordUseCase";
import { GetWordByIdUseCase } from "src/application/use-cases/word/GetWordByIdUseCase";
import { SearchWordUseCase } from "src/application/use-cases/word/SearchWordUseCase";
import type { CreateWordDto } from "./dto/create-word.dto";
import type { SearchWordDto } from "./dto/search-word.dto";
import { Word } from "src/domain/entities/Word";
import { CreateManyWordsUseCase } from "src/application/use-cases/word/create-many-words/CreateManyWordsUseCase";

@Controller('words')
export class WordController {
  constructor(
    private readonly createWordUseCase: CreateWordUseCase,
    private readonly getWordByIdUseCase: GetWordByIdUseCase,
    private readonly searchWordUseCase: SearchWordUseCase,
    private readonly createManyWordsUseCase: CreateManyWordsUseCase 
  ) {};

  @Get(':id')
  async getById(@Param('id') id: string) {
    return this.getWordByIdUseCase.execute(id);
  };

  @Get()
  async searchWord(@Query() dto: SearchWordDto) {
    return this.searchWordUseCase.execute(dto);
  };

  @Post('bulk')
  async createManyWords(@Body() words: Word[]) {
    return this.createManyWordsUseCase.execute(words);
  };

  @Post()
  async createWord(@Body() dto: CreateWordDto) {
    return this.createWordUseCase.execute(dto);
  };
};