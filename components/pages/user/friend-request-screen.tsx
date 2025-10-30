"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ArrowLeft, Check } from "lucide-react"
import { useRouter } from "next/navigation"
import { AuthService } from "@/lib/auth"
import { API_BASE } from "@/lib/api"

interface FriendRequestScreenProps {
  userId: string
}

export function FriendRequestScreen({ userId }: FriendRequestScreenProps) {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [loadingData, setLoadingData] = useState(true)
  const [error, setError] = useState("")
  const [requestSent, setRequestSent] = useState(false)

  useEffect(() => {
    loadUserData()
  }, [userId])

  const loadUserData = async () => {
    try {
      setLoadingData(true)
      const token = AuthService.getToken()
      
      if (!token) {
        router.push("/login")
        return
      }

      const response = await fetch(`${API_BASE}/api/usuarios/${userId}`, {
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      })

      if (response.ok) {
        const result = await response.json()
        setUser(result.data)
      } else {
        setError("Usuario no encontrado")
      }
    } catch (err) {
      console.error("Error cargando usuario:", err)
      setError("Error al cargar datos del usuario")
    } finally {
      setLoadingData(false)
    }
  }

  const handleBack = () => {
    router.back()
  }

  const handleSendRequest = async () => {
    setIsLoading(true)
    setError("")
    
    try {
      const token = AuthService.getToken()
      
      if (!token) {
        router.push("/login")
        return
      }

      const response = await fetch(`${API_BASE}/api/amistades/${userId}`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      })

      if (response.ok) {
        setRequestSent(true)
        setTimeout(() => router.back(), 2000)
      } else {
        const errorData = await response.json()
        setError(errorData.message || "Error al enviar solicitud")
      }
    } catch (err) {
      console.error("Error enviando solicitud:", err)
      setError("Error al enviar solicitud. Intenta nuevamente.")
    } finally {
      setIsLoading(false)
    }
  }

  if (loadingData) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-12 h-12 border-4 border-green-600 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando...</p>
        </div>
      </div>
    )
  }

  if (error && !user) {
    return (
      <div className="min-h-screen bg-white flex flex-col">
        <div className="pt-16 pb-6 px-6 border-b border-gray-100">
          <div className="flex items-center space-x-4">
            <button onClick={handleBack} className="p-2 -ml-2">
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
            <h1 className="text-xl font-bold text-gray-900">Error</h1>
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center px-6">
          <div className="text-center">
            <p className="text-red-600 mb-4">{error}</p>
            <Button onClick={handleBack} variant="outline">
              Volver
            </Button>
          </div>
        </div>
      </div>
    )
  }

  const fullName = user ? `${user.nombre || ""} ${user.apellido || ""}`.trim() || "Usuario" : "Usuario"
  const initials = fullName.split(" ").map(n => n[0]).join("").toUpperCase()
  const fotoBase64 = user?.fotoPerfil || user?.foto_perfil

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <div className="pt-16 pb-6 px-6 border-b border-gray-100">
        <div className="flex items-center space-x-4">
          <button onClick={handleBack} className="p-2 -ml-2">
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <h1 className="text-xl font-bold text-gray-900">Enviar solicitud</h1>
        </div>
      </div>

      <div className="flex-1 px-6 py-8">
        <div className="text-center mb-8">
          <Avatar className="w-24 h-24 mx-auto mb-4">
            {fotoBase64 ? (
              <AvatarImage 
                src={`data:image/jpeg;base64,${fotoBase64}`}
                alt={fullName}
              />
            ) : (
              <AvatarFallback className="bg-orange-100 text-2xl">
                {initials}
              </AvatarFallback>
            )}
          </Avatar>
          <h2 className="text-xl font-bold text-gray-900 mb-2">{fullName}</h2>
          {user?.posicion && (
            <p className="text-gray-600 mb-2">{user.posicion}</p>
          )}
          <p className="text-gray-600">
            {requestSent 
              ? `¡Solicitud enviada a ${fullName}!`
              : `¿Quieres enviar una solicitud de amistad a ${fullName}?`
            }
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl">
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        )}

        {requestSent ? (
          <div className="bg-green-50 rounded-xl p-4 mb-8">
            <p className="text-sm text-green-800 text-center">
              ✓ Tu solicitud ha sido enviada exitosamente. {fullName.split(" ")[0]} será notificado.
            </p>
          </div>
        ) : (
          <div className="bg-gray-50 rounded-xl p-4 mb-8">
            <p className="text-sm text-gray-600 text-center">
              Una vez que {fullName.split(" ")[0]} acepte tu solicitud, podrán verse mutuamente en sus listas de amigos e invitarse a partidos.
            </p>
          </div>
        )}

        <div className="space-y-4">
          {!requestSent && (
            <Button
              onClick={handleSendRequest}
              disabled={isLoading}
              className="w-full bg-green-600 hover:bg-green-700 text-white py-4 text-lg font-semibold rounded-2xl flex items-center justify-center disabled:opacity-50"
            >
              <Check className="w-5 h-5 mr-2" />
              {isLoading ? "Enviando..." : "Enviar solicitud"}
            </Button>
          )}

          <Button
            onClick={handleBack}
            variant="outline"
            className="w-full py-4 text-lg font-semibold rounded-2xl bg-transparent"
          >
            {requestSent ? "Cerrar" : "Cancelar"}
          </Button>
        </div>

        {user && (
          <div className="mt-8 bg-gray-50 rounded-xl p-4">
            <h3 className="font-semibold text-gray-900 mb-3">Información</h3>
            <div className="space-y-2 text-sm">
              {user.posicion && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Posición:</span>
                  <span className="text-gray-900 font-medium">{user.posicion}</span>
                </div>
              )}
              {user.altura && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Altura:</span>
                  <span className="text-gray-900 font-medium">{user.altura} cm</span>
                </div>
              )}
              {user.peso && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Peso:</span>
                  <span className="text-gray-900 font-medium">{user.peso} kg</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}