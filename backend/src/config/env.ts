import "dotenv/config";
import { z } from "zod";

const schema = z.object({
  JWT_SECRET: z.string().min(32, "JWT_SECRET must be at least 32 characters"),
  CLIENT_URL: z.string().url(),
  PORT: z.coerce.number().default(4000),
  FAST2SMS_API_KEY: z.string().optional(),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
});
export const env = schema.parse(process.env);
