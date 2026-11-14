import { basename, extname } from "node:path";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";
import mammoth from "mammoth";
import { HttpError } from "../../shared/errors.js";

const maximumTextLength = 200_000;
const maximumPdfPages = 200;
const docxMimeType = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

export function getSafeOriginalName(filename: string): string {
  return basename(filename.replace(/\\/g, "/")).replace(/[\u0000-\u001f\u007f]/g, "").slice(0, 255);
}

export async function extractMaterialText(file: Express.Multer.File): Promise<string> {
  const extension = extname(file.originalname).toLowerCase();
  let text: string;

  if (extension === ".txt" || extension === ".md") {
    text = file.buffer.toString("utf8").replace(/\u0000/g, "");
  } else if (extension === ".docx") {
    try {
      const result = await mammoth.extractRawText({ buffer: file.buffer });
      text = result.value;
    } catch {
      throw new HttpError(400, "This DOCX file could not be read.");
    }
  } else if (extension === ".pdf") {
    try {
      const document = await getDocument({ data: new Uint8Array(file.buffer) }).promise;
      if (document.numPages > maximumPdfPages) {
        await document.destroy();
        throw new HttpError(413, `PDF files may not exceed ${maximumPdfPages} pages.`);
      }

      const pages: string[] = [];
      for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
        const page = await document.getPage(pageNumber);
        const content = await page.getTextContent();
        pages.push(content.items.map((item) => ("str" in item ? item.str : "")).join(" "));
      }
      await document.destroy();
      text = pages.join("\n");
    } catch (error) {
      if (error instanceof HttpError) throw error;
      throw new HttpError(400, "This PDF could not be read or contains no extractable text.");
    }
  } else {
    throw new HttpError(400, "Upload a PDF, DOCX, TXT, or Markdown file.");
  }

  const normalizedText = text.replace(/\r\n/g, "\n").trim();
  if (!normalizedText) {
    throw new HttpError(400, "The uploaded file contains no extractable text.");
  }
  if (normalizedText.length > maximumTextLength) {
    throw new HttpError(413, "The extracted document text exceeds the 200,000 character limit.");
  }
  return normalizedText;
}

export function getMaterialTitle(title: unknown, originalName: string): string {
  if (typeof title === "string" && title.trim()) {
    const trimmedTitle = title.trim();
    if (trimmedTitle.length > 120) {
      throw new HttpError(400, "Material titles must be 120 characters or fewer.");
    }
    return trimmedTitle;
  }
  return basename(originalName, extname(originalName)).slice(0, 120) || "Untitled material";
}

export function isSupportedMaterialFile(file: Express.Multer.File): boolean {
  const extension = extname(file.originalname).toLowerCase();
  if (extension === ".pdf") return file.mimetype === "application/pdf";
  if (extension === ".docx") return file.mimetype === docxMimeType;
  if (extension === ".txt" || extension === ".md") {
    return ["text/plain", "text/markdown", "application/octet-stream"].includes(file.mimetype);
  }
  return false;
}
