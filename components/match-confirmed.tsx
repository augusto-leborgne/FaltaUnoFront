"use client"

import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { BottomNavigation } from "@/components/bottom-navigation"
import { Clock, MapPin, Info, MessageCircle, ExternalLink } from "lucide-react"
import { useRouter } from "next/navigation"
import { useState } from "react"

interface MatchConfirmedProps {
  matchId: string
}

export function MatchConfirmed({ matchId }: MatchConfirmedProps) {
  const router = useRouter()
  const [showExpandedMap, setShowExpandedMap] = useState(false)

  const handleOpenChat = () => {
    router.push(`/matches/${matchId}/chat`)
  }

  const handleOpenGoogleMaps = () => {
    // Open Google Maps with the location
    window.open(`https://maps.google.com/?q=${encodeURIComponent("Polideportivo Norte")}`, "_blank")
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header */}
      <div className="pt-16 pb-8 text-center">
        <h1 className="text-2xl font-bold text-gray-900">¡Solicitud enviada!</h1>
      </div>

      <div className="flex-1 px-6">
        {/* Confirmation Card */}
        <div className="bg-white border border-gray-200 rounded-2xl p-6 mb-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center">
                <Clock className="w-6 h-6 text-yellow-600" />
              </div>
              <div>
                <h2 className="font-semibold text-gray-900">Solicitud pendiente</h2>
                <p className="text-sm text-gray-500">Jueves 19:30 • Polideportivo Norte</p>
              </div>
            </div>
          </div>

          <div className="bg-yellow-50 rounded-xl p-4 mb-4">
            <div className="flex items-center space-x-2">
              <Info className="w-4 h-4 text-yellow-600" />
              <span className="text-sm text-yellow-800">El organizador revisará tu solicitud y te notificará</span>
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-2xl p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <Avatar className="w-12 h-12">
                <AvatarImage src="/placeholder.svg?height=48&width=48" />
                <AvatarFallback className="bg-orange-100">M</AvatarFallback>
              </Avatar>
              <div>
                <h3 className="font-semibold text-gray-900">Marta (capitana)</h3>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleOpenChat}
              className="bg-green-50 border-green-200 text-green-700 hover:bg-green-100"
            >
              <MessageCircle className="w-4 h-4 mr-2" />
              Chat grupal
            </Button>
          </div>

          <div className="flex items-center space-x-2 text-sm text-green-600">
            <Info className="w-4 h-4" />
            <span>¡Chat grupal habilitado! Tu solicitud fue aceptada</span>
          </div>
        </div>

        {/* Location */}
        <div className="bg-white border border-gray-200 rounded-2xl p-6 mb-6">
          <h3 className="font-semibold text-gray-900 mb-4">Ubicación</h3>

          <div
            className={`bg-gradient-to-br from-green-100 to-blue-100 rounded-xl flex items-center justify-center cursor-pointer transition-all mb-4 ${
              showExpandedMap ? "h-64" : "h-32"
            }`}
            onClick={() => setShowExpandedMap(!showExpandedMap)}
          >
            <div className="text-center">
              <MapPin className="w-6 h-6 text-gray-600 mx-auto mb-2" />
              {showExpandedMap && (
                <Button
                  onClick={(e) => {
                    e.stopPropagation()
                    handleOpenGoogleMaps()
                  }}
                  variant="outline"
                  size="sm"
                  className="mt-2"
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Ver en Google Maps
                </Button>
              )}
            </div>
          </div>
        </div>

        <div className="pb-24">
          <p className="text-center text-sm text-gray-500">Podrás dejar tu feedback tras el partido</p>
        </div>
      </div>

      {/* Bottom Navigation */}
      <BottomNavigation />
    </div>
  )
}
