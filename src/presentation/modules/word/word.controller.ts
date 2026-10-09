import { Body, Controller, Get, Param, Post, Query } from "@nestjs/common";
import { CreateWordUseCase } from "src/application/use-cases/word/CreateWordUseCase";
import { GetWordByIdUseCase } from "src/application/use-cases/word/GetWordByIdUseCase";
import { SearchWordUseCase } from "src/application/use-cases/word/SearchWordUseCase";
import type { CreateWordDto } from "./dto/create-word.dto";
import type { SearchWordDto } from "./dto/search-word.dto";

@Controller('words')
export class WordController {
  constructor(
    private readonly createWordUseCase: CreateWordUseCase,
    private readonly getWordByIdUseCase: GetWordByIdUseCase,
    private readonly searchWordUseCase: SearchWordUseCase
  ) {};

  @Get(':id')
  async getById(@Param('id') id: string) {
    await this.getWordByIdUseCase.execute(id);
  };

  @Get()
  async searchWord(@Query() dto: SearchWordDto) {
    await this.searchWordUseCase.execute(dto);
  };

  @Post()
  async createWord(@Body() dto: CreateWordDto) {
    await this.createWordUseCase.execute(dto);
  };
};