"use client"

import { useRouter, usePathname } from "next/navigation"
import { Home, Map, User, Calendar, Bell } from "lucide-react"
import { useNotifications } from "@/hooks/use-notifications"

export function BottomNavigation() {
  const router = useRouter()
  const pathname = usePathname()
  const { count } = useNotifications()

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
      id: "notifications",
      label: "Notificaciones",
      icon: Bell,
      path: "/notifications",
      isActive: pathname.startsWith("/notifications"),
      badge: count > 0 ? count : undefined,
    },
    {
      id: "my-matches",
      label: "Mis Partidos",
      icon: Calendar,
      path: "/my-matches",
      isActive: pathname.startsWith("/my-matches"),
    },
    {
      id: "profile",
      label: "Perfil",
      icon: User,
      path: "/profile",
      isActive: pathname.startsWith("/profile"),
    },
  ]

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 pb-safe-area-inset-bottom z-40">
      <div className="flex justify-center items-center py-2 px-2">
        {navItems.map((item) => {
          const Icon = item.icon
          return (
            <button
              key={item.id}
              onClick={() => router.push(item.path)}
              className="flex flex-col items-center min-h-[60px] flex-1 justify-center touch-manipulation active:scale-95 transition-transform relative"
            >
              <div
                className={`w-8 h-8 flex items-center justify-center mb-1 rounded-lg transition-colors relative ${
                  item.isActive ? "bg-orange-200" : "hover:bg-gray-100"
                }`}
              >
                <Icon className={`w-5 h-5 ${item.isActive ? "text-gray-800" : "text-gray-400"}`} />
                {item.badge && item.badge > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
                    {item.badge > 99 ? '99+' : item.badge}
                  </span>
                )}
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
