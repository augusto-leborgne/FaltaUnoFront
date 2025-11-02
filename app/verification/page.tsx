"use client"

// app/verification/page.tsx
import { RequireAuthClientOnly } from "@/components/auth/client-only-wrapper";
import { VerificationScreen } from "@/components/pages/login/verification-screen";

export default function VerificationPage() {
  return (
    <RequireAuthClientOnly allowIncomplete={false} allowUnverified={true}>
      <VerificationScreen />
    </RequireAuthClientOnly>
  );
}