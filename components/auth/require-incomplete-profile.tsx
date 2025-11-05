// components/auth/require-incomplete-profile.tsx
"use client"
import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/hooks/use-auth"

const isIncomplete = (u:any)=>{
  if (!u) return true
  if (u.perfilCompleto === false) return true
  const hasPhoto = u.hasFotoPerfil ?? u.foto_perfil ?? u.fotoPerfil
  return !(u.nombre && u.apellido && !!hasPhoto)
}

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
