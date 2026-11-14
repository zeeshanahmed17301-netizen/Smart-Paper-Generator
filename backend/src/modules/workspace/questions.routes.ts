import { Router } from "express";
import { requireAuthentication } from "../auth/auth.middleware.js";
import { validateBody } from "../../middleware/validate.js";
import { asyncHandler } from "../../shared/async-handler.js";
import {
  createQuestion,
  deleteQuestion,
  listQuestions,
  updateQuestion,
} from "./questions.controller.js";
import {
  createQuestionSchema,
  updateQuestionSchema,
} from "./workspace.schemas.js";

export const questionsRouter = Router();

questionsRouter.use(requireAuthentication);
questionsRouter.get("/", asyncHandler(listQuestions));
questionsRouter.post("/", validateBody(createQuestionSchema), asyncHandler(createQuestion));
questionsRouter.patch("/:id", validateBody(updateQuestionSchema), asyncHandler(updateQuestion));
questionsRouter.delete("/:id", asyncHandler(deleteQuestion));
