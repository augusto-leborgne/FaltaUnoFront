// app/profile-setup/page.tsx
import RequireAuth from "@/components/auth/require-auth";
import { ProfileSetupForm } from "@/components/pages/login/profile-setup-form";
import RequireIncompleteProfile from "@/components/auth/require-incomplete-profile";

export default function ProfileSetupPage() {
  return (
    <RequireAuth>
      <RequireIncompleteProfile>
        <ProfileSetupForm/>
      </RequireIncompleteProfile>
    </RequireAuth>
  );
}