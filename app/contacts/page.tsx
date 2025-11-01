"use client"

import RequireAuth from "@/components/auth/require-auth"
import { ContactsScreen } from "@/components/pages/user/contacts-screen"

export default function ContactsPage() {
  return (
    <RequireAuth allowIncomplete allowUnverified>
      <ContactsScreen />
    </RequireAuth>
  )
}
