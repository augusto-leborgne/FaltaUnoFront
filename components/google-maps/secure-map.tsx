"use client"

import { useEffect, useState } from "react"

interface SecureMapProps {
  center?: string
  zoom?: string
  className?: string
}

export function SecureMap({ center = "-34.9011,-56.1645", zoom = "12", className }: SecureMapProps) {
  const [embedUrl, setEmbedUrl] = useState<string>("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string>("")

  useEffect(() => {
    const fetchMapUrl = async () => {
      try {
        const response = await fetch(`/api/maps/embed?center=${center}&zoom=${zoom}`)
        const data = await response.json()

        if (data.embedUrl) {
          setEmbedUrl(data.embedUrl)
        } else {
          setError("Failed to load map")
        }
      } catch (err) {
        setError("Failed to load map")
      } finally {
        setLoading(false)
      }
    }

    fetchMapUrl()
  }, [center, zoom])

  if (loading) {
    return (
      <div className={`bg-gray-100 flex items-center justify-center ${className}`}>
        <p className="text-gray-500 text-sm">Cargando mapa...</p>
      </div>
    )
  }

  if (error || !embedUrl) {
    return (
      <div className={`bg-gray-100 flex items-center justify-center ${className}`}>
        <p className="text-gray-500 text-sm">Error al cargar el mapa</p>
      </div>
    )
  }

  return (
    <iframe
      src={embedUrl}
      width="100%"
      height="100%"
      style={{ border: 0 }}
      allowFullScreen
      loading="lazy"
      referrerPolicy="no-referrer-when-downgrade"
      className={className}
    />
  )
}
