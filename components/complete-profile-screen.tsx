"use client"

import type React from "react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useRouter } from "next/navigation"
import { User, MapPin, Camera } from "lucide-react"

export function CompleteProfileScreen() {
  const router = useRouter()
  const [formData, setFormData] = useState({
    phone: "",
    birthDate: "",
    address: "",
    city: "",
    position: "",
    experience: "",
    bio: "",
  })
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    // Simulate profile completion
    setTimeout(() => {
      // Save profile data to localStorage
      localStorage.setItem("userProfile", JSON.stringify(formData))
      localStorage.setItem("isProfileComplete", "true")

      setIsSubmitting(false)
      router.push("/")
    }, 2000)
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header */}
      <div className="pt-20 pb-8 text-center px-6">
        <User className="w-16 h-16 text-green-600 mx-auto mb-6" />
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Completa tu Perfil</h1>
        <p className="text-gray-600">Ayúdanos a conocerte mejor para conectarte con los jugadores ideales</p>
      </div>

      <div className="flex-1 px-6 pb-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Profile Photo */}
          <div className="text-center">
            <div className="w-24 h-24 bg-gray-100 rounded-full mx-auto mb-4 flex items-center justify-center">
              <Camera className="w-8 h-8 text-gray-400" />
            </div>
            <Button type="button" variant="outline" className="text-sm bg-transparent">
              Agregar Foto
            </Button>
          </div>

          {/* Contact Information */}
          <div className="space-y-4">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              <User className="w-5 h-5" />
              Información de Contacto
            </h3>

            <Input
              type="tel"
              placeholder="Teléfono"
              value={formData.phone}
              onChange={(e) => handleInputChange("phone", e.target.value)}
              className="py-3 rounded-xl"
              required
            />

            <Input
              type="date"
              placeholder="Fecha de nacimiento"
              value={formData.birthDate}
              onChange={(e) => handleInputChange("birthDate", e.target.value)}
              className="py-3 rounded-xl"
              required
            />
          </div>

          {/* Location */}
          <div className="space-y-4">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              <MapPin className="w-5 h-5" />
              Ubicación
            </h3>

            <Input
              type="text"
              placeholder="Dirección"
              value={formData.address}
              onChange={(e) => handleInputChange("address", e.target.value)}
              className="py-3 rounded-xl"
              required
            />

            <Input
              type="text"
              placeholder="Ciudad"
              value={formData.city}
              onChange={(e) => handleInputChange("city", e.target.value)}
              className="py-3 rounded-xl"
              required
            />
          </div>

          {/* Football Information */}
          <div className="space-y-4">
            <h3 className="font-semibold text-gray-900">⚽ Información Futbolística</h3>

            <select
              value={formData.position}
              onChange={(e) => handleInputChange("position", e.target.value)}
              className="w-full py-3 px-4 rounded-xl border border-gray-300 bg-white"
              required
            >
              <option value="">Selecciona tu posición</option>
              <option value="arquero">Arquero</option>
              <option value="defensor">Defensor</option>
              <option value="mediocampista">Mediocampista</option>
              <option value="delantero">Delantero</option>
              <option value="cualquiera">Cualquier posición</option>
            </select>

            <select
              value={formData.experience}
              onChange={(e) => handleInputChange("experience", e.target.value)}
              className="w-full py-3 px-4 rounded-xl border border-gray-300 bg-white"
              required
            >
              <option value="">Nivel de experiencia</option>
              <option value="principiante">Principiante</option>
              <option value="intermedio">Intermedio</option>
              <option value="avanzado">Avanzado</option>
              <option value="profesional">Profesional</option>
            </select>

            <textarea
              placeholder="Cuéntanos sobre ti como jugador (opcional)"
              value={formData.bio}
              onChange={(e) => handleInputChange("bio", e.target.value)}
              className="w-full py-3 px-4 rounded-xl border border-gray-300 resize-none"
              rows={3}
            />
          </div>

          <Button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-green-600 hover:bg-green-700 text-white py-4 text-lg font-semibold rounded-2xl min-h-[56px] touch-manipulation disabled:opacity-50"
          >
            {isSubmitting ? "Guardando..." : "Completar Perfil"}
          </Button>
        </form>
      </div>
    </div>
  )
}
