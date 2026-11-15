import { Global, Module } from '@nestjs/common';
import { DatabasePool, DRIZZLE, drizzleProvider } from './drizzle.provider';
@Global()
@Module({
  providers: [DatabasePool, drizzleProvider],
  exports: [DatabasePool, DRIZZLE],
})
export class DrizzleModule {}
