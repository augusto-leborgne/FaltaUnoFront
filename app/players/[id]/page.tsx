import PlayerProfile from "@/components/pages/user/player-profile"
import type { Metadata } from "next"

interface PlayerProfilePageProps {
  params: {
    id: string
  }
}

export async function generateMetadata({ params }: PlayerProfilePageProps): Promise<Metadata> {
  const { id } = params
  
  // Intentar obtener datos del jugador
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/usuarios/${id}`, {
      cache: 'no-store',
    })
    
    if (response.ok) {
      const player = await response.json()
      const name = `${player.nombre || ''} ${player.apellido || ''}`.trim() || 'Jugador'
      const title = `${name} - Falta Uno`
      const description = `Perfil de ${name} en Falta Uno. ${player.descripcion || 'Jugador de fútbol'}`
      const url = `https://faltauno-frontend-169771742214.us-central1.run.app/players/${id}`
      const ogImage = `/api/og?title=${encodeURIComponent(name)}&description=${encodeURIComponent('Jugador en Falta Uno')}`
      
      return {
        title,
        description,
        openGraph: {
          title,
          description,
          url,
          siteName: "Falta Uno",
          locale: "es_UY",
          type: "profile",
          images: [
            {
              url: ogImage,
              width: 1200,
              height: 630,
              alt: name,
            },
          ],
        },
        twitter: {
          card: "summary_large_image",
          title,
          description,
          images: [ogImage],
        },
      }
    }
  } catch (error) {
    console.error("Error fetching player metadata:", error)
  }
  
  // Fallback metadata
  const ogImage = `/api/og?title=Jugador&description=Perfil en Falta Uno`
  return {
    title: "Jugador - Falta Uno",
    description: "Perfil de jugador en Falta Uno",
    openGraph: {
      title: "Jugador - Falta Uno",
      description: "Perfil de jugador en Falta Uno",
      url: `https://faltauno-frontend-169771742214.us-central1.run.app/players/${id}`,
      siteName: "Falta Uno",
      locale: "es_UY",
      type: "profile",
      images: [
        {
          url: ogImage,
          width: 1200,
          height: 630,
          alt: "Falta Uno",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: "Jugador - Falta Uno",
      description: "Perfil de jugador en Falta Uno",
      images: [ogImage],
    },
  }
}

export default function PlayerProfilePage({ params }: PlayerProfilePageProps) {
  return <PlayerProfile playerId={params.id} />
}