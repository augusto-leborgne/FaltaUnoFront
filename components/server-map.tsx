"use client"

import type { Match } from "@/lib/api"

interface ServerMapProps {
  matches: Match[]
  center?: { lat: number; lng: number }
  zoom?: number
}

export async function ServerMap({ matches, center = { lat: -34.6037, lng: -58.3816 }, zoom = 12 }: ServerMapProps) {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY // Server-side only

  if (!apiKey) {
    return (
      <div className="h-96 bg-gray-100 flex items-center justify-center rounded-b-2xl">
        <p className="text-gray-500">Mapa no disponible - API key no configurada</p>
      </div>
    )
  }

  const mapUrl = `https://www.google.com/maps/embed/v1/view?key=${apiKey}&center=${center.lat},${center.lng}&zoom=${zoom}`

  return (
    <div className="h-96 bg-gray-100 relative">
      <iframe
        src={mapUrl}
        width="100%"
        height="100%"
        style={{ border: 0 }}
        allowFullScreen
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
        className="rounded-b-2xl"
      />

      {/* Clickable match pins overlay */}
      {matches.map((match, index) => (
        <div
          key={match.id}
          className="absolute cursor-pointer transform -translate-x-1/2 -translate-y-1/2"
          style={{
            left: `${50 + index * 20}%`,
            top: `${40 + index * 15}%`,
          }}
          onClick={() => {
            // This will be handled by the parent component
            window.location.href = `/matches/${match.id}`
          }}
        >
          <div className="bg-green-600 rounded-full w-6 h-6 shadow-lg hover:scale-110 transition-transform border-2 border-white"></div>
        </div>
      ))}
    </div>
  )
}
