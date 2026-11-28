import {
  Body,
  Controller,
  Get,
  Header,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import {
  ArrayMaxSize,
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsIn,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';
import { LearningPath } from '../../../application/use-cases/learning/LearningPath';
import { CEFR_LEVELS, type CefrLevel } from '../../../domain/entities/Word';
import type { Identity } from '../../../domain/repositories/IAuthRepository';
import {
  vocabularyStatuses,
  type VocabularyStatus,
} from '../../../domain/repositories/ILearningPathRepository';
import { CurrentUser } from '../../security';
import { PaginationDto } from '../../pagination.dto';

class CompleteLessonsDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(60)
  @ArrayUnique()
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, { each: true })
  @MaxLength(64, { each: true })
  lessonIds!: string[];
}

class StudyVocabularyDto extends PaginationDto {
  @IsOptional()
  @IsIn(CEFR_LEVELS)
  cefrLevel?: CefrLevel;
  @IsOptional()
  @IsIn(['1'])
  suggested?: '1';
  @IsOptional()
  @IsIn(['1'])
  fromLessons?: '1';
  @IsOptional()
  @IsString()
  @MaxLength(80)
  search?: string;
  @IsOptional()
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  @MaxLength(60)
  topic?: string;
  @IsOptional()
  @IsIn(vocabularyStatuses)
  status?: VocabularyStatus;
}

@Controller('learning-path')
export class LearningPathController {
  constructor(private readonly learningPath: LearningPath) {}

  @Get()
  @Header('Cache-Control', 'no-store')
  progress(@CurrentUser() user: Identity) {
    return this.learningPath.progress(user.id);
  }

  @Post('complete')
  @HttpCode(200)
  @Header('Cache-Control', 'no-store')
  complete(@CurrentUser() user: Identity, @Body() body: CompleteLessonsDto) {
    return this.learningPath.complete(user.id, body.lessonIds);
  }

  @Get('vocabulary')
  @Header('Cache-Control', 'no-store')
  vocabulary(
    @CurrentUser() user: Identity,
    @Query() { suggested, fromLessons, ...filters }: StudyVocabularyDto,
  ) {
    return this.learningPath.vocabulary(user.id, {
      ...filters,
      suggested: suggested === '1',
      fromLessons: fromLessons === '1',
    });
  }

  @Get('vocabulary/:id')
  @Header('Cache-Control', 'no-store')
  word(@CurrentUser() user: Identity, @Param('id', ParseUUIDPipe) id: string) {
    return this.learningPath.word(user.id, id);
  }
}
