"use client"

import { RequireAuthClientOnly } from "@/components/auth/client-only-wrapper";
import { ProfileSetupForm } from "@/components/pages/login/profile-setup-form";
import RequireIncompleteProfile from "@/components/auth/require-incomplete-profile";

export default function ProfileSetupClient() {
  console.log("🌟🌟🌟 ProfileSetupClient RENDERIZADO 🌟🌟🌟")
  
  if (typeof window !== 'undefined') {
    setTimeout(() => {
      console.log("🌟 ProfileSetupClient MONTADO - Guards van a ejecutarse")
    }, 50)
  }
  
  return (
    <RequireAuthClientOnly>
      <RequireIncompleteProfile>
        <ProfileSetupForm/>
      </RequireIncompleteProfile>
    </RequireAuthClientOnly>
  );
}
