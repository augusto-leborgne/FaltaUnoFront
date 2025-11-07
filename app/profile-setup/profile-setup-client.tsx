"use client"

import { RequireAuthClientOnly } from "@/components/auth/client-only-wrapper";
import { ProfileSetupForm } from "@/components/pages/login/profile-setup-form";
import { TestSimpleForm } from "@/components/pages/login/test-simple-form";
import RequireIncompleteProfile from "@/components/auth/require-incomplete-profile";

export default function ProfileSetupClient() {
  // ⚡ PRUEBA: Comentar todo y solo mostrar form simple
  return <TestSimpleForm />
  
  /* return (
    <RequireAuthClientOnly>
      <RequireIncompleteProfile>
        <ProfileSetupForm/>
      </RequireIncompleteProfile>
    </RequireAuthClientOnly>
  ); */
}
