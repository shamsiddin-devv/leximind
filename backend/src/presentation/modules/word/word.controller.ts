import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  Delete,
  Query,
  ParseUUIDPipe,
  HttpCode,
} from '@nestjs/common';
import { CreateWordUseCase } from '../../../application/use-cases/word/CreateWordUseCase';
import { GetWordByIdUseCase } from '../../../application/use-cases/word/GetWordByIdUseCase';
import { GetDailyWord } from '../../../application/use-cases/word/GetDailyWord';
import { SearchWordUseCase } from '../../../application/use-cases/word/SearchWordUseCase';
import { CreateManyWordsUseCase } from '../../../application/use-cases/word/create-many-words/CreateManyWordsUseCase';
import { ManageWordUseCase } from '../../../application/use-cases/word/ManageWordUseCase';
import { Word } from '../../../domain/entities/Word';
import { WordSense } from '../../../domain/entities/WordSense';
import { CreateWordDto, BulkWordsDto } from './dto/create-word.dto';
import { SearchWordFilterDto } from './dto/search-word-filter.dto';
import { Admin } from '../../security';
import { wordView } from '../../serializers';
@Controller('words')
export class WordController {
  constructor(
    private readonly create: CreateWordUseCase,
    private readonly get: GetWordByIdUseCase,
    private readonly daily: GetDailyWord,
    private readonly search: SearchWordUseCase,
    private readonly bulk: CreateManyWordsUseCase,
    private readonly manage: ManageWordUseCase,
  ) {}
  @Get('daily') async featured() {
    const word = await this.daily.execute();
    return { word: word ? wordView(word) : null };
  }
  @Get(':id') async byId(@Param('id', ParseUUIDPipe) id: string) {
    return wordView(await this.get.execute(id));
  }
  @Get() async all(@Query() q: SearchWordFilterDto) {
    const r = await this.search.execute(q);
    return { ...r, data: r.data.map(wordView) };
  }
  @Admin() @Post() async add(@Body() dto: CreateWordDto) {
    return wordView(await this.create.execute(dto));
  }
  @Admin() @Post('bulk') addMany(@Body() dto: BulkWordsDto) {
    return this.bulk.execute(
      dto.words.map(
        (w) => new Word({ ...w, sense: w.sense.map((s) => new WordSense(s)) }),
      ),
    );
  }
  @Admin() @Put(':id') async replace(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateWordDto,
  ) {
    return wordView(await this.manage.update(id, dto));
  }
  @Admin() @Delete(':id') @HttpCode(204) async remove(
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    await this.manage.delete(id);
  }
}
