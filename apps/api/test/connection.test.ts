import "reflect-metadata";
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { PGlite } from "@electric-sql/pglite";
import { PGLiteSocketServer } from "@electric-sql/pglite-socket";
import { NestFactory } from "@nestjs/core";
import { INestApplication } from "@nestjs/common";
import { ConnectionModule } from "../src/connection.module";
import { Database } from "../src/db";
import { Errors } from "../src/common";
import { applyMigrations } from "./migrations";
let app: INestApplication,
  lite: PGlite,
  socket: PGLiteSocketServer,
  base: string;
before(async () => {
  lite = await PGlite.create();
  await applyMigrations(lite);
  socket = new PGLiteSocketServer({
    db: lite,
    host: "127.0.0.1",
    port: 15435,
    maxConnections: 2,
  });
  await socket.start();
  process.env.DATABASE_URL =
    "postgresql://postgres:postgres@127.0.0.1:15435/postgres";
  process.env.DB_POOL_MAX = "1";
  app = await NestFactory.create(ConnectionModule, { logger: false });
  app.setGlobalPrefix("api/v1");
  app.useGlobalFilters(new Errors());
  await app.listen(0, "127.0.0.1");
  base = (await app.getUrl()) + "/api/v1";
});
after(async () => {
  await app?.close();
  await socket?.stop();
  await lite?.close();
});
test("Task 2: HTTP API kiểm tra kết nối database qua Prisma (PGlite)", async () => {
  const res = await fetch(base + "/health");
  const data = await res.json();
  assert.equal(res.status, 200);
  assert.equal(data.status, "ok");
  assert.equal(data.database, "connected");
  assert.ok(Date.parse(data.checkedAt));
});
test("Task 5: migration tạo đủ 14 bảng nền, health vẫn hoạt động", async () => {
  const rows = await app.get(Database).$queryRaw<
    { count: bigint }[]
  >`SELECT count(*) FROM information_schema.tables WHERE table_schema='public'`;
  assert.equal(Number(rows[0]?.count), 14);
});
test("Module health không tự đăng ký controller tài khoản", async () => {
  const res = await fetch(base + "/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "{}",
  });
  assert.equal(res.status, 404);
});
test("Task 2: database ngắt kết nối thì health trả 503", async () => {
  await app.get(Database).$disconnect();
  await socket.stop();
  const res = await fetch(base + "/health");
  const data = await res.json();
  assert.equal(res.status, 503);
  assert.equal(data.error.code, "DATABASE_UNAVAILABLE");
  assert.ok(!JSON.stringify(data).includes("postgresql://"));
});
