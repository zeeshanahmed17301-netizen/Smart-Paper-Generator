import { Router, type RequestHandler } from "express";
import multer from "multer";
import { requireAuthentication } from "../auth/auth.middleware.js";
import { asyncHandler } from "../../shared/async-handler.js";
import { HttpError } from "../../shared/errors.js";
import { deleteMaterial, listMaterials, uploadMaterial } from "./materials.controller.js";
import { isSupportedMaterialFile } from "./material.service.js";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024, files: 1 },
  fileFilter(_request, file, callback) {
    if (!isSupportedMaterialFile(file)) {
      callback(new HttpError(400, "Upload a PDF, DOCX, TXT, or Markdown file."));
      return;
    }
    callback(null, true);
  },
});

const receiveMaterialFile: RequestHandler = (request, response, next) => {
  upload.single("file")(request, response, (error: unknown) => {
    if (error instanceof multer.MulterError) {
      const status = error.code === "LIMIT_FILE_SIZE" ? 413 : 400;
      const message = error.code === "LIMIT_FILE_SIZE"
        ? "Uploaded files may not exceed 10 MB."
        : "Unable to process the uploaded file.";
      next(new HttpError(status, message));
      return;
    }
    next(error);
  });
};

export const materialsRouter = Router();

materialsRouter.use(requireAuthentication);
materialsRouter.get("/", asyncHandler(listMaterials));
materialsRouter.post("/", receiveMaterialFile, asyncHandler(uploadMaterial));
materialsRouter.delete("/:id", asyncHandler(deleteMaterial));
