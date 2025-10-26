"use client"

import React, { useEffect, useState } from "react"
import { API_BASE, normalizeUrl } from "@/lib/api"
import { AuthService } from "@/lib/auth"
import { Button } from "@/components/ui/button"
import { UserAvatar } from "@/components/ui/user-avatar"

interface User {
  id: string
  nombre: string
  apellido: string
  foto_perfil?: string
}

export default function ProfileScreen() {
  const [user, setUser] = useState<User | null>(null)
  const [contacts, setContacts] = useState<User[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const userRes = await fetch(normalizeUrl(`${API_BASE}/api/usuarios/me`), {
          headers: AuthService.getAuthHeaders(),
        })
        const userData = await userRes.json()
        setUser(userData.data ?? userData)

        // Fetch contactos
        const contactsRes = await fetch(normalizeUrl(`${API_BASE}/api/usuarios`), {
          headers: AuthService.getAuthHeaders(),
        })
        const contactsData = await contactsRes.json()
        setContacts(contactsData.data ?? contactsData)
      } catch (error) {
        console.error("[ProfileScreen] Error cargando datos:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchProfile()
  }, [])

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <p>Cargando perfil...</p>
      </div>
    )
  }

  return (
    <div className="p-4">
      {user && (
        <div className="flex flex-col items-center mb-6">
          <UserAvatar
            photo={user.foto_perfil}
            fullName={`${user.nombre} ${user.apellido}`}
            className="w-24 h-24"
          />
          <h1 className="text-xl font-semibold mt-2">{`${user.nombre} ${user.apellido}`}</h1>
        </div>
      )}

      <h2 className="text-lg font-semibold mb-2">Buscar usuarios</h2>
      <div className="space-y-2">
        {contacts.map((c) => (
          <div key={c.id} className="flex items-center justify-between border p-2 rounded-lg">
            <div className="flex items-center space-x-2">
              <UserAvatar
                photo={c.foto_perfil}
                fullName={`${c.nombre} ${c.apellido}`}
                className="w-10 h-10"
              />
              <span>{`${c.nombre} ${c.apellido}`}</span>
            </div>
            <Button variant="outline">Ver Perfil</Button>
          </div>
        ))}
      </div>
    </div>
  )
}