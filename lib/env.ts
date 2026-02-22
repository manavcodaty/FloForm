import { z } from "zod";

const envSchema = z.object({
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: z.string().optional(),
  CLERK_SECRET_KEY: z.string().optional(),
  CONVEX_URL: z.string().url().optional(),
  NEXT_PUBLIC_CONVEX_URL: z.string().url().optional(),
  GITHUB_TOKEN: z.string().optional(),
  GITHUB_MODELS_API_KEY: z.string().optional(),
  GITHUB_MODELS_BASE_URL: z.string().url().default("https://models.inference.ai.azure.com"),
  GITHUB_MODELS_AGENT_MODEL: z.string().default("gpt-4o-mini"),
  OPENAI_TRACING_API_KEY: z.string().optional(),
  ENABLE_TRACING: z.enum(["true", "false"]).default("true"),
  ENABLE_OCR: z.enum(["true", "false"]).default("true")
});

export const env = envSchema.parse({
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
  CLERK_SECRET_KEY: process.env.CLERK_SECRET_KEY,
  CONVEX_URL: process.env.CONVEX_URL,
  NEXT_PUBLIC_CONVEX_URL: process.env.NEXT_PUBLIC_CONVEX_URL,
  GITHUB_TOKEN: process.env.GITHUB_TOKEN,
  GITHUB_MODELS_API_KEY: process.env.GITHUB_MODELS_API_KEY,
  GITHUB_MODELS_BASE_URL: process.env.GITHUB_MODELS_BASE_URL,
  GITHUB_MODELS_AGENT_MODEL: process.env.GITHUB_MODELS_AGENT_MODEL,
  OPENAI_TRACING_API_KEY: process.env.OPENAI_TRACING_API_KEY,
  ENABLE_TRACING: process.env.ENABLE_TRACING,
  ENABLE_OCR: process.env.ENABLE_OCR
});

export function getGitHubModelsKey() {
  return env.GITHUB_TOKEN ?? env.GITHUB_MODELS_API_KEY;
}
