import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const authState = await auth();
  if (!authState.userId) {
    redirect("/");
  }

  return <AppShell>{children}</AppShell>;
}
