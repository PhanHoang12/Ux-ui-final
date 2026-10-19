import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { SwaggerModule, DocumentBuilder } from "@nestjs/swagger";
import helmet from "helmet";
import { AppModule } from "./app.module";
import { CONFIG, Config } from "./config";
import { Errors } from "./common";
export async function bootstrap() {
  const app = await NestFactory.create(AppModule);
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
        .setTitle("GreenSteps · Task 5")
        .setDescription(
          "Đăng ký, OTP email, đăng nhập, refresh, logout và tài khoản hiện tại.",
        )
        .setVersion("0.5.0")
        .addBearerAuth()
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
