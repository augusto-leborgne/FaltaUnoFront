"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Check, Users, Share2, Loader2 } from "lucide-react"
import { useRouter } from "next/navigation"
import { useToast } from "@/hooks/use-toast"
import { UsuarioAPI } from "@/lib/api"

interface MatchCreatedScreenProps {
  matchId: string
}

interface Amigo {
  id: string
  nombre: string
  apellido: string
  foto_perfil?: string
}

export function MatchCreatedScreen({ matchId }: MatchCreatedScreenProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [amigos, setAmigos] = useState<Amigo[]>([])
  const [loading, setLoading] = useState(true)
  const [invitando, setInvitando] = useState<Record<string, boolean>>({})

  useEffect(() => {
    loadAmigos()
  }, [])

  const loadAmigos = async () => {
    try {
      // Si tienes un endpoint de amigos, úsalo aquí
      // const response = await UsuarioAPI.list()
      // setAmigos(response.data.slice(0, 4))
      
      // Por ahora, mock data
      setAmigos([
        { id: "1", nombre: "Carlos", apellido: "Martinez", foto_perfil: undefined },
        { id: "2", nombre: "Ana", apellido: "Lopez", foto_perfil: undefined },
        { id: "3", nombre: "Diego", apellido: "Rodriguez", foto_perfil: undefined },
        { id: "4", nombre: "Sofia", apellido: "Perez", foto_perfil: undefined },
      ])
    } catch (error) {
      console.error("Error cargando amigos:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleInviteFriend = async (friendId: string) => {
    setInvitando(prev => ({ ...prev, [friendId]: true }))
    
    try {
      // TODO: Implementar endpoint de invitaciones
      // await fetch(`/api/partidos/${matchId}/invitar`, {
      //   method: 'POST',
      //   headers: AuthService.getAuthHeaders(),
      //   body: JSON.stringify({ usuarioId: friendId })
      // })
      
      // Simulación por ahora
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      toast({
        title: "Invitación enviada",
        description: "Tu amigo recibirá una notificación"
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo enviar la invitación",
        variant: "destructive"
      })
    } finally {
      setInvitando(prev => ({ ...prev, [friendId]: false }))
    }
  }

  const handleShareMatch = async () => {
    const shareUrl = `${window.location.origin}/matches/${matchId}`
    const shareText = "¡Únete a mi partido de fútbol!"

    if (navigator.share) {
      try {
        await navigator.share({
          title: "Invitación a partido",
          text: shareText,
          url: shareUrl
        })
      } catch (error) {
        console.log("Error compartiendo:", error)
      }
    } else {
      // Fallback: copiar al portapapeles
      try {
        await navigator.clipboard.writeText(shareUrl)
        toast({
          title: "Link copiado",
          description: "Puedes compartirlo con tus amigos"
        })
      } catch (error) {
        toast({
          title: "Error",
          description: "No se pudo copiar el link",
          variant: "destructive"
        })
      }
    }
  }

  const handleFinish = () => {
    router.push("/my-matches")
  }

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-6">
      <div className="text-center mb-8">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Check className="w-10 h-10 text-green-600" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">¡Partido creado!</h1>
        <p className="text-gray-600">Tu partido ya está disponible para otros jugadores</p>
      </div>

      <div className="w-full max-w-sm">
        <div className="bg-white border border-gray-200 rounded-2xl p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-gray-900">Invitar amigos</h3>
            <Users className="w-5 h-5 text-gray-600" />
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
            </div>
          ) : amigos.length > 0 ? (
            <>
              <div className="space-y-3 mb-4">
                {amigos.map((amigo) => {
                  const fullName = `${amigo.nombre} ${amigo.apellido}`
                  const initials = `${amigo.nombre[0]}${amigo.apellido[0]}`
                  const isInviting = invitando[amigo.id]

                  return (
                    <div key={amigo.id} className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <Avatar className="w-10 h-10">
                          {amigo.foto_perfil ? (
                            <AvatarImage src={`data:image/jpeg;base64,${amigo.foto_perfil}`} />
                          ) : (
                            <AvatarFallback className="bg-gray-200 text-sm">
                              {initials}
                            </AvatarFallback>
                          )}
                        </Avatar>
                        <span className="font-medium text-gray-900">{fullName}</span>
                      </div>
                      <Button
                        onClick={() => handleInviteFriend(amigo.id)}
                        size="sm"
                        variant="outline"
                        disabled={isInviting}
                        className="bg-orange-50 border-orange-200 text-gray-700 hover:bg-orange-100 disabled:opacity-50"
                      >
                        {isInviting ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          "Invitar"
                        )}
                      </Button>
                    </div>
                  )
                })}
              </div>

              <Button 
                onClick={handleShareMatch}
                variant="outline" 
                className="w-full bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100"
              >
                <Share2 className="w-4 h-4 mr-2" />
                Compartir partido
              </Button>
            </>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-500 mb-4">No hay amigos para invitar</p>
              <Button 
                onClick={handleShareMatch}
                variant="outline" 
                className="w-full bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100"
              >
                <Share2 className="w-4 h-4 mr-2" />
                Compartir partido
              </Button>
            </div>
          )}
        </div>

        <Button 
          onClick={handleFinish} 
          className="w-full bg-green-600 hover:bg-green-700 text-white py-3 rounded-2xl"
        >
          Finalizar
        </Button>
      </div>
    </div>
  )
}