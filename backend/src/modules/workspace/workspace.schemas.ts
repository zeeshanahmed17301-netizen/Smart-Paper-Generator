import { z } from "zod";
import { questionLanguages, questionStatuses, questionTypes } from "./question.model.js";

const questionFields = {
  prompt: z.string().trim().min(1).max(2000),
  type: z.enum(questionTypes),
  options: z.array(z.string().trim().min(1).max(500)).max(8),
  answer: z.string().trim().min(1).max(4000),
  explanation: z.string().trim().max(4000).default(""),
  language: z.enum(questionLanguages),
};

function validateQuestionOptions(
  question: { type: string; options: string[]; answer?: string },
  context: z.RefinementCtx,
): void {
  if (question.type === "mcq" && question.options.length < 2) {
    context.addIssue({ code: "custom", path: ["options"], message: "MCQs need at least two options." });
  }
  if (question.type === "true_false" && question.options.length !== 2) {
    context.addIssue({ code: "custom", path: ["options"], message: "True/false questions need two options." });
  }
  if ((question.type === "mcq" || question.type === "true_false") && !question.options.includes(question.answer ?? "")) {
    context.addIssue({ code: "custom", path: ["answer"], message: "The answer must match one of the options." });
  }
  if (new Set(question.options).size !== question.options.length) {
    context.addIssue({ code: "custom", path: ["options"], message: "Question options must be unique." });
  }
}

export const createQuestionSchema = z
  .object({
    ...questionFields,
    materialId: z.string().regex(/^[a-f\d]{24}$/i).nullable().optional(),
  })
  .superRefine(validateQuestionOptions);

export const updateQuestionSchema = z
  .object({
    ...questionFields,
    materialId: z.string().regex(/^[a-f\d]{24}$/i).nullable().optional(),
    status: z.enum(questionStatuses),
  })
  .superRefine(validateQuestionOptions);

export type CreateQuestionInput = z.infer<typeof createQuestionSchema>;
export type UpdateQuestionInput = z.infer<typeof updateQuestionSchema>;
