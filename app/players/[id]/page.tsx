import PlayerProfile from "@/components/pages/user/player-profile"
import type { Metadata } from "next"
import { logger } from "@/lib/logger"

interface PlayerProfilePageProps {
  params: {
    id: string
  }
}

export async function generateMetadata({ params }: PlayerProfilePageProps): Promise<Metadata> {
  const { id } = params
  
  // Intentar obtener datos del jugador
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 seg timeout para metadata

    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/usuarios/${id}`, {
      cache: 'no-store',
      signal: controller.signal,
    })
    
    clearTimeout(timeoutId);
    
    if (response.ok) {
      const player = await response.json()
      const name = `${player.nombre || ''} ${player.apellido || ''}`.trim() || 'Jugador'
      const title = `${name} - Falta Uno`
      const description = `Perfil de ${name} en Falta Uno. ${player.descripcion || 'Jugador de fútbol'}`
      const url = `https://faltauno-frontend-169771742214.us-central1.run.app/players/${id}`
      
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
              url: "https://faltauno-frontend-169771742214.us-central1.run.app/og-image.png",
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
          images: ["https://faltauno-frontend-169771742214.us-central1.run.app/og-image.png"],
        },
      }
    }
  } catch (error: any) {
    logger.error("Error fetching player metadata:", error?.name === 'AbortError' ? 'Timeout' : error)
  }
  
  // Fallback metadata
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
          url: "https://faltauno-frontend-169771742214.us-central1.run.app/og-image.png",
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
      images: ["https://faltauno-frontend-169771742214.us-central1.run.app/og-image.png"],
    },
  }
}

export default function PlayerProfilePage({ params }: PlayerProfilePageProps) {
  return <PlayerProfile playerId={params.id} />
}