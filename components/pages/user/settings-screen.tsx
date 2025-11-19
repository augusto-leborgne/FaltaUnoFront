// components/pages/user/settings-screen.tsx - VERSIÓN SIMPLIFICADA SIN PHONE
"use client"

import { logger } from '@/lib/logger'
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ArrowLeft, Save, AlertCircle } from "lucide-react"
import { useRouter } from "next/navigation"
import { AuthService } from "@/lib/auth"
import { useAuth } from "@/hooks/use-auth"
import { LoadingSpinner } from "@/components/ui/loading-spinner"

const positions = ["Arquero", "Defensa", "Mediocampista", "Delantero"]

export function SettingsScreen() {
  const router = useRouter()
  const { refreshUser } = useAuth()
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)

  const [formData, setFormData] = useState({
    name: "",
    surname: "",
    email: "",
    position: "",
    height: "",
    weight: "",
  })

  useEffect(() => {
    loadUserData()
  }, [])

  const loadUserData = async () => {
    try {
      let user = await AuthService.fetchCurrentUser()
      
      if (!user) {
        router.push("/login")
        return
      }

      setFormData({
        name: user.nombre || "",
        surname: user.apellido || "",
        email: user.email || "",
        position: user.posicion || "",
        height: user.altura?.toString() || "",
        weight: user.peso?.toString() || "",
      })

    } catch (error) {
      logger.error("[Settings] Error cargando datos:", error)
      setError("Error al cargar datos del perfil")
    } finally {
      setIsLoading(false)
    }
  }

  const handleSave = async () => {
    setIsSaving(true)
    setError("")
    setSuccess(false)

    try {
      const success = await AuthService.updateProfile({
        nombre: formData.name,
        apellido: formData.surname,
        posicion: formData.position,
        altura: formData.height ? Number(formData.height) : undefined,
        peso: formData.weight ? Number(formData.weight) : undefined,
      })

      if (success) {
        await refreshUser()
        setSuccess(true)
        setTimeout(() => setSuccess(false), 3000)
      } else {
        setError("Error al actualizar perfil")
      }
    } catch (err: any) {
      logger.error("[Settings] Error guardando:", err)
      setError(err?.message || "Error al guardar cambios")
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size="xl" variant="green" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="flex items-center gap-4 p-4">
          <button 
            onClick={() => router.back()}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <ArrowLeft size={24} />
          </button>
          <h1 className="text-xl font-semibold">Configuración</h1>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-2xl mx-auto p-6 space-y-6">
        {/* Error/Success Messages */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
            <AlertCircle className="text-red-600 flex-shrink-0 mt-0.5" size={20} />
            <p className="text-red-800 text-sm">{error}</p>
          </div>
        )}

        {success && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <p className="text-green-800 text-sm font-medium">✓ Cambios guardados correctamente</p>
          </div>
        )}

        {/* Personal Info */}
        <div className="bg-white rounded-lg shadow-sm p-6 space-y-4">
          <h2 className="text-lg font-semibold mb-4">Información Personal</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="name">Nombre</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              />
            </div>

            <div>
              <Label htmlFor="surname">Apellido</Label>
              <Input
                id="surname"
                value={formData.surname}
                onChange={(e) => setFormData(prev => ({ ...prev, surname: e.target.value }))}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="email">Email (no editable)</Label>
            <Input
              id="email"
              value={formData.email}
              disabled
              className="bg-gray-100"
            />
          </div>
        </div>

        {/* Player Info */}
        <div className="bg-white rounded-lg shadow-sm p-6 space-y-4">
          <h2 className="text-lg font-semibold mb-4">Información Deportiva</h2>
          
          <div>
            <Label htmlFor="position">Posición</Label>
            <select
              id="position"
              value={formData.position}
              onChange={(e) => setFormData(prev => ({ ...prev, position: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent"
            >
              <option value="">Seleccionar posición</option>
              {positions.map((pos) => (
                <option key={pos} value={pos}>{pos}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="height">Altura (cm)</Label>
              <Input
                id="height"
                type="number"
                placeholder="175"
                value={formData.height}
                onChange={(e) => setFormData(prev => ({ ...prev, height: e.target.value }))}
              />
            </div>

            <div>
              <Label htmlFor="weight">Peso (kg)</Label>
              <Input
                id="weight"
                type="number"
                placeholder="70"
                value={formData.weight}
                onChange={(e) => setFormData(prev => ({ ...prev, weight: e.target.value }))}
              />
            </div>
          </div>
        </div>

        {/* Save Button */}
        <Button
          onClick={handleSave}
          disabled={isSaving}
          className="w-full bg-green-600 hover:bg-green-700 text-white"
          size="lg"
        >
          {isSaving ? (
            <><LoadingSpinner size="sm" className="mr-2" /> Guardando...</>
          ) : (
            <><Save size={20} className="mr-2" /> Guardar Cambios</>
          )}
        </Button>
      </div>
    </div>
  )
}
