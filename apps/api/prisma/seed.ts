import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma";
import { PrismaPg } from "@prisma/adapter-pg";
import { seedRoles } from "./seed-roles";

async function main() {
  const connectionString = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
  if (!connectionString) throw new Error("Chưa cấu hình DATABASE_URL.");
  const db = new PrismaClient({
    adapter: new PrismaPg({ connectionString, max: 1 }),
  });
  try {
    await seedRoles(db);
    console.log(
      "Đã khởi tạo 4 vai trò. Không tạo tài khoản hoặc mật khẩu mẫu.",
    );
  } finally {
    await db.$disconnect();
  }
}

main().catch(() => {
  console.error("Seed thất bại. Kiểm tra cấu hình và chạy db:deploy trước.");
  process.exitCode = 1;
});
