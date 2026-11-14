import type { Request, Response } from "express";
import mongoose, { type HydratedDocument } from "mongoose";
import { HttpError } from "../../shared/errors.js";
import { MaterialModel } from "./material.model.js";
import { QuestionModel, type QuestionDocument } from "./question.model.js";
import type { CreateQuestionInput, UpdateQuestionInput } from "./workspace.schemas.js";

function serializeQuestion(question: HydratedDocument<QuestionDocument>) {
  return {
    id: question.id,
    materialId: question.materialId?.toString() ?? null,
    prompt: question.prompt,
    type: question.type,
    options: question.options,
    answer: question.answer,
    explanation: question.explanation,
    language: question.language,
    status: question.status,
    source: question.source,
    createdAt: question.createdAt,
    updatedAt: question.updatedAt,
  };
}

function getOwnerId(request: Request): string {
  if (!request.userId) throw new HttpError(401, "Please sign in to continue.");
  return request.userId;
}

async function ensureOwnedMaterial(ownerId: string, materialId?: string | null): Promise<void> {
  if (!materialId) return;
  const exists = await MaterialModel.exists({ _id: materialId, ownerId });
  if (!exists) throw new HttpError(404, "Material not found.");
}

export async function listQuestions(request: Request, response: Response): Promise<void> {
  const status = request.query.status;
  if (status !== undefined && status !== "draft" && status !== "approved") {
    throw new HttpError(400, "Question status must be draft or approved.");
  }
  const filter = status
    ? { ownerId: getOwnerId(request), status }
    : { ownerId: getOwnerId(request) };
  const questions = await QuestionModel.find(filter).sort({ createdAt: -1 });
  response.json({ questions: questions.map(serializeQuestion) });
}

export async function createQuestion(request: Request, response: Response): Promise<void> {
  const ownerId = getOwnerId(request);
  const input = request.body as CreateQuestionInput;
  await ensureOwnedMaterial(ownerId, input.materialId);
  const question = await QuestionModel.create({
    ...input,
    ownerId: new mongoose.Types.ObjectId(ownerId),
    materialId: input.materialId ? new mongoose.Types.ObjectId(input.materialId) : null,
    status: "draft",
    source: "manual",
  });
  response.status(201).json({ question: serializeQuestion(question) });
}

export async function updateQuestion(request: Request, response: Response): Promise<void> {
  if (!mongoose.isValidObjectId(request.params.id)) {
    throw new HttpError(404, "Question not found.");
  }
  const ownerId = getOwnerId(request);
  const input = request.body as UpdateQuestionInput;
  await ensureOwnedMaterial(ownerId, input.materialId);
  const question = await QuestionModel.findOneAndUpdate(
    { _id: request.params.id, ownerId },
    { ...input, materialId: input.materialId ?? null },
    { new: true, runValidators: true },
  );
  if (!question) throw new HttpError(404, "Question not found.");
  response.json({ question: serializeQuestion(question) });
}

export async function deleteQuestion(request: Request, response: Response): Promise<void> {
  if (!mongoose.isValidObjectId(request.params.id)) {
    throw new HttpError(404, "Question not found.");
  }
  const question = await QuestionModel.findOneAndDelete({
    _id: request.params.id,
    ownerId: getOwnerId(request),
  });
  if (!question) throw new HttpError(404, "Question not found.");
  response.status(204).end();
}
