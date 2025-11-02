"use client"

// app/profile-setup/page.tsx
import { RequireAuthClientOnly } from "@/components/auth/client-only-wrapper";
import { ProfileSetupForm } from "@/components/pages/login/profile-setup-form";
import RequireIncompleteProfile from "@/components/auth/require-incomplete-profile";

export default function ProfileSetupPage() {
  return (
    <RequireAuthClientOnly>
      <RequireIncompleteProfile>
        <ProfileSetupForm/>
      </RequireIncompleteProfile>
    </RequireAuthClientOnly>
  );
}