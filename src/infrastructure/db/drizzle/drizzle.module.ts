import { Global, Module } from "@nestjs/common";
import { DRIZZLE, drizzleProvider } from "./drizzle.provider";

@Global()
@Module({
  imports: [],
  providers: [drizzleProvider],
  exports: [DRIZZLE]
})
export class DrizzleModule {};