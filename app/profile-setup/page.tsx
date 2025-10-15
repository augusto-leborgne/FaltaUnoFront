// app/profile-setup/page.tsx
import RequireAuth from "@/components/auth/require-auth";
import { ProfileSetupForm } from "@/components/pages/login/profile-setup-form";

export default function ProfileSetupPage() {
  return (
    <RequireAuth>
      <ProfileSetupForm />
    </RequireAuth>
  );
}