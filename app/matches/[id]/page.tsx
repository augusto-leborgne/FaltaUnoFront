import MatchDetail from "@/components/pages/match/match-detail"
import type { Metadata } from "next"

interface MatchDetailPageProps {
  params: {
    id: string
  }
}

export async function generateMetadata({ params }: MatchDetailPageProps): Promise<Metadata> {
  const { id } = await Promise.resolve(params)
  
  // Intentar obtener datos del partido
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 seg timeout para metadata

    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/partidos/${id}`, {
      cache: 'no-store',
      signal: controller.signal,
    })
    
    clearTimeout(timeoutId);
    
    if (response.ok) {
      const match = await response.json()
      const title = `${match.nombre || 'Partido'} - Falta Uno`
      const description = `${match.descripcion || 'Únete a este partido'} - ${match.ubicacion?.direccion || 'Ubicación por definir'}`
      const url = `https://faltauno-frontend-169771742214.us-central1.run.app/matches/${id}`
      
      return {
        title,
        description,
        openGraph: {
          title,
          description,
          url,
          siteName: "Falta Uno",
          locale: "es_UY",
          type: "website",
          images: [
            {
              url: "https://faltauno-frontend-169771742214.us-central1.run.app/og-image.png",
              width: 1200,
              height: 630,
              alt: title,
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
    console.error("Error fetching match metadata:", error?.name === 'AbortError' ? 'Timeout' : error)
  }
  
  // Fallback metadata
  return {
    title: "Partido - Falta Uno",
    description: "Únete a este partido de fútbol",
    openGraph: {
      title: "Partido - Falta Uno",
      description: "Únete a este partido de fútbol",
      url: `https://faltauno-frontend-169771742214.us-central1.run.app/matches/${id}`,
      siteName: "Falta Uno",
      locale: "es_UY",
      type: "website",
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
      title: "Partido - Falta Uno",
      description: "Únete a este partido de fútbol",
      images: ["https://faltauno-frontend-169771742214.us-central1.run.app/og-image.png"],
    },
  }
}

export default async function MatchDetailPage({ params }: MatchDetailPageProps) {
  const { id } = await Promise.resolve(params)
  return <MatchDetail matchId={id} />
}