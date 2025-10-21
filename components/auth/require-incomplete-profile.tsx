// components/auth/require-incomplete-profile.tsx
"use client"
import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/hooks/use-auth"

const isIncomplete = (u:any)=>!u || u.perfilCompleto===false || !(u.nombre&&u.apellido&&(u.foto_perfil||u.fotoPerfil))

export default function RequireIncompleteProfile({children}:{children:React.ReactNode}) {
  const router = useRouter()
  const { user, loading } = useAuth()

  useEffect(()=>{
    if (loading) return
    if (!user) { router.replace("/login"); return }
    if (!isIncomplete(user)) { router.replace("/home"); return }
  },[user,loading,router])

  if (loading) return null
  return <>{children}</>
}
