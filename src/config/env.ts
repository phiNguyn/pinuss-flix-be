import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  PORT: z.string().default("3000"),
  MONGODB_URI: z.string().default(`${process.env.DATABASE_URL}/movie-app`),
  JWT_SECRET: z.string().min(1).default("dev-secret"),
  JWT_REFRESH_SECRET: z.string().min(1).default("dev-refresh-secret"),
  JWT_EXPIRES_IN: z.string().default("15m"),
  JWT_REFRESH_EXPIRES_IN: z.string().default("7d"),
  GOOGLE_CLIENT_ID: z.string().default(""),
  GOOGLE_CLIENT_SECRET: z.string().default(""),
  FRONTEND_URL: z.string().default("http://localhost:3000"),
});

export type EnvConfig = z.infer<typeof envSchema>;

let env: EnvConfig;

export function loadEnv(): EnvConfig {
  if (env) return env;

  const parsed = envSchema.safeParse({
    PORT: process.env.PORT,
    MONGODB_URI: process.env.MONGODB_URI,
    JWT_SECRET: process.env.JWT_SECRET,
    JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET,
    JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN,
    JWT_REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN,
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
    FRONTEND_URL: process.env.FRONTEND_URL,
  });

  if (!parsed.success) {
    console.warn("Invalid environment variables, using defaults:", parsed.error.flatten());
  }

  env = parsed.success ? parsed.data : envSchema.parse({});
  return env;
}
