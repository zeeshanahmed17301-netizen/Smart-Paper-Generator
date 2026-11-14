import cookieParser from "cookie-parser";
import cors from "cors";
import express, { type ErrorRequestHandler } from "express";
import helmet from "helmet";
import { env } from "./config/env.js";
import { authRouter } from "./modules/auth/auth.routes.js";
import { materialsRouter } from "./modules/workspace/materials.routes.js";
import { questionsRouter } from "./modules/workspace/questions.routes.js";
import { HttpError } from "./shared/errors.js";

export const app = express();

app.use(helmet());
app.use(cors({ origin: env.FRONTEND_ORIGIN, credentials: true }));
app.use(express.json({ limit: "1mb" }));
app.use(cookieParser());

app.get("/api/health", (_request, response) => {
  response.json({ status: "ok" });
});
app.use("/api/auth", authRouter);
app.use("/api/materials", materialsRouter);
app.use("/api/questions", questionsRouter);
app.use((_request, response) => {
  response.status(404).json({ message: "The requested resource was not found." });
});

const errorHandler: ErrorRequestHandler = (error: unknown, _request, response, _next) => {
  if (error instanceof HttpError) {
    response.status(error.statusCode).json({ message: error.message });
    return;
  }
  console.error("Unhandled request error:", error);
  response.status(500).json({ message: "An unexpected error occurred." });
};

app.use(errorHandler);
