import { model, Schema, Types } from "mongoose";

export interface MaterialDocument {
  ownerId: Types.ObjectId;
  title: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  textContent: string;
  createdAt: Date;
  updatedAt: Date;
}

const materialSchema = new Schema<MaterialDocument>(
  {
    ownerId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    title: { type: String, required: true, trim: true, maxlength: 120 },
    originalName: { type: String, required: true, maxlength: 255 },
    mimeType: { type: String, required: true },
    sizeBytes: { type: Number, required: true, min: 1 },
    textContent: { type: String, required: true },
  },
  { timestamps: true },
);

export const MaterialModel = model<MaterialDocument>("Material", materialSchema);
