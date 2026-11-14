import type { RequestHandler } from "express";
import type { ZodType } from "zod";
import { HttpError } from "../shared/errors.js";

export function validateBody(schema: ZodType): RequestHandler {
  return (request, _response, next) => {
    const result = schema.safeParse(request.body);
    if (!result.success) {
      next(new HttpError(400, result.error.issues[0]?.message ?? "Invalid request body."));
      return;
    }
    request.body = result.data;
    next();
  };
}
