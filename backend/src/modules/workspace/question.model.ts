import { model, Schema, Types } from "mongoose";

export const questionTypes = ["mcq", "short", "long", "true_false", "fill_blank"] as const;
export const questionLanguages = ["en", "ur"] as const;
export const questionStatuses = ["draft", "approved"] as const;
export const questionSources = ["manual", "ai"] as const;

export type QuestionType = (typeof questionTypes)[number];
export type QuestionLanguage = (typeof questionLanguages)[number];
export type QuestionStatus = (typeof questionStatuses)[number];
export type QuestionSource = (typeof questionSources)[number];

export interface QuestionDocument {
  ownerId: Types.ObjectId;
  materialId?: Types.ObjectId | null;
  prompt: string;
  type: QuestionType;
  options: string[];
  answer: string;
  explanation: string;
  language: QuestionLanguage;
  status: QuestionStatus;
  source: QuestionSource;
  createdAt: Date;
  updatedAt: Date;
}

const questionSchema = new Schema<QuestionDocument>(
  {
    ownerId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    materialId: { type: Schema.Types.ObjectId, ref: "Material", default: null },
    prompt: { type: String, required: true, trim: true, maxlength: 2000 },
    type: { type: String, enum: questionTypes, required: true },
    options: { type: [String], default: [] },
    answer: { type: String, required: true, trim: true, maxlength: 4000 },
    explanation: { type: String, default: "", maxlength: 4000 },
    language: { type: String, enum: questionLanguages, required: true },
    status: { type: String, enum: questionStatuses, default: "draft", required: true },
    source: { type: String, enum: questionSources, required: true },
  },
  { timestamps: true },
);

questionSchema.index({ ownerId: 1, status: 1, createdAt: -1 });

export const QuestionModel = model<QuestionDocument>("Question", questionSchema);
