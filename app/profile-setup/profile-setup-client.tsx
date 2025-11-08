"use client"

import { RequireAuthClientOnly } from "@/components/auth/client-only-wrapper";
import { ProfileSetupForm } from "@/components/pages/login/profile-setup-form";

export default function ProfileSetupClient() {
  return (
    <RequireAuthClientOnly allowIncomplete allowUnverified allowNoPhone>
      <ProfileSetupForm/>
    </RequireAuthClientOnly>
  );
}
