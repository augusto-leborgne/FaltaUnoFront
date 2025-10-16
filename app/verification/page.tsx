// app/verification/page.tsx
import RequireAuth from "@/components/auth/require-auth";
import { VerificationScreen } from "@/components/pages/login/verification-screen";

export default function VerificationPage() {
  return (
    <RequireAuth>
      <VerificationScreen />
    </RequireAuth>
  );
}