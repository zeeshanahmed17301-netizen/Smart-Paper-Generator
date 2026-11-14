import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { env } from "../../config/env.js";
import { HttpError } from "../../shared/errors.js";
import { UserModel } from "./user.model.js";
import type { LoginInput, RegisterInput } from "./auth.schemas.js";

export interface PublicUser {
  id: string;
  name: string;
  email: string;
}

function toPublicUser(user: { _id: { toString(): string }; name: string; email: string }): PublicUser {
  return { id: user._id.toString(), name: user.name, email: user.email };
}

export async function register(input: RegisterInput): Promise<{ user: PublicUser; token: string }> {
  const email = input.email.toLowerCase();
  if (await UserModel.exists({ email })) {
    throw new HttpError(409, "An account with this email already exists.");
  }

  const passwordHash = await bcrypt.hash(input.password, 12);
  try {
    const user = await UserModel.create({ name: input.name, email, passwordHash });
    return { user: toPublicUser(user), token: createToken(user.id) };
  } catch (error) {
    if (isDuplicateKeyError(error)) {
      throw new HttpError(409, "An account with this email already exists.");
    }
    throw error;
  }
}

export async function login(input: LoginInput): Promise<{ user: PublicUser; token: string }> {
  const user = await UserModel.findOne({ email: input.email.toLowerCase() }).select("+passwordHash");
  if (!user || !(await bcrypt.compare(input.password, user.passwordHash))) {
    throw new HttpError(401, "Email or password is incorrect.");
  }
  return { user: toPublicUser(user), token: createToken(user.id) };
}

export function createToken(userId: string): string {
  return jwt.sign({ sub: userId }, env.JWT_SECRET, { expiresIn: "7d" });
}

function isDuplicateKeyError(error: unknown): error is { code: number } {
  return typeof error === "object" && error !== null && "code" in error && error.code === 11000;
}
