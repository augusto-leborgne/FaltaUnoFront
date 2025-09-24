"use client"

import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { useEffect, useState } from "react"
import { UsuarioAPI, Usuario } from "@/lib/api"

export function WelcomeScreen() {
  const router = useRouter()
  const [usuario, setUsuario] = useState<Usuario | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    (async () => {
      try {
        // Trae el perfil del usuario logueado
        const res = await UsuarioAPI.obtener("id_del_usuario_autenticado")
        setUsuario(res.data) // ✅ Extraemos solo 'data' del ApiResponse
      } catch (err) {
        console.error("No se pudo obtener usuario", err)
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  const handleStart = () => {
    router.push("/profile-setup")
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-orange-50 to-orange-100 flex flex-col">
      {/* Header */}
      <div className="pt-16 pb-8 text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">
          ¡Bienvenido{usuario ? `, ${usuario.nombre}` : ""}!
        </h1>
      </div>

      {/* Hero Image */}
      <div className="flex-1 flex items-center justify-center px-6">
        <div className="w-full max-w-sm">
          <div className="bg-gradient-to-br from-yellow-400 to-yellow-500 rounded-3xl p-8 mb-8 relative overflow-hidden">
            <Image
              src="/images/soccer-player.png"
              alt="Soccer player"
              width={300}
              height={400}
              className="w-full h-auto object-contain"
              priority
            />
          </div>

          <div className="text-center mb-12">
            {loading ? (
              <p className="text-xl text-gray-600 font-medium leading-relaxed">
                Cargando perfil...
              </p>
            ) : (
              <p className="text-xl text-gray-600 font-medium leading-relaxed">
                Reserva y únete a partidos de fútbol informales
              </p>
            )}
          </div>

          <Button
            onClick={handleStart}
            className="w-full bg-green-600 hover:bg-green-700 active:bg-green-800 text-white py-4 text-lg font-semibold rounded-2xl min-h-[56px] touch-manipulation"
            size="lg"
          >
            Comenzar
          </Button>
        </div>
      </div>
    </div>
  )
}