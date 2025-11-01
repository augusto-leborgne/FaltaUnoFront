"use client"

// app/register/page.tsx
import RedirectIfAuthenticated from "@/components/auth/redirect-if-authenticated";
import { RegisterScreen } from "@/components/pages/login/register-screen";

export default function RegisterPage() {
  return (
    <RedirectIfAuthenticated>
      <RegisterScreen />
    </RedirectIfAuthenticated>
  );
}