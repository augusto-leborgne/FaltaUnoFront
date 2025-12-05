"use client"

import { useRouter } from "next/navigation"
import { ArrowLeft, Shield, Users, Star, Trophy } from "lucide-react"
import { Button } from "@/components/ui/button"
import { BottomNavigation } from "@/components/ui/bottom-navigation"

export default function AboutPage() {
  const router = useRouter()

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <div className="pt-12 xs:pt-14 sm:pt-16 pb-4 xs:pb-5 sm:pb-6 px-3 xs:px-4 sm:px-6 border-b border-gray-100 safe-top">
        <div className="flex items-center gap-3 xs:gap-4">
          <button onClick={() => router.back()} className="p-2 -ml-2 min-w-[44px] min-h-[44px] flex items-center justify-center touch-manipulation rounded-lg hover:bg-gray-100 active:bg-gray-200" aria-label="Volver">
            <ArrowLeft className="w-5 h-5 xs:w-5.5 xs:h-5.5 text-gray-600" />
          </button>
          <h1 className="text-base xs:text-lg sm:text-xl font-bold text-gray-900 truncate">Acerca de</h1>
        </div>
      </div>

      <div className="flex-1 px-3 xs:px-4 sm:px-6 py-4 xs:py-5 sm:py-6 pb-24 xs:pb-28 sm:pb-32 overflow-y-auto safe-bottom">
        <div className="text-center mb-6 xs:mb-7 sm:mb-8">
          <div className="w-20 h-20 xs:w-22 xs:h-22 sm:w-24 sm:h-24 rounded-2xl xs:rounded-3xl mx-auto mb-4 xs:mb-5 sm:mb-6 flex items-center justify-center shadow-lg bg-green-600">
            <span className="text-white text-2xl xs:text-3xl font-bold">FU</span>
          </div>
          <h2 className="text-xl xs:text-2xl font-bold text-gray-900 mb-1.5 xs:mb-2">Falta Uno</h2>
          <p className="text-sm xs:text-base text-gray-600">Versión 1.0.0</p>
        </div>

        <div className="space-y-4 xs:space-y-5 sm:space-y-6">
          <div className="bg-gradient-to-br from-green-50 to-blue-50 rounded-xl xs:rounded-2xl p-4 xs:p-5 sm:p-6">
            <h3 className="font-bold text-gray-900 mb-1.5 xs:mb-2 text-sm xs:text-base">Nuestra Misión</h3>
            <p className="text-gray-700 text-xs xs:text-sm sm:text-base leading-relaxed">
              Conectar a jugadores de fútbol en Uruguay, facilitando la organización 
              de partidos y fomentando una comunidad deportiva activa y saludable.
            </p>
          </div>

          <div className="space-y-3 xs:space-y-4">
            <div className="flex items-start gap-3 xs:gap-4 p-3 xs:p-4 bg-gray-50 rounded-lg xs:rounded-xl">
              <div className="w-9 h-9 xs:w-10 xs:h-10 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                <Users className="w-4 h-4 xs:w-5 xs:h-5 text-green-600" />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-semibold text-gray-900 mb-1 text-xs xs:text-sm sm:text-base">Comunidad</h4>
                <p className="text-xs xs:text-sm text-gray-600">
                  Miles de jugadores activos organizando partidos cada semana
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 xs:gap-4 p-3 xs:p-4 bg-gray-50 rounded-lg xs:rounded-xl">
              <div className="w-9 h-9 xs:w-10 xs:h-10 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                <Shield className="w-4 h-4 xs:w-5 xs:h-5 text-blue-600" />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-semibold text-gray-900 mb-1 text-xs xs:text-sm sm:text-base">Seguridad</h4>
                <p className="text-xs xs:text-sm text-gray-600">
                  Verificación de identidad y sistema de reseñas para tu tranquilidad
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 xs:gap-4 p-3 xs:p-4 bg-gray-50 rounded-lg xs:rounded-xl">
              <div className="w-9 h-9 xs:w-10 xs:h-10 bg-yellow-100 rounded-full flex items-center justify-center flex-shrink-0">
                <Star className="w-4 h-4 xs:w-5 xs:h-5 text-yellow-600" />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-semibold text-gray-900 mb-1 text-xs xs:text-sm sm:text-base">Calidad</h4>
                <p className="text-xs xs:text-sm text-gray-600">
                  Sistema de calificaciones para encontrar jugadores de tu nivel
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 xs:gap-4 p-3 xs:p-4 bg-gray-50 rounded-lg xs:rounded-xl">
              <div className="w-9 h-9 xs:w-10 xs:h-10 bg-orange-100 rounded-full flex items-center justify-center flex-shrink-0">
                <Trophy className="w-4 h-4 xs:w-5 xs:h-5 text-orange-600" />
              </div>
              <div>
                <h4 className="font-semibold text-gray-900 mb-1">Diversión</h4>
                <p className="text-sm text-gray-600">
                  Organiza partidos fácilmente y disfruta del deporte que amas
                </p>
              </div>
            </div>
          </div>

          <div className="bg-gray-50 rounded-2xl p-6">
            <h3 className="font-bold text-gray-900 mb-2">Contacto</h3>
            <p className="text-sm text-gray-600 mb-2">
              ¿Tienes preguntas o sugerencias?
            </p>
            <p className="text-sm text-gray-600">
              Email: <a href="mailto:info@faltauno.uy" className="text-green-600">info@faltauno.uy</a>
            </p>
          </div>

          <div className="text-center text-xs text-gray-500">
            <p>© 2024 Falta Uno</p>
            <p className="mt-1">Todos los derechos reservados</p>
          </div>
        </div>
      </div>

      <BottomNavigation />
    </div>
  )
}