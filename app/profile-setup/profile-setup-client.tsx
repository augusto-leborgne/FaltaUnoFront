"use client"

import { RequireAuthClientOnly } from "@/components/auth/client-only-wrapper";
import { ProfileSetupForm } from "@/components/pages/login/profile-setup-form";
import RequireIncompleteProfile from "@/components/auth/require-incomplete-profile";

export default function ProfileSetupClient() {
  return (
    <RequireAuthClientOnly>
      <RequireIncompleteProfile>
        <ProfileSetupForm/>
      </RequireIncompleteProfile>
    </RequireAuthClientOnly>
  );
}
