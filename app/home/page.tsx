"use client"

import RequireAuth from "@/components/auth/require-auth";
import { HomeScreen } from "@/components/pages/home-screen";

export default function HomePage() {
  return (
    <RequireAuth allowIncomplete={false} allowUnverified={false}>
      <HomeScreen />
    </RequireAuth>
  );
}