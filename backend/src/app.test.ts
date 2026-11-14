import { beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import jwt from "jsonwebtoken";
import { app } from "./app.js";
import { login, register } from "./modules/auth/auth.service.js";

vi.mock("./modules/auth/auth.service.js", () => ({
  register: vi.fn(),
  login: vi.fn(),
}));

describe("API foundation", () => {
  beforeEach(() => {
    vi.mocked(register).mockReset();
    vi.mocked(login).mockReset();
  });

  it("returns a healthy status", async () => {
    const response = await request(app).get("/api/health");
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: "ok" });
  });

  it.each(["/api/materials", "/api/questions"])(
    "requires a session for %s",
    async (path) => {
      const response = await request(app).get(path);
      expect(response.status).toBe(401);
    },
  );

  it("rejects malformed registration before accessing the database", async () => {
    const response = await request(app).post("/api/auth/register").send({
      name: "T",
      email: "invalid",
      password: "short",
    });
    expect(response.status).toBe(400);
    expect(response.body.message).toBeTruthy();
  });

  it("creates an account session with an HTTP-only cookie", async () => {
    const user = { id: "user-123", name: "Ayesha Khan", email: "teacher@example.com" };
    const token = jwt.sign(
      { sub: user.id },
      "test-secret-that-is-at-least-32-characters-long",
      { expiresIn: "7d" },
    );
    vi.mocked(register).mockResolvedValue({ user, token });

    const response = await request(app).post("/api/auth/register").send({
      name: user.name,
      email: user.email,
      password: "classroom123",
    });

    expect(response.status).toBe(201);
    expect(response.body).toEqual({ user });
    expect(response.headers["set-cookie"][0]).toContain("HttpOnly");
  });

  it("signs in an existing account", async () => {
    const user = { id: "user-123", name: "Ayesha Khan", email: "teacher@example.com" };
    const token = jwt.sign(
      { sub: user.id },
      "test-secret-that-is-at-least-32-characters-long",
      { expiresIn: "7d" },
    );
    vi.mocked(login).mockResolvedValue({ user, token });

    const response = await request(app).post("/api/auth/login").send({
      email: user.email,
      password: "classroom123",
    });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ user });
    expect(response.headers["set-cookie"][0]).toContain("HttpOnly");
  });

  it("requires a session to load the current user", async () => {
    const response = await request(app).get("/api/auth/me");
    expect(response.status).toBe(401);
  });
});
