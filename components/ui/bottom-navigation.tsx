"use client"

import { useRouter, usePathname } from "next/navigation"
import { Home, Map, User, Calendar, MessageCircle } from "lucide-react"
import { useEffect, useMemo, useCallback } from "react"
import React from "react"

function BottomNavigationComponent() {
  const router = useRouter()
  const pathname = usePathname()

  const navItems = [
    {
      id: "home",
      label: "Inicio",
      icon: Home,
      path: "/home",
      isActive: pathname === "/home" || pathname === "/",
    },
    {
      id: "matches",
      label: "Partidos",
      icon: Map,
      path: "/matches",
      isActive: pathname.startsWith("/matches") && !pathname.startsWith("/my-matches"),
    },
    {
      id: "my-matches",
      label: "Mis Partidos",
      icon: Calendar,
      path: "/my-matches",
      isActive: pathname.startsWith("/my-matches"),
    },
    {
      id: "chats",
      label: "Chats",
      icon: MessageCircle,
      path: "/chats",
      isActive: pathname.startsWith("/chats"),
    },
    {
      id: "profile",
      label: "Perfil",
      icon: User,
      path: "/profile",
      isActive: pathname.startsWith("/profile"),
    },
  ]

  // ⚡ Prefetch navigation routes for faster transitions
  useEffect(() => {
    // Prefetch all navigation routes on idle
    if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
      (window as any).requestIdleCallback(() => {
        navItems.forEach(item => {
          if (!item.isActive) {
            router.prefetch(item.path)
          }
        })
      }, { timeout: 2000 })
    } else {
      // Fallback for browsers without requestIdleCallback
      setTimeout(() => {
        navItems.forEach(item => {
          if (!item.isActive) {
            router.prefetch(item.path)
          }
        })
      }, 1000)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname])

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 pb-safe-area-inset-bottom z-40 shadow-lg">
      <div className="flex justify-center items-center py-2 px-2">
        {navItems.map((item) => {
          const Icon = item.icon
          return (
            <button
              key={item.id}
              onClick={() => router.push(item.path)}
              className="flex flex-col items-center min-h-[60px] flex-1 justify-center touch-manipulation active:scale-95 transition-transform"
            >
              <div
                className={`w-8 h-8 flex items-center justify-center mb-1 rounded-xl transition-colors ${
                  item.isActive ? "bg-secondary/20" : "hover:bg-gray-100"
                }`}
              >
                <Icon className={`w-5 h-5 ${item.isActive ? "text-gray-800" : "text-gray-400"}`} />
              </div>
              <span className={`text-xs ${item.isActive ? "font-medium text-gray-900" : "text-gray-400"}`}>
                {item.label}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ⚡ OPTIMIZACIÓN: React.memo previene re-renders al cambiar pathname
export const BottomNavigation = React.memo(BottomNavigationComponent)
