import type { Request, Response } from "express";
import { HttpError } from "../../shared/errors.js";
import { login, register } from "./auth.service.js";
import { UserModel } from "./user.model.js";

const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

function setSessionCookie(response: Response, token: string): void {
  response.cookie("session", token, cookieOptions);
}

export async function registerAccount(request: Request, response: Response): Promise<void> {
  const result = await register(request.body);
  setSessionCookie(response, result.token);
  response.status(201).json({ user: result.user });
}

export async function loginAccount(request: Request, response: Response): Promise<void> {
  const result = await login(request.body);
  setSessionCookie(response, result.token);
  response.json({ user: result.user });
}

export function logoutAccount(_request: Request, response: Response): void {
  response.clearCookie("session", { ...cookieOptions, maxAge: undefined });
  response.status(204).end();
}

export async function getCurrentUser(request: Request, response: Response): Promise<void> {
  const userId = request.userId;
  if (!userId) {
    throw new HttpError(401, "Please sign in to continue.");
  }
  const user = await UserModel.findById(userId);
  if (!user) {
    throw new HttpError(401, "Your account is no longer available. Please sign in again.");
  }
  response.json({ user: { id: user.id, name: user.name, email: user.email } });
}
