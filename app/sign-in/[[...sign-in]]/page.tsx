import type { Metadata } from "next";

import { AuthShell } from "@/components/marketing/AuthShell";
import { SignInCard } from "@/components/marketing/ClerkCards";

export const metadata: Metadata = {
  title: "Sign in — HERCULES",
  description: "Sign in to your HERCULES workspace.",
};

export default function SignInPage() {
  return (
    <AuthShell title="Welcome back. Your runs kept going without you.">
      <SignInCard />
    </AuthShell>
  );
}
