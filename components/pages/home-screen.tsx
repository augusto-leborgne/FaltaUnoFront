"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { BottomNavigation } from "@/components/ui/bottom-navigation";
import { Clock, Calendar, Star, Bell, Newspaper, TrendingUp, Award } from "lucide-react";
import { useRouter } from "next/navigation";
import { AuthService } from "@/lib/auth";

interface NewsUpdate {
  id: number;
  type: "update" | "announcement" | "feature" | "community";
  title: string;
  description: string;
  date: string;
  image?: string;
  category?: string;
  author?: string;
  readTime?: string;
  tags?: string[];
  summary?: string;
}

const newsUpdates: NewsUpdate[] = [ /* ...tu array igual que antes...*/ ];

const communityStats = {
  activeUsers: 1247,
  matchesThisWeek: 89,
  newMembers: 23,
};

interface MatchView {
  id: string;
  tipo_partido: string;
  estado: string;
  fecha: string;
  hora: string;
  nombre_ubicacion: string;
  jugadores_actuales: number;
  cantidad_jugadores: number;
}

interface ReviewView {
  id: string;
  tipo_partido: string;
  fecha: string;
  nombre_ubicacion: string;
  jugadores_pendientes: number;
}

export function HomeScreen() {
  const router = useRouter();
  const [upcomingMatches, setUpcomingMatches] = useState<MatchView[]>([]);
  const [pendingReviews, setPendingReviews] = useState<ReviewView[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const user = AuthService.getUser();
    const userId = user?.id ?? null;

    // Helper: fetch with timeout + inject Authorization header from AuthService
    const fetchWithTimeout = async (resource: RequestInfo, options: RequestInit = {}, timeout = 4000) => {
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), timeout);

      try {
        // merge headers and ensure content-type for JSON unless FormData
        const token = AuthService.getToken();
        const incomingHeaders = new Headers(options.headers ?? {});
        if (!incomingHeaders.has("Content-Type") && !(options.body instanceof FormData)) {
          incomingHeaders.set("Content-Type", "application/json");
        }
        if (token) {
          incomingHeaders.set("Authorization", `Bearer ${token}`);
        }

        // debug log for verification
        console.log("[HomeScreen][fetchWithTimeout] Request:", resource, "Headers:", Object.fromEntries(incomingHeaders.entries()));

        const res = await fetch(resource, { signal: controller.signal, ...options, headers: incomingHeaders });
        clearTimeout(id);

        if (!res.ok) {
          const text = await res.text().catch(() => "");
          throw new Error(`HTTP ${res.status} - ${text}`);
        }
        return res.json();
      } finally {
        clearTimeout(id);
      }
    };

    let mounted = true;
    setIsLoading(true);

    (async () => {
      try {
        if (!userId) {
          setUpcomingMatches([]);
          setPendingReviews([]);
          return;
        }

        // Requests: use fetchWithTimeout which injects Authorization header
        const matchesPromise = fetchWithTimeout(
          `/api/partidos/mine?userId=${encodeURIComponent(userId)}&limit=10`,
          { method: "GET" },
          4000
        ).catch((err) => {
          console.warn("[HomeScreen] matches fetch failed:", err);
          return null;
        });

        const reviewsPromise = fetchWithTimeout(
          `/api/usuarios/${encodeURIComponent(userId)}/pending-reviews?limit=10`,
          { method: "GET" },
          4000
        ).catch((err) => {
          console.warn("[HomeScreen] reviews fetch failed:", err);
          return null;
        });

        const [matchesData, reviewsData] = await Promise.all([matchesPromise, reviewsPromise]);

        if (!mounted) return;

        if (matchesData) {
          const rawMatches = Array.isArray(matchesData) ? matchesData : (matchesData.partidos ?? matchesData.data ?? []);
          const mappedMatches = rawMatches.map((m: any) => ({
            id: m.id,
            tipo_partido: m.tipoPartido ?? m.tipo_partido ?? m.tipo,
            estado: m.estado,
            fecha: m.fecha,
            hora: m.hora,
            nombre_ubicacion: m.nombreUbicacion ?? m.nombre_ubicacion ?? m.nombre,
            jugadores_actuales: m.jugadoresActuales ?? m.jugadores_actuales ?? 0,
            cantidad_jugadores: m.maxJugadores ?? m.cantidad_jugadores ?? 0,
          }));
          setUpcomingMatches(mappedMatches);
        } else {
          setUpcomingMatches([]);
        }

        if (reviewsData) {
          const rawReviews = Array.isArray(reviewsData) ? reviewsData : (reviewsData.data ?? reviewsData.pending ?? []);
          const mappedReviews = rawReviews.map((r: any) => ({
            id: r.partido_id ?? r.id ?? r.partidoId,
            tipo_partido: r.tipo_partido ?? r.tipoPartido,
            fecha: r.fecha,
            nombre_ubicacion: r.nombre_ubicacion ?? r.nombreUbicacion,
            jugadores_pendientes: Array.isArray(r.jugadores_pendientes) ? r.jugadores_pendientes.length : (r.jugadores_pendientes ?? 0),
          }));
          setPendingReviews(mappedReviews);
        } else {
          setPendingReviews([]);
        }
      } catch (err) {
        console.error("[HomeScreen] Error fetching data:", err);
      } finally {
        if (mounted) setIsLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [router]);

  const handleMatchClick = (matchId: string) => router.push(`/matches/${matchId}`);
  const handleReviewMatch = (matchId: string) => router.push(`/matches/${matchId}/review`);
  const handleViewAllMatches = () => router.push("/matches");
  const handleViewAllNews = () => router.push("/news");
  const handleNotifications = () => router.push("/notifications");
  const handleNewsClick = (newsId: number) => router.push(`/news/${newsId}`);

  const getNewsIcon = (type: string) => {
    switch (type) {
      case "update":
        return <TrendingUp className="w-4 h-4" />;
      case "announcement":
        return <Bell className="w-4 h-4" />;
      case "feature":
        return <Award className="w-4 h-4" />;
      default:
        return <Newspaper className="w-4 h-4" />;
    }
  };

  if (isLoading)
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full"></div>
      </div>
    );

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Mantuve todo tu JSX tal cual (omito por brevedad en esta copia, pero en tu repo deja exactamente el render original) */}
      {/* HEADER, STATS, PENDING REVIEWS, NOTICIAS, PRÓXIMOS PARTIDOS... */}
      {/* Usa upcomingMatches y pendingReviews como antes */}
      <div className="pt-16 pb-6 px-6 bg-gradient-to-r from-primary/5 to-secondary/5">
        {/* ...resto del render original tal cual lo tenías... */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">¡Bienvenido a la comunidad!</h1>
            <p className="text-muted-foreground">Descubre lo que está pasando</p>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={handleNotifications}
              className="relative p-2 rounded-full hover:bg-white/20 transition-colors"
            >
              <Bell className="w-6 h-6 text-foreground" />
              {pendingReviews.length > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                  {pendingReviews.length}
                </span>
              )}
            </button>
            <Avatar className="w-12 h-12">
              <AvatarImage src="/placeholder.svg?height=48&width=48" />
              <AvatarFallback className="bg-primary/10 text-primary">U</AvatarFallback>
            </Avatar>
          </div>
        </div>
        {/* ...resto exactamente igual... */}
      </div>

      <BottomNavigation />
    </div>
  );
}