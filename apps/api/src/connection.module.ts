import { Controller, Get, Inject, Module } from "@nestjs/common";
import { CONFIG, readConnectionConfig } from "./config";
import { Database } from "./db";
import { fail } from "./common";
@Controller()
export class ConnectionController {
  constructor(@Inject(Database) private readonly db: Database) {}
  @Get("health")
  async health() {
    try {
      await this.db.$queryRaw`SELECT 1`;
      return {
        status: "ok",
        service: "greensteps-api",
        database: "connected",
        checkedAt: new Date().toISOString(),
      };
    } catch {
      fail(
        503,
        "DATABASE_UNAVAILABLE",
        "API đang chạy nhưng chưa kết nối được database.",
      );
    }
  }
}
@Module({
  controllers: [ConnectionController],
  providers: [{ provide: CONFIG, useFactory: readConnectionConfig }, Database],
  exports: [CONFIG, Database],
})
export class ConnectionModule {}
