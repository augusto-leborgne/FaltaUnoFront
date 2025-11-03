"use client"

import RedirectIfAuthenticated from "@/components/auth/redirect-if-authenticated";
import { RegisterScreen } from "@/components/pages/login/register-screen";

export default function RegisterClient() {
  return (
    <RedirectIfAuthenticated>
      <RegisterScreen />
    </RedirectIfAuthenticated>
  );
}
