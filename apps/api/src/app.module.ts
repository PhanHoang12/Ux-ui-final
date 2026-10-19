import { Module } from "@nestjs/common";
import { ConnectionModule } from "./connection.module";
import { AuthModule } from "./auth/auth.module";
@Module({ imports: [ConnectionModule, AuthModule] })
export class AppModule {}
