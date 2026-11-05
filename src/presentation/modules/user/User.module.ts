import { Module } from "@nestjs/common";
import { UserController } from "./User.controller";

@Module({
  controllers: [UserController],
})
export class UserModule {};