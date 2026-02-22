import { auth } from "@clerk/nextjs/server";
import { ConvexHttpClient } from "convex/browser";
import { env } from "@/lib/env";

function getBaseUrl() {
  const url = env.CONVEX_URL ?? env.NEXT_PUBLIC_CONVEX_URL;
  if (!url) {
    throw new Error("CONVEX_URL or NEXT_PUBLIC_CONVEX_URL is required");
  }
  return url;
}

export async function getAuthedConvexClient() {
  const client = new ConvexHttpClient(getBaseUrl());
  const authState = await auth();
  const token = await authState.getToken({ template: "convex" }).catch(() => null);
  if (token) {
    client.setAuth(token);
  }
  return client;
}

export async function convexMutation<TArgs extends Record<string, unknown>, TResult>(
  name: string,
  args: TArgs
) {
  const client = await getAuthedConvexClient();
  return client.mutation(name as any, args as any) as Promise<TResult>;
}

export async function convexQuery<TArgs extends Record<string, unknown>, TResult>(
  name: string,
  args: TArgs
) {
  const client = await getAuthedConvexClient();
  return client.query(name as any, args as any) as Promise<TResult>;
}
