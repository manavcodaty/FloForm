import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { TopNav } from "@/components/top-nav";
import { TopNavFallback } from "@/components/top-nav-fallback";
import { AccessibilityProvider } from "@/components/accessibility-provider";
import "./globals.css";

export const metadata: Metadata = {
  title: "FlôForm",
  description: "FlôForm completes complex forms for you, safely."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
  const clerkEnabled = Boolean(publishableKey);
  const content = (
    <html lang="en">
      <body>
        <AccessibilityProvider>
          {clerkEnabled ? <TopNav /> : <TopNavFallback />}
          {children}
        </AccessibilityProvider>
      </body>
    </html>
  );

  if (!clerkEnabled || !publishableKey) {
    return content;
  }

  return (
    <ClerkProvider publishableKey={publishableKey}>
      {content}
    </ClerkProvider>
  );
}
