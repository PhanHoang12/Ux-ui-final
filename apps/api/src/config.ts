import "dotenv/config";
import { z } from "zod";
const schema = z.object({
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  DATABASE_URL: z.string().min(1),
  DB_POOL_MAX: z.coerce.number().int().min(1).max(20).default(5),
  CORS_ORIGINS: z.string().default("http://localhost:8081"),
  AUTH_SECRET: z.string().min(32).optional(),
  SMTP_HOST: z.string().min(1).optional(),
  SMTP_PORT: z.coerce.number().int().min(1).max(65535).default(587),
  SMTP_USER: z.string().min(1).optional(),
  SMTP_PASS: z.string().min(1).optional(),
  SMTP_FROM: z.string().min(1).optional(),
});
export type Config = z.infer<typeof schema>;
export const CONFIG = Symbol("CONFIG");
export const readConnectionConfig = () => schema.parse(process.env);
