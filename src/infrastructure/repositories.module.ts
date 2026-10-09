import { Global, Module } from "@nestjs/common";
import { DrizzleWordRepository } from "./repositories/DrizzleWordRepository";
import { DrizzleModule } from "./db/drizzle/drizzle.module";

@Global()
@Module({
  imports: [DrizzleModule],
  providers: [
    {provide: 'IWordRepository', useClass: DrizzleWordRepository}
  ],
  exports: [
    'IWordRepository'
  ],
})
export class RepositoriesModule {};