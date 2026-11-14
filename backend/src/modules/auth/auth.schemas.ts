import { Buffer } from "node:buffer";
import { z } from "zod";

const emailSchema = z.string().trim().email().max(254);
const passwordSchema = z
  .string()
  .min(8)
  .max(128)
  .refine((password) => Buffer.byteLength(password, "utf8") <= 72, "Password must be 72 bytes or fewer.");

export const registerSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: emailSchema,
  password: passwordSchema,
});

export const loginSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
