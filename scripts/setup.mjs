import {
  existsSync,
  readFileSync,
  writeFileSync,
  appendFileSync,
} from "node:fs";
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

// Append only: preserve the existing Neon URL and all user SMTP settings.
if (!/^AUTH_SECRET=.+/m.test(readFileSync("apps/api/.env", "utf8"))) {
  appendFileSync(
    "apps/api/.env",
    "\nAUTH_SECRET=" + randomBytes(32).toString("hex") + "\n",
    { mode: 0o600 },
  );
  console.log("Đã tạo AUTH_SECRET cục bộ. Không đưa .env lên GitHub.");
}
