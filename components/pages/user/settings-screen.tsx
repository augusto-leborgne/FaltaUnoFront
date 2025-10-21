// components/pages/user/settings-screen.tsx - VERSIÓN MEJORADA
"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ArrowLeft, Camera, Save, Bell, AlertCircle } from "lucide-react"
import { useRouter } from "next/navigation"
import { AuthService } from "@/lib/auth"
import { useAuth } from "@/hooks/use-auth"

const positions = ["Arquero", "Zaguero", "Lateral", "Mediocampista", "Volante", "Delantero"]

export function SettingsScreen() {
  const router = useRouter()
  const { refreshUser } = useAuth()
  const [authMethod, setAuthMethod] = useState<"email" | "google" | "apple" | "facebook">("email")
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)

  const [formData, setFormData] = useState({
    name: "",
    surname: "",
    email: "",
    phone: "",
    position: "",
    height: "",
    weight: "",
  })

  const [avatar, setAvatar] = useState<string>("")
  const [photoFile, setPhotoFile] = useState<File | null>(null)

  const [notificationPreferences, setNotificationPreferences] = useState({
    matchInvitations: true,
    friendRequests: true,
    matchUpdates: true,
    reviewRequests: true,
    newMessages: true,
    generalUpdates: false,
  })

  useEffect(() => {
    loadUserData()
  }, [])

  const loadUserData = async () => {
    try {
      setIsLoading(true)
      setError("")
      
      const token = AuthService.getToken()
      if (!token) {
        router.push("/login")
        return
      }

      console.log("[Settings] Cargando datos del usuario...")

      // ✅ CRÍTICO: Usar fetchCurrentUser para obtener datos actualizados
      const userData = await AuthService.fetchCurrentUser()
      
      if (!userData) {
        throw new Error("No se pudieron cargar los datos del usuario")
      }

      console.log("[Settings] Datos cargados:", userData)

      setFormData({
        name: userData.nombre || "",
        surname: userData.apellido || "",
        email: userData.email || "",
        phone: userData.celular || "",
        position: userData.posicion || "",
        height: userData.altura?.toString() || "",
        weight: userData.peso?.toString() || "",
      })

      // ✅ CRÍTICO: Usar foto_perfil normalizada
      if (userData.foto_perfil) {
        setAvatar(`data:image/jpeg;base64,${userData.foto_perfil}`)
      }

      // Determinar método de autenticación
      if (userData.provider) {
        const provider = userData.provider.toLowerCase()
        if (provider === "google" || provider === "facebook" || provider === "apple") {
          setAuthMethod(provider as "google" | "facebook" | "apple")
        }
      }
    } catch (error) {
      console.error("[Settings] Error cargando datos:", error)
      setError("Error al cargar datos del perfil")
    } finally {
      setIsLoading(false)
    }
  }

  const handleInputChange = (field: keyof typeof formData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleNotificationToggle = (field: keyof typeof notificationPreferences) => {
    setNotificationPreferences((prev) => ({ ...prev, [field]: !prev[field] }))
  }

  const handleBack = () => router.back()

  const handleSave = async () => {
    setIsSaving(true)
    setError("")
    setSuccess(false)
    
    try {
      console.log("[Settings] Guardando cambios...")

      // 1. Subir foto si hay una nueva
      if (photoFile) {
        console.log("[Settings] Subiendo foto...")
        const success = await AuthService.updateProfilePhoto(photoFile)
        
        if (!success) {
          throw new Error("Error al subir la foto")
        }
        
        console.log("[Settings] Foto subida exitosamente")
      }

      // 2. Actualizar perfil (sin nombre, apellido, email)
      console.log("[Settings] Actualizando perfil...")
      
      const perfilData = {
        celular: formData.phone,
        posicion: formData.position,
        altura: formData.height ? parseInt(formData.height) : undefined,
        peso: formData.weight ? parseInt(formData.weight) : undefined,
      }

      const success = await AuthService.updateProfile(perfilData)
      
      if (!success) {
        throw new Error("Error al actualizar el perfil")
      }

      console.log("[Settings] Perfil actualizado exitosamente")

      // 3. Refrescar contexto
      await refreshUser()

      setSuccess(true)
      
      // Redirigir después de 1 segundo
      setTimeout(() => {
        router.back()
      }, 1000)

    } catch (error) {
      console.error("[Settings] Error guardando cambios:", error)
      setError(error instanceof Error ? error.message : "Error al guardar cambios")
    } finally {
      setIsSaving(false)
    }
  }

  const handleUploadPhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // Validar tamaño (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setError("La imagen debe ser menor a 5MB")
        return
      }

      // Validar tipo
      if (!file.type.startsWith('image/')) {
        setError("El archivo debe ser una imagen")
        return
      }

      setPhotoFile(file)
      
      const reader = new FileReader()
      reader.onload = () => {
        if (reader.result) setAvatar(reader.result as string)
      }
      reader.readAsDataURL(file)
      
      console.log("[Settings] Foto seleccionada:", file.name)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando configuración...</p>
        </div>
      </div>
    )
  }

  const initials = `${formData.name} ${formData.surname}`.trim()
    .split(" ")
    .map(n => n[0])
    .join("")
    .toUpperCase()

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header */}
      <div className="pt-16 pb-6 px-6 border-b border-gray-100">
        <div className="flex items-center space-x-4">
          <button onClick={handleBack} className="p-2 -ml-2">
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <h1 className="text-xl font-bold text-gray-900">Configuración</h1>
        </div>
      </div>

      <div className="flex-1 px-6 py-6 overflow-y-auto">
        {/* Success Message */}
        {success && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-2xl flex items-start space-x-3">
            <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
              <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            </div>
            <div>
              <p className="text-green-600 text-sm font-medium">¡Cambios guardados!</p>
              <p className="text-green-600 text-sm">Redirigiendo...</p>
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-2xl flex items-start space-x-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-red-600 text-sm font-medium">Error</p>
              <p className="text-red-600 text-sm">{error}</p>
            </div>
            <button 
              onClick={() => setError("")}
              className="text-red-600 hover:text-red-700"
            >
              ✕
            </button>
          </div>
        )}

        {/* Profile Photo */}
        <div className="text-center mb-8">
          <div className="relative inline-block">
            <Avatar className="w-24 h-24">
              {avatar ? (
                <AvatarImage src={avatar} alt="Foto de perfil" />
              ) : (
                <AvatarFallback className="bg-orange-100 text-2xl">{initials}</AvatarFallback>
              )}
            </Avatar>
            <label className="absolute -bottom-2 -right-2 bg-green-600 text-white rounded-full p-2 shadow-lg cursor-pointer hover:bg-green-700 transition-colors">
              <Camera className="w-4 h-4" />
              <input 
                type="file" 
                accept="image/*" 
                onChange={handleUploadPhoto} 
                className="hidden"
                disabled={isSaving}
              />
            </label>
          </div>
          <p className="text-sm text-gray-500 mt-2">Toca para cambiar foto</p>
          {photoFile && (
            <p className="text-sm text-green-600 mt-1">Nueva foto seleccionada</p>
          )}
        </div>

        {/* Form Fields */}
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="name" className="text-sm font-medium text-gray-700">
                Nombre
              </Label>
              <Input
                id="name"
                value={formData.name}
                disabled
                className="mt-1 bg-gray-100 text-gray-500 cursor-not-allowed"
              />
              <p className="text-xs text-gray-500 mt-1">No se puede editar</p>
            </div>
            <div>
              <Label htmlFor="surname" className="text-sm font-medium text-gray-700">
                Apellido
              </Label>
              <Input
                id="surname"
                value={formData.surname}
                disabled
                className="mt-1 bg-gray-100 text-gray-500 cursor-not-allowed"
              />
              <p className="text-xs text-gray-500 mt-1">No se puede editar</p>
            </div>
          </div>

          <div>
            <Label htmlFor="email" className="text-sm font-medium text-gray-700">
              Email
            </Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              disabled
              className="mt-1 bg-gray-100 text-gray-500 cursor-not-allowed"
            />
            <p className="text-xs text-gray-500 mt-1">
              {authMethod !== "email" 
                ? `Registrado con ${authMethod === "google" ? "Google" : authMethod === "apple" ? "Apple" : "Facebook"}` 
                : "No se puede editar"}
            </p>
          </div>

          <div>
            <Label htmlFor="phone" className="text-sm font-medium text-gray-700">
              Teléfono
            </Label>
            <Input
              id="phone"
              value={formData.phone}
              onChange={(e) => handleInputChange("phone", e.target.value)}
              className="mt-1"
              disabled={isSaving}
            />
          </div>

          <div>
            <Label className="text-sm font-medium text-gray-700 mb-3 block">Posición preferida</Label>
            <div className="flex flex-wrap gap-2">
              {positions.map((position) => (
                <button
                  key={position}
                  type="button"
                  onClick={() => handleInputChange("position", position)}
                  disabled={isSaving}
                  className={`px-3 py-2 rounded-lg text-sm font-medium border transition-colors disabled:opacity-50 ${
                    formData.position === position
                      ? "bg-green-100 text-green-800 border-green-300"
                      : "bg-gray-50 text-gray-700 border-gray-300 hover:border-gray-400"
                  }`}
                >
                  {position}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="height" className="text-sm font-medium text-gray-700">
                Altura (cm)
              </Label>
              <Input
                id="height"
                type="number"
                value={formData.height}
                onChange={(e) => handleInputChange("height", e.target.value)}
                className="mt-1"
                disabled={isSaving}
              />
            </div>
            <div>
              <Label htmlFor="weight" className="text-sm font-medium text-gray-700">
                Peso (kg)
              </Label>
              <Input
                id="weight"
                type="number"
                value={formData.weight}
                onChange={(e) => handleInputChange("weight", e.target.value)}
                className="mt-1"
                disabled={isSaving}
              />
            </div>
          </div>

          {/* Notification Preferences */}
          <div className="bg-gray-50 rounded-2xl p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
              <Bell className="w-5 h-5 mr-2" />
              Preferencias de notificaciones
            </h3>

            <div className="space-y-4">
              {(Object.keys(notificationPreferences) as (keyof typeof notificationPreferences)[]).map((key) => {
                const labels = {
                  matchInvitations: "Invitaciones a partidos",
                  friendRequests: "Solicitudes de amistad",
                  matchUpdates: "Actualizaciones de partidos",
                  reviewRequests: "Solicitudes de reseñas",
                  newMessages: "Nuevos mensajes",
                  generalUpdates: "Actualizaciones generales",
                }
                
                return (
                  <div key={key} className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900">{labels[key]}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleNotificationToggle(key)}
                      disabled={isSaving}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors disabled:opacity-50 ${
                        notificationPreferences[key] ? "bg-green-600" : "bg-gray-300"
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          notificationPreferences[key] ? "translate-x-6" : "translate-x-1"
                        }`}
                      />
                    </button>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Save Button */}
          <div className="mt-8 pb-8">
            <Button
              onClick={handleSave}
              disabled={isSaving || success}
              className="w-full bg-green-600 hover:bg-green-700 text-white py-4 text-lg font-semibold rounded-2xl disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving ? (
                <span className="flex items-center justify-center">
                  <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                  Guardando...
                </span>
              ) : success ? (
                <span className="flex items-center justify-center">
                  ✓ Cambios guardados
                </span>
              ) : (
                <>
                  <Save className="w-5 h-5 mr-2" />
                  Guardar cambios
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}