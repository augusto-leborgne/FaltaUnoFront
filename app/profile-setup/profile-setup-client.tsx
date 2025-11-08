"use client"

import { RequireAuthClientOnly } from "@/components/auth/client-only-wrapper";
import { ProfileSetupForm } from "@/components/pages/login/profile-setup-form";

export default function ProfileSetupClient() {
  console.log("🚀 [ProfileSetupClient] VERSION: cd99b66+ - allowIncomplete ENABLED")
  
  return (
    <RequireAuthClientOnly allowIncomplete allowUnverified allowNoPhone>
      <ProfileSetupForm/>
    </RequireAuthClientOnly>
  );
}
