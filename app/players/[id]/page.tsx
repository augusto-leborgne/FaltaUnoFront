"use client"

import { PlayerProfile } from "@/components/pages/user/player-profile"
import { useEffect, useState } from "react"

interface Review {
  id: number
  author: string
  rating: number
  nivel: number
  deportividad: number
  companerismo: number
  comment: string
  date: string
}

interface Player {
  id: number
  name: string
  position: string
  rating: number
  totalMatches: number
  avatar?: string
  age: number
  location: string
  bio: string
  stats: {
    goals: number
    assists: number
    cleanSheets: number
  }
  reviews: Review[]
}

interface PlayerProfilePageProps {
  params: {
    id: string
  }
}

export default function PlayerProfilePage({ params }: PlayerProfilePageProps) {
  const [player, setPlayer] = useState<Player | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchPlayer() {
      try {
        setLoading(true)
        const response = await fetch(`/api/players/${params.id}`)
        
        if (!response.ok) {
          throw new Error('Failed to fetch player data')
        }
        
        const data = await response.json()
        setPlayer(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred')
      } finally {
        setLoading(false)
      }
    }
    
    fetchPlayer()
  }, [params.id])

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando perfil...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center px-6">
          <p className="text-red-600 mb-4">{error}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="px-4 py-2 bg-green-600 text-white rounded-lg"
          >
            Reintentar
          </button>
        </div>
      </div>
    )
  }

  if (!player) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <p className="text-gray-600">Jugador no encontrado</p>
      </div>
    )
  }

  return <PlayerProfile player={player} />
}
