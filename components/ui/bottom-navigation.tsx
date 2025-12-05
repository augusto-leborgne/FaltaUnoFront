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
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 pb-safe-area-inset-bottom z-40 shadow-lg safe-bottom" role="navigation" aria-label="Navegación principal">
      <div className="flex justify-center items-center py-1.5 xs:py-2 px-1 xs:px-2 max-w-screen-xl mx-auto">
        {navItems.map((item) => {
          const Icon = item.icon
          return (
            <button
              key={item.id}
              onClick={() => router.push(item.path)}
              className="flex flex-col items-center min-h-[56px] xs:min-h-[60px] sm:min-h-[64px] flex-1 max-w-[120px] justify-center touch-manipulation active:scale-95 transition-transform px-1 xs:px-2"
              aria-label={item.label}
              aria-current={item.isActive ? "page" : undefined}
            >
              <div
                className={`w-7 h-7 xs:w-8 xs:h-8 sm:w-9 sm:h-9 flex items-center justify-center mb-0.5 xs:mb-1 rounded-lg xs:rounded-xl transition-colors ${
                  item.isActive ? "bg-secondary/20" : "hover:bg-gray-100 active:bg-gray-200"
                }`}
              >
                <Icon className={`w-4.5 h-4.5 xs:w-5 xs:h-5 sm:w-5.5 sm:h-5.5 ${item.isActive ? "text-gray-900" : "text-gray-500"}`} strokeWidth={item.isActive ? 2.5 : 2} />
              </div>
              <span className={`text-[10px] xs:text-xs sm:text-sm leading-tight text-center ${item.isActive ? "font-semibold text-gray-900" : "font-medium text-gray-500"}`}>
                {item.label}
              </span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}

// ⚡ OPTIMIZACIÓN: React.memo previene re-renders al cambiar pathname
export const BottomNavigation = React.memo(BottomNavigationComponent)
