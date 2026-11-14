import { describe, expect, it } from "vitest";
import { createQuestionSchema } from "./workspace.schemas.js";

describe("workspace schemas", () => {
  it("accepts a complete multiple-choice question", () => {
    const result = createQuestionSchema.safeParse({
      prompt: "Which fraction is equivalent to one half?",
      type: "mcq",
      options: ["2/4", "1/3", "3/5", "2/5"],
      answer: "2/4",
      explanation: "",
      language: "en",
    });

    expect(result.success).toBe(true);
  });

  it("requires the correct number of choices for choice-based questions", () => {
    const result = createQuestionSchema.safeParse({
      prompt: "Is 2 greater than 1?",
      type: "true_false",
      options: ["True"],
      answer: "True",
      language: "en",
    });

    expect(result.success).toBe(false);
  });

  it("requires choice-based answers to match one of the options", () => {
    const result = createQuestionSchema.safeParse({
      prompt: "Which fraction is equivalent to one half?",
      type: "mcq",
      options: ["2/4", "1/3"],
      answer: "1/2",
      language: "en",
    });

    expect(result.success).toBe(false);
  });
});
