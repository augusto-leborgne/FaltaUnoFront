"use client"

import { RequireAuthClientOnly } from "@/components/auth/client-only-wrapper"
import { ContactsScreen } from "@/components/pages/user/contacts-screen"

export default function ContactsPage() {
  return (
    <RequireAuthClientOnly allowIncomplete allowUnverified>
      <ContactsScreen />
    </RequireAuthClientOnly>
  )
}
