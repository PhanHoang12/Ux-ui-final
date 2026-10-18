import "dotenv/config";
import { z } from "zod";
const schema = z.object({
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  DATABASE_URL: z.string().min(1),
  DB_POOL_MAX: z.coerce.number().int().min(1).max(20).default(5),
  CORS_ORIGINS: z.string().default("http://localhost:8081"),
});
export type Config = z.infer<typeof schema>;
export const CONFIG = Symbol("CONFIG");
export const readConnectionConfig = () => schema.parse(process.env);
