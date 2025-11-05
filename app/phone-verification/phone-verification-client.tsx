"use client"

import { RequireAuthClientOnly } from "@/components/auth/client-only-wrapper"
import { PhoneVerificationScreen } from "@/components/pages/login/phone-verification-screen"

export default function PhoneVerificationClient() {
  return (
    <RequireAuthClientOnly allowIncomplete={false} allowUnverified={true} allowNoPhone={true}>
      <PhoneVerificationScreen />
    </RequireAuthClientOnly>
  )
}
