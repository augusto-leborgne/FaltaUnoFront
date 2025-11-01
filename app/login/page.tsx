"use client"

// app/login/page.tsx
import RedirectIfAuthenticated from "@/components/auth/redirect-if-authenticated";
import { LoginScreen } from "@/components/pages/login/login-screen";

export default function LoginPage() {
  return (
    <RedirectIfAuthenticated>
      <LoginScreen />
    </RedirectIfAuthenticated>
  );
}