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
      <div className="pt-16 pb-6 px-6 border-b border-gray-100">
        <div className="flex items-center space-x-4">
          <button onClick={() => router.back()} className="p-2 -ml-2">
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <h1 className="text-xl font-bold text-gray-900">Ayuda y FAQ</h1>
        </div>
      </div>

      <div className="flex-1 px-6 py-6 pb-24">
        <div className="mb-6">
          <h2 className="text-lg font-bold text-gray-900 mb-2">Preguntas Frecuentes</h2>
          <p className="text-sm text-gray-600">
            Encuentra respuestas a las preguntas más comunes sobre Falta Uno
          </p>
        </div>

        <div className="space-y-3">
          {faqs.map((faq, index) => (
            <div key={index} className="border border-gray-200 rounded-xl overflow-hidden">
              <button
                onClick={() => toggleFAQ(index)}
                className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50 transition-colors"
              >
                <span className="font-medium text-gray-900 pr-4">{faq.question}</span>
                {openIndex === index ? (
                  <ChevronUp className="w-5 h-5 text-gray-400 flex-shrink-0" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-gray-400 flex-shrink-0" />
                )}
              </button>
              {openIndex === index && (
                <div className="px-4 pb-4">
                  <p className="text-sm text-gray-600 leading-relaxed">{faq.answer}</p>
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="mt-8 bg-green-50 rounded-2xl p-6">
          <h3 className="font-bold text-gray-900 mb-2">¿Necesitas más ayuda?</h3>
          <p className="text-sm text-gray-600 mb-4">
            Si no encontraste la respuesta que buscas, contáctanos:
          </p>
          <p className="text-sm text-gray-600">
            Email: <a href="mailto:soporte@faltauno.uy" className="text-green-600 font-medium">soporte@faltauno.uy</a>
          </p>
        </div>
      </div>

      <BottomNavigation />
    </div>
  )
}