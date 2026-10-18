import { cpSync, mkdirSync } from "node:fs";
mkdirSync("dist/src/generated", { recursive: true });
cpSync("src/generated/prisma", "dist/src/generated/prisma", {
  recursive: true,
});
