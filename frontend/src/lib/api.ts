export interface User {
  id: string;
  name: string;
  email: string;
}

export interface Material {
  id: string;
  title: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: string;
}

export type QuestionType = "mcq" | "short" | "long" | "true_false" | "fill_blank";
export type QuestionLanguage = "en" | "ur";
export type QuestionStatus = "draft" | "approved";

export interface Question {
  id: string;
  materialId: string | null;
  prompt: string;
  type: QuestionType;
  options: string[];
  answer: string;
  explanation: string;
  language: QuestionLanguage;
  status: QuestionStatus;
  source: "manual" | "ai";
  createdAt: string;
  updatedAt: string;
}

interface ApiErrorBody {
  message?: string;
}

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export async function apiRequest<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const headers = new Headers(options.headers);
  if (!(options.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(`/api${path}`, {
    ...options,
    credentials: "include",
    headers,
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as ApiErrorBody;
    throw new ApiError(body.message ?? "The request could not be completed.", response.status);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}
