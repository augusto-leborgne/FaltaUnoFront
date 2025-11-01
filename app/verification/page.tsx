"use client"

// app/verification/page.tsx
import RequireAuth from "@/components/auth/require-auth";
import { VerificationScreen } from "@/components/pages/login/verification-screen";

export default function VerificationPage() {
  return (
    <RequireAuth allowIncomplete={false} allowUnverified={true}>
      <VerificationScreen />
    </RequireAuth>
  );
}