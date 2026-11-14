import type { Request, Response } from "express";
import mongoose, { type HydratedDocument } from "mongoose";
import { HttpError } from "../../shared/errors.js";
import { MaterialModel, type MaterialDocument } from "./material.model.js";
import { extractMaterialText, getMaterialTitle, getSafeOriginalName } from "./material.service.js";
import { QuestionModel } from "./question.model.js";

function serializeMaterial(material: HydratedDocument<MaterialDocument>) {
  return {
    id: material.id,
    title: material.title,
    originalName: material.originalName,
    mimeType: material.mimeType,
    sizeBytes: material.sizeBytes,
    createdAt: material.createdAt,
  };
}

function getOwnerId(request: Request): string {
  if (!request.userId) throw new HttpError(401, "Please sign in to continue.");
  return request.userId;
}

export async function listMaterials(request: Request, response: Response): Promise<void> {
  const materials = await MaterialModel.find({ ownerId: getOwnerId(request) })
    .sort({ createdAt: -1 });
  response.json({ materials: materials.map(serializeMaterial) });
}

export async function uploadMaterial(request: Request, response: Response): Promise<void> {
  const file = request.file;
  if (!file) throw new HttpError(400, "Choose a document to upload.");

  const originalName = getSafeOriginalName(file.originalname);
  const textContent = await extractMaterialText(file);
  const material = await MaterialModel.create({
    ownerId: getOwnerId(request),
    title: getMaterialTitle(request.body?.title, originalName),
    originalName,
    mimeType: file.mimetype,
    sizeBytes: file.size,
    textContent,
  });
  response.status(201).json({ material: serializeMaterial(material) });
}

export async function deleteMaterial(request: Request, response: Response): Promise<void> {
  if (!mongoose.isValidObjectId(request.params.id)) {
    throw new HttpError(404, "Material not found.");
  }
  const ownerId = getOwnerId(request);
  const material = await MaterialModel.findOneAndDelete({
    _id: request.params.id,
    ownerId,
  });
  if (!material) throw new HttpError(404, "Material not found.");
  await QuestionModel.updateMany(
    { ownerId, materialId: material._id },
    { $set: { materialId: null } },
  );
  response.status(204).end();
}
