import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
} from '@nestjs/common';
import { ManageWordSenses } from '../../../application/use-cases/word/ManageWordSenses';
import { Admin } from '../../security';
import { senseView } from '../../serializers';
import { WordSenseDto } from './dto/create-word.dto';

@Controller('words/:wordId/senses')
export class WordSenseController {
  constructor(private readonly senses: ManageWordSenses) {}

  @Get()
  async list(@Param('wordId', ParseUUIDPipe) wordId: string) {
    return (await this.senses.list(wordId)).map(senseView);
  }

  @Get(':id')
  async get(
    @Param('wordId', ParseUUIDPipe) wordId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return senseView(await this.senses.get(wordId, id));
  }

  @Admin()
  @Post()
  async add(
    @Param('wordId', ParseUUIDPipe) wordId: string,
    @Body() dto: WordSenseDto,
  ) {
    return senseView(await this.senses.add(wordId, dto));
  }

  @Admin()
  @Put(':id')
  async replace(
    @Param('wordId', ParseUUIDPipe) wordId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: WordSenseDto,
  ) {
    return senseView(await this.senses.replace(wordId, id, dto));
  }

  @Admin()
  @Delete(':id')
  @HttpCode(204)
  async remove(
    @Param('wordId', ParseUUIDPipe) wordId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    await this.senses.remove(wordId, id);
  }
}
