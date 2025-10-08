"use client"

import { ProfileScreen } from "@/components/pages/user/profile-screen"
import { useEffect, useState } from "react"
import { useAuth } from "@/hooks/use-auth"

interface Review {
  id: number
  autor_id: number
  autor_nombre: string
  rating: number
  comentario: string
  createdAt: string
}

interface FriendRequest {
  id: number
  nombre: string
  avatar?: string
  mutualFriends: number
}

interface Contact {
  id: number
  nombre: string
  telefono: string
  avatar?: string
  isOnApp: boolean
}

interface UsuarioLocal {
  id: number
  nombre: string
  edad: number
  altura: string
  peso: string
  rating: number
  partidos: number
  amigos: number
  miembroDesde: string
  avatar?: string
}

export default function ProfilePage() {
  const { user } = useAuth()
  const [usuario, setUsuario] = useState<UsuarioLocal | null>(null)
  const [reviews, setReviews] = useState<Review[]>([])
  const [friendRequests, setFriendRequests] = useState<FriendRequest[]>([])
  const [contacts, setContacts] = useState<Contact[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchProfileData() {
      try {
        setLoading(true)
        
        // Fetch user profile data
        const profileResponse = await fetch('/api/profile')
        if (!profileResponse.ok) {
          throw new Error('Failed to fetch profile data')
        }
        const profileData = await profileResponse.json()
        setUsuario(profileData)

        // Fetch reviews
        const reviewsResponse = await fetch('/api/profile/reviews')
        if (reviewsResponse.ok) {
          const reviewsData = await reviewsResponse.json()
          setReviews(reviewsData)
        }

        // Fetch friend requests
        const friendRequestsResponse = await fetch('/api/friend-requests')
        if (friendRequestsResponse.ok) {
          const friendRequestsData = await friendRequestsResponse.json()
          setFriendRequests(friendRequestsData)
        }

        // Fetch contacts
        const contactsResponse = await fetch('/api/contacts')
        if (contactsResponse.ok) {
          const contactsData = await contactsResponse.json()
          setContacts(contactsData)
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred')
      } finally {
        setLoading(false)
      }
    }

    fetchProfileData()
  }, [])

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

  if (!usuario) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <p className="text-gray-600">No se pudo cargar el perfil</p>
      </div>
    )
  }

  return (
    <ProfileScreen 
      usuario={usuario}
      reviews={reviews}
      friendRequests={friendRequests}
      contacts={contacts}
    />
  )
}
