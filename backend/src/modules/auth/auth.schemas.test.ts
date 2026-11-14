import { describe, expect, it } from "vitest";
import { loginSchema, registerSchema } from "./auth.schemas.js";

describe("authentication request schemas", () => {
  it("accepts a valid registration and normalizes whitespace in the name", () => {
    expect(registerSchema.parse({
      name: "  Ayesha Khan ",
      email: "teacher@example.com",
      password: "classroom123",
    })).toEqual({
      name: "Ayesha Khan",
      email: "teacher@example.com",
      password: "classroom123",
    });
  });

  it("rejects short passwords and invalid email addresses", () => {
    expect(registerSchema.safeParse({
      name: "Teacher",
      email: "not-an-email",
      password: "short",
    }).success).toBe(false);
    expect(loginSchema.safeParse({
      email: "teacher@example.com",
      password: "short",
    }).success).toBe(false);
  });

  it("rejects passwords that exceed bcrypt's byte limit", () => {
    expect(loginSchema.safeParse({
      email: "teacher@example.com",
      password: "🔑".repeat(19),
    }).success).toBe(false);
  });
});
