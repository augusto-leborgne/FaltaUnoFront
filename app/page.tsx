// app/page.tsx
import { redirect } from "next/navigation";

export default function RootPage() {
  // Redirigir directamente a /home
  // El guard de /home manejará la autenticación
  redirect("/home");
}