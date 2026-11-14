import type { RequestHandler } from "express";
import jwt from "jsonwebtoken";
import { env } from "../../config/env.js";
import { HttpError } from "../../shared/errors.js";

declare global {
  namespace Express {
    interface Request {
      userId?: string;
    }
  }
}

export const requireAuthentication: RequestHandler = (request, _response, next) => {
  const token = request.cookies?.session;
  if (!token) {
    next(new HttpError(401, "Please sign in to continue."));
    return;
  }

  try {
    const payload = jwt.verify(token, env.JWT_SECRET);
    if (typeof payload === "string" || typeof payload.sub !== "string") {
      throw new HttpError(401, "Your session is invalid. Please sign in again.");
    }
    request.userId = payload.sub;
    next();
  } catch {
    next(new HttpError(401, "Your session has expired. Please sign in again."));
  }
};
