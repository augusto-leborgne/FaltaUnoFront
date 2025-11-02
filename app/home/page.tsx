"use client"

import { RequireAuthClientOnly } from "@/components/auth/client-only-wrapper";
import { HomeScreen } from "@/components/pages/home-screen";

export default function HomePage() {
  return (
    <RequireAuthClientOnly allowIncomplete={false} allowUnverified={false}>
      <HomeScreen />
    </RequireAuthClientOnly>
  );
}