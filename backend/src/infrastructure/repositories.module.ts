import { Global, Module } from '@nestjs/common';
import { DrizzleWordRepository } from './repositories/DrizzleWordRepository';
import { DrizzleModule } from './db/drizzle/drizzle.module';
import { DrizzleCardRepository } from './repositories/DrizzleCardRepository';
import { DrizzleUserRepository } from './repositories/DrizzleUserRepository';

@Global()
@Module({
  imports: [DrizzleModule],
  providers: [
    { provide: 'IWordRepository', useClass: DrizzleWordRepository },
    { provide: 'ICardRepository', useClass: DrizzleCardRepository },
    { provide: 'IUserRepository', useClass: DrizzleUserRepository },
  ],
  exports: ['IWordRepository', 'ICardRepository', 'IUserRepository'],
})
export class RepositoriesModule {}
