"use client"

import type React from "react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { BottomNavigation } from "@/components/bottom-navigation"
import { ArrowLeft, MapPin, Calendar, Users, DollarSign } from "lucide-react"
import { useRouter } from "next/navigation"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { CompressedMap } from "./compressed-map"
import { apiService } from "@/lib/api"

export function CreateMatch() {
  const router = useRouter()
  const [formData, setFormData] = useState({
    type: "F5",
    gender: "Mixto",
    date: "",
    time: "",
    location: "",
    totalPlayers: 10,
    totalPrice: 80,
    description: "",
  })

  const [showDialog, setShowDialog] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")

  const handleBack = () => {
    router.back()
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")

    try {
      const matchData = {
        title: `${formData.type} ${formData.gender}`,
        description: formData.description,
        date: formData.date,
        time: formData.time,
        type: formData.type.replace("F", "FUTBOL_") as "FUTBOL_5" | "FUTBOL_7" | "FUTBOL_8" | "FUTBOL_9" | "FUTBOL_11",
        level: "INTERMEDIATE" as const,
        price: formData.totalPrice / formData.totalPlayers,
        maxPlayers: formData.totalPlayers,
        location: {
          name: formData.location,
          address: formData.location,
          latitude: -34.6037, // Default coordinates - should be obtained from geocoding
          longitude: -58.3816,
        },
        captain: {
          id: "current-user-id", // Should come from auth context
          name: "Current User",
          rating: 4.0,
        },
      }

      const response = await apiService.createMatch(matchData)

      if (response.success) {
        setShowDialog(true)
      }
    } catch (error) {
      setError("Error al crear el partido. Intenta nuevamente.")
      console.error("Create match error:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleInputChange = (field: string, value: string | number) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const pricePerPlayer = formData.totalPrice / formData.totalPlayers

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header */}
      <div className="pt-16 pb-6 px-6 border-b border-gray-100">
        <div className="flex items-center space-x-4">
          <button onClick={handleBack} className="p-2 -ml-2 touch-manipulation">
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <h1 className="text-xl font-bold text-gray-900">Crear Partido</h1>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="flex-1 px-6 py-6">
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-2xl">
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        )}

        {/* Match Type */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-900 mb-3">Tipo de partido</label>
          <div className="flex gap-3 flex-wrap">
            {["F5", "F7", "F8", "F9", "F11"].map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => handleInputChange("type", type)}
                disabled={isLoading}
                className={`px-4 py-3 rounded-full text-sm font-medium border transition-colors touch-manipulation disabled:opacity-50 ${
                  formData.type === type
                    ? "bg-green-600 text-white border-green-600"
                    : "bg-white text-gray-700 border-gray-300 hover:border-gray-400"
                }`}
              >
                {type}
              </button>
            ))}
          </div>
        </div>

        {/* Gender */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-900 mb-3">Género</label>
          <div className="flex gap-3">
            {["Mixto", "Hombres", "Mujeres"].map((gender) => (
              <button
                key={gender}
                type="button"
                onClick={() => handleInputChange("gender", gender)}
                disabled={isLoading}
                className={`px-4 py-3 rounded-full text-sm font-medium border transition-colors touch-manipulation disabled:opacity-50 ${
                  formData.gender === gender
                    ? "bg-orange-200 text-gray-900 border-orange-200"
                    : "bg-white text-gray-700 border-gray-300 hover:border-gray-400"
                }`}
              >
                {gender}
              </button>
            ))}
          </div>
        </div>

        {/* Date and Time */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">Fecha</label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                type="date"
                value={formData.date}
                onChange={(e) => handleInputChange("date", e.target.value)}
                className="pl-10 py-3 rounded-xl border-gray-300"
                required
                disabled={isLoading}
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">Hora</label>
            <Input
              type="time"
              value={formData.time}
              onChange={(e) => handleInputChange("time", e.target.value)}
              className="py-3 rounded-xl border-gray-300"
              required
              disabled={isLoading}
            />
          </div>
        </div>

        {/* Location */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-900 mb-2">Ubicación</label>
          <div className="relative">
            <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              type="text"
              placeholder="Ej: Polideportivo Norte"
              value={formData.location}
              onChange={(e) => handleInputChange("location", e.target.value)}
              className="pl-10 py-3 rounded-xl border-gray-300"
              required
              disabled={isLoading}
            />
          </div>
          {formData.location && (
            <div className="mt-3">
              <CompressedMap location={formData.location} />
            </div>
          )}
        </div>

        {/* Players */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-900 mb-2">Jugadores</label>
          <div className="relative">
            <Users className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              type="number"
              min="6"
              max="22"
              value={formData.totalPlayers}
              onChange={(e) => handleInputChange("totalPlayers", Number.parseInt(e.target.value))}
              className="pl-10 py-3 rounded-xl border-gray-300"
              required
              disabled={isLoading}
            />
          </div>
        </div>

        {/* Price */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-900 mb-2">Precio total</label>
          <div className="relative">
            <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              type="number"
              min="0"
              step="1"
              value={formData.totalPrice}
              onChange={(e) => handleInputChange("totalPrice", Number.parseFloat(e.target.value))}
              className="pl-10 py-3 rounded-xl border-gray-300"
              required
              disabled={isLoading}
            />
          </div>
          <p className="text-sm text-gray-500 mt-2">${pricePerPlayer.toFixed(2)} por jugador</p>
        </div>

        {/* Description */}
        <div className="mb-8">
          <label className="block text-sm font-medium text-gray-900 mb-2">Descripción (opcional)</label>
          <Textarea
            placeholder="Ej: Partido rápido en pista cubierta. Trae camiseta oscura y puntualidad."
            value={formData.description}
            onChange={(e) => handleInputChange("description", e.target.value)}
            className="py-3 rounded-xl border-gray-300 resize-none"
            rows={3}
            disabled={isLoading}
          />
        </div>

        {/* Submit Button */}
        <div className="pb-24">
          <Button
            type="submit"
            disabled={isLoading}
            className="w-full bg-green-600 hover:bg-green-700 text-white py-4 text-lg font-semibold rounded-2xl disabled:opacity-50"
          >
            {isLoading ? "Creando partido..." : "Crear Partido"}
          </Button>
          <p className="text-center text-sm text-gray-500 mt-3">Tu partido será visible para otros jugadores</p>
        </div>
      </form>

      <AlertDialog open={showDialog} onOpenChange={setShowDialog}>
        <AlertDialogTrigger asChild>
          <Button className="hidden">Trigger</Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogTitle>Confirmación</AlertDialogTitle>
          <AlertDialogDescription>¿Estás seguro de que quieres crear este partido?</AlertDialogDescription>
          <div className="flex justify-end space-x-2">
            <AlertDialogCancel className="bg-white text-gray-900 border-gray-300 hover:bg-gray-100">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded"
              onClick={() => router.push("/match-created")}
            >
              Crear Partido
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>

      <BottomNavigation />
    </div>
  )
}
