import { config as loadEnv } from "dotenv";
import { isIP } from "node:net";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";

loadEnv({ path: resolve(dirname(fileURLToPath(import.meta.url)), "../../../.env") });

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(4000),
  MONGODB_URI: z.string().min(1, "MONGODB_URI is required"),
  MONGODB_DNS_SERVERS: z
    .string()
    .optional()
    .transform((value) => value?.split(",").map((server) => server.trim()))
    .refine(
      (servers) => servers === undefined || servers.every((server) => isIP(server) !== 0),
      "MONGODB_DNS_SERVERS must be a comma-separated list of IP addresses",
    ),
  JWT_SECRET: z.string().min(32, "JWT_SECRET must be at least 32 characters"),
  FRONTEND_ORIGIN: z.string().url().default("http://localhost:5173"),
});

export const env = envSchema.parse(process.env);
