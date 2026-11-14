import { describe, expect, it } from "vitest";
import { HttpError } from "../../shared/errors.js";
import { extractMaterialText, getSafeOriginalName } from "./material.service.js";

function makeTextFile(name: string, value: string): Express.Multer.File {
  const buffer = Buffer.from(value, "utf8");
  return {
    fieldname: "file",
    originalname: name,
    encoding: "7bit",
    mimetype: "text/plain",
    size: buffer.length,
    buffer,
  } as Express.Multer.File;
}

describe("material extraction", () => {
  it("extracts and normalizes text documents", async () => {
    const text = await extractMaterialText(makeTextFile("lesson.txt", "  Fractions\r\nand ratios  "));
    expect(text).toBe("Fractions\nand ratios");
  });

  it("rejects documents with no extractable text", async () => {
    await expect(extractMaterialText(makeTextFile("empty.txt", " \n "))).rejects.toMatchObject({
      statusCode: 400,
    });
  });

  it("removes path components from uploaded filenames", () => {
    expect(getSafeOriginalName("C:\\fakepath\\lesson.txt")).toBe("lesson.txt");
  });

  it("rejects unsupported file types explicitly", async () => {
    await expect(extractMaterialText(makeTextFile("lesson.exe", "data"))).rejects.toBeInstanceOf(HttpError);
  });
});
