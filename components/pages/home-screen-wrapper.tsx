"use client"

import { RequireAuthClientOnly } from "@/components/auth/client-only-wrapper";
import { HomeScreen } from "@/components/pages/home-screen";

export function HomeScreenWithAuth() {
  return (
    <RequireAuthClientOnly allowIncomplete={false} allowUnverified={false}>
      <HomeScreen />
    </RequireAuthClientOnly>
  );
}

export default HomeScreenWithAuth;
