import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { SwaggerModule, DocumentBuilder } from "@nestjs/swagger";
import helmet from "helmet";
import { ConnectionModule } from "./connection.module";
import { CONFIG, Config } from "./config";
import { Errors } from "./common";
export async function bootstrap() {
  const app = await NestFactory.create(ConnectionModule);
  const cfg = app.get<Config>(CONFIG);
  app.use(helmet());
  app.enableCors({ origin: cfg.CORS_ORIGINS.split(",").map((s) => s.trim()) });
  app.setGlobalPrefix("api/v1");
  app.useGlobalFilters(new Errors());
  app.enableShutdownHooks();
  SwaggerModule.setup(
    "docs",
    app,
    SwaggerModule.createDocument(
      app,
      new DocumentBuilder()
        .setTitle("GreenSteps · Task 2")
        .setDescription(
          "Kiểm tra API và database. Chưa có chức năng tài khoản.",
        )
        .setVersion("0.2.0")
        .build(),
    ),
  );
  await app.listen(cfg.PORT, "0.0.0.0");
  console.log(`API: http://localhost:${cfg.PORT}/api/v1/health`);
  return app;
}
if (require.main === module)
  bootstrap().catch(() => {
    console.error(
      "Chưa khởi động được API. Kiểm tra DATABASE_URL và database.",
    );
    process.exitCode = 1;
  });
