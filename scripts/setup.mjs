import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { randomBytes } from "node:crypto";
const password = existsSync(".env")
  ? readFileSync(".env", "utf8").match(/^POSTGRES_PASSWORD=(.+)$/m)?.[1]
  : randomBytes(24).toString("base64url");
if (!password) throw new Error("Root .env cần có POSTGRES_PASSWORD.");
if (!existsSync(".env"))
  writeFileSync(".env", "POSTGRES_PASSWORD=" + password + "\n", {
    mode: 0o600,
  });
if (!existsSync("apps/api/.env"))
  writeFileSync(
    "apps/api/.env",
    `PORT=3000\nDB_POOL_MAX=5\nDATABASE_URL=postgresql://greensteps:${password}@localhost:5433/greensteps\nCORS_ORIGINS=http://localhost:8081\n`,
    { mode: 0o600 },
  );
if (!existsSync("apps/mobile/.env"))
  writeFileSync(
    "apps/mobile/.env",
    "EXPO_PUBLIC_API_URL=http://localhost:3000/api/v1\n",
  );
console.log(
  "Đã tạo cấu hình local. Trên điện thoại, thay localhost trong apps/mobile/.env bằng IP LAN của máy chạy API.",
);
