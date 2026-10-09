import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DrizzleModule } from './infrastructure/db/drizzle/drizzle.module';
import { WordModule } from './presentation/modules/word/word.module';
import { APP_FILTER } from '@nestjs/core';
import { DomainExceptionFilter } from './presentation/filters/DomainExceptionFilter';
import { RepositoriesModule } from './infrastructure/repositories.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env'
    }),
    DrizzleModule,
    WordModule,
    RepositoriesModule,
  ],
  providers: [{provide: APP_FILTER, useClass: DomainExceptionFilter}],
})
export class AppModule {}
