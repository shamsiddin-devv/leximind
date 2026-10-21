import { Global, Module } from "@nestjs/common";
import { DrizzleWordRepository } from "./repositories/DrizzleWordRepository";
import { DrizzleModule } from "./db/drizzle/drizzle.module";
import { DrizzleCardRepository } from "./repositories/DrizzleCardRepository";

@Global()
@Module({
  imports: [DrizzleModule],
  providers: [
    {provide: 'IWordRepository', useClass: DrizzleWordRepository},
    {provide: 'ICardRepository', useClass: DrizzleCardRepository}
  ],
  exports: [
    'IWordRepository',
    'ICardRepository'
  ],
})
export class RepositoriesModule {};