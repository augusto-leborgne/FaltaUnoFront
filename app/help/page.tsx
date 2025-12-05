"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, ChevronDown, ChevronUp } from "lucide-react"
import { BottomNavigation } from "@/components/ui/bottom-navigation"

interface FAQItem {
  question: string
  answer: string
}

const faqs: FAQItem[] = [
  {
    question: "¿Cómo creo un partido?",
    answer: "Ve a la sección 'Mis Partidos' y toca el botón '+'. Completa la información del partido (tipo, fecha, ubicación, costo) y publícalo. Los jugadores podrán solicitar unirse."
  },
  {
    question: "¿Cómo me uno a un partido?",
    answer: "Busca partidos en la sección 'Partidos', selecciona uno que te interese y toca 'Inscribirme'. El organizador revisará tu solicitud y te notificará."
  },
  {
    question: "¿Qué es el sistema de reseñas?",
    answer: "Después de cada partido, puedes calificar a tus compañeros en nivel técnico, deportividad y compañerismo. Esto ayuda a mantener una comunidad de calidad."
  },
  {
    question: "¿Cómo funciona la verificación de identidad?",
    answer: "Para mayor seguridad, verificamos tu cédula uruguaya. Esto genera confianza en la comunidad y ayuda a prevenir perfiles falsos."
  },
  {
    question: "¿Cómo cancelo mi inscripción a un partido?",
    answer: "Ve a 'Mis Partidos', selecciona el partido al que estás inscripto y toca 'Cancelar inscripción'. Hazlo con tiempo para que otros puedan unirse."
  },
  {
    question: "¿Qué hago si un jugador no se presenta?",
    answer: "Después del partido, puedes dejar una reseña reflejando la experiencia. Esto ayuda a otros usuarios a tomar decisiones informadas."
  },
  {
    question: "¿Cómo invito a mis amigos?",
    answer: "Ve a 'Contactos', selecciona a tus amigos y envíales una invitación. También puedes compartir el enlace del partido directamente."
  },
  {
    question: "¿Puedo editar un partido después de crearlo?",
    answer: "Sí, como organizador puedes editar los detalles del partido desde 'Mis Partidos' > 'Gestionar'. Los cambios notificarán a los jugadores inscriptos."
  },
  {
    question: "¿Cómo funciona el pago?",
    answer: "El pago se coordina entre los jugadores, generalmente al llegar al partido. Falta Uno facilita la organización pero no procesa pagos directamente."
  },
  {
    question: "¿Qué pasa si el partido no se completa?",
    answer: "Si no se alcanza el número mínimo de jugadores al momento del inicio, el partido se cancela automáticamente y todos son notificados."
  }
]

export default function HelpPage() {
  const router = useRouter()
  const [openIndex, setOpenIndex] = useState<number | null>(null)

  const toggleFAQ = (index: number) => {
    setOpenIndex(openIndex === index ? null : index)
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <div className="pt-12 xs:pt-14 sm:pt-16 pb-4 xs:pb-5 sm:pb-6 px-3 xs:px-4 sm:px-6 border-b border-gray-100 safe-top">
        <div className="flex items-center gap-3 xs:gap-4">
          <button onClick={() => router.back()} className="p-2 -ml-2 min-w-[44px] min-h-[44px] flex items-center justify-center touch-manipulation rounded-lg hover:bg-gray-100 active:bg-gray-200" aria-label="Volver">
            <ArrowLeft className="w-5 h-5 xs:w-5.5 xs:h-5.5 text-gray-600" />
          </button>
          <h1 className="text-base xs:text-lg sm:text-xl font-bold text-gray-900 truncate">Ayuda y FAQ</h1>
        </div>
      </div>

      <div className="flex-1 px-3 xs:px-4 sm:px-6 py-4 xs:py-5 sm:py-6 pb-24 xs:pb-28 sm:pb-32 overflow-y-auto safe-bottom">
        <div className="mb-4 xs:mb-5 sm:mb-6">
          <h2 className="text-base xs:text-lg font-bold text-gray-900 mb-1.5 xs:mb-2">Preguntas Frecuentes</h2>
          <p className="text-xs xs:text-sm text-gray-600">
            Encuentra respuestas a las preguntas más comunes sobre Falta Uno
          </p>
        </div>

        <div className="space-y-2 xs:space-y-3">
          {faqs.map((faq, index) => (
            <div key={index} className="border border-gray-200 rounded-lg xs:rounded-xl overflow-hidden">
              <button
                onClick={() => toggleFAQ(index)}
                className="w-full flex items-center justify-between p-3 xs:p-4 text-left hover:bg-gray-50 active:bg-gray-100 transition-colors touch-manipulation min-h-[56px]"
              >
                <span className="font-medium text-gray-900 pr-3 xs:pr-4 text-xs xs:text-sm sm:text-base">{faq.question}</span>
                {openIndex === index ? (
                  <ChevronUp className="w-4 h-4 xs:w-5 xs:h-5 text-gray-400 flex-shrink-0" />
                ) : (
                  <ChevronDown className="w-4 h-4 xs:w-5 xs:h-5 text-gray-400 flex-shrink-0" />
                )}
              </button>
              {openIndex === index && (
                <div className="px-3 xs:px-4 pb-3 xs:pb-4">
                  <p className="text-xs xs:text-sm text-gray-600 leading-relaxed">{faq.answer}</p>
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="mt-6 xs:mt-7 sm:mt-8 bg-green-50 rounded-xl xs:rounded-2xl p-4 xs:p-5 sm:p-6">
          <h3 className="font-bold text-gray-900 mb-1.5 xs:mb-2 text-sm xs:text-base">¿Necesitas más ayuda?</h3>
          <p className="text-xs xs:text-sm text-gray-600 mb-3 xs:mb-4">
            Si no encontraste la respuesta que buscas, contáctanos:
          </p>
          <p className="text-xs xs:text-sm text-gray-600">
            Email: <a href="mailto:soporte@faltauno.uy" className="text-green-600 font-medium underline">soporte@faltauno.uy</a>
          </p>
        </div>
      </div>

      <BottomNavigation />
    </div>
  )
}