// components/pages/user/settings-screen.tsx - VERSIÓN MEJORADA
"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ArrowLeft, Camera, Save, Bell, AlertCircle, Trash2 } from "lucide-react"
import { useRouter } from "next/navigation"
import { AuthService } from "@/lib/auth"
import { useAuth } from "@/hooks/use-auth"
import { LoadingSpinner } from "@/components/ui/loading-spinner"

const positions = ["Arquero", "Zaguero", "Lateral", "Mediocampista", "Volante", "Delantero"]
const levels = ["Principiante", "Intermedio", "Avanzado", "Profesional"]

export function SettingsScreen() {
  const router = useRouter()
  const { refreshUser } = useAuth()
  const [authMethod, setAuthMethod] = useState<"email" | "google" | "apple" | "facebook">("email")
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteConfirmText, setDeleteConfirmText] = useState("")

  const [formData, setFormData] = useState({
    name: "",
    surname: "",
    email: "",
    phone: "",
    position: "",
    level: "",
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

  // ✅ NUEVO: Validación en tiempo real
  const [fieldErrors, setFieldErrors] = useState<{
    phone?: string
    height?: string
    weight?: string
  }>({})

  // ✅ NUEVO: Validar campos
  const validateField = (field: string, value: any): string | null => {
    switch (field) {
      case 'phone':
        if (value) {
          const phoneRegex = /^[0-9]{8,15}$/
          if (!phoneRegex.test(value.replace(/\s/g, ''))) return "Teléfono inválido (8-15 dígitos)"
        }
        return null
      
      case 'height':
        if (value) {
          const h = Number(value)
          if (isNaN(h) || h < 100 || h > 250) return "Altura inválida (100-250 cm)"
        }
        return null
      
      case 'weight':
        if (value) {
          const w = Number(value)
          if (isNaN(w) || w < 30 || w > 200) return "Peso inválido (30-200 kg)"
        }
        return null
      
      default:
        return null
    }
  }

  useEffect(() => {
    loadUserData()
    loadNotificationPreferences()
  }, [])

  const loadUserData = async () => {
    try {
      // Primero intentar obtener del cache
      let user = AuthService.getUser()
      
      // Si no hay en cache, fetchear del servidor
      if (!user) {
        user = await AuthService.fetchCurrentUser()
      }
      
      if (!user) {
        router.push("/login")
        return
      }

      // Construir URL de foto de perfil si existe
      if (user.id && user.foto_perfil) {
        const photoUrl = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'}/api/usuarios/${user.id}/foto`
        setAvatar(photoUrl)
      }

      setFormData({
        name: user.nombre || "",
        surname: user.apellido || "",
        email: user.email || "",
        phone: user.celular || "",
        position: user.posicion || "",
        level: user.nivel || "",
        height: user.altura?.toString() || "",
        weight: user.peso?.toString() || "",
      })

      setAuthMethod(user.provider === "GOOGLE" ? "google" : "email")

    } catch (error) {
      console.error("[Settings] Error cargando datos:", error)
      setError("Error al cargar datos del perfil")
    } finally {
      setIsLoading(false)
    }
  }

  const loadNotificationPreferences = async () => {
    try {
      const { NotificationPreferencesAPI } = await import('@/lib/api')
      const response = await NotificationPreferencesAPI.get()
      
      if (response.success && response.data) {
        setNotificationPreferences(response.data)
      }
    } catch (error) {
      console.error("[Settings] Error cargando preferencias:", error)
    }
  }

  const handleInputChange = (field: keyof typeof formData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    // ✅ Validar campos editables (phone, height, weight)
    if (field === 'phone' || field === 'height' || field === 'weight') {
      const fieldError = validateField(field, value)
      setFieldErrors(prev => ({ ...prev, [field]: fieldError || undefined }))
    }
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
        nivel: formData.level,
        altura: formData.height ? parseInt(formData.height) : undefined,
        peso: formData.weight ? parseInt(formData.weight) : undefined,
      }

      const success = await AuthService.updateProfile(perfilData)
      
      if (!success) {
        throw new Error("Error al actualizar el perfil")
      }

      console.log("[Settings] Perfil actualizado exitosamente")

      // 3. Guardar preferencias de notificación
      console.log("[Settings] Guardando preferencias de notificación...")
      try {
        const { NotificationPreferencesAPI } = await import('@/lib/api')
        await NotificationPreferencesAPI.update(notificationPreferences)
        console.log("[Settings] Preferencias de notificación guardadas")
      } catch (prefError) {
        console.warn("[Settings] Error guardando preferencias de notificación:", prefError)
        // No fallar el guardado completo por esto
      }

      // 4. Refrescar contexto
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

  const handleDeleteAccount = async () => {
    if (deleteConfirmText.toLowerCase() !== "eliminar") {
      setError("Debes escribir 'ELIMINAR' para confirmar")
      return
    }

    setIsDeleting(true)
    setError("")

    try {
      console.log("[Settings] Eliminando cuenta...")
      
      const { UsuarioAPI } = await import('@/lib/api')
      const response = await UsuarioAPI.eliminarCuenta()

      if (!response.success) {
        throw new Error(response.message || "Error al eliminar la cuenta")
      }

      console.log("[Settings] Cuenta eliminada exitosamente")
      
      // Cerrar sesión y redirigir
      AuthService.logout()
      router.replace("/login")
      
    } catch (error) {
      console.error("[Settings] Error eliminando cuenta:", error)
      setError(error instanceof Error ? error.message : "Error al eliminar la cuenta")
      setIsDeleting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <LoadingSpinner size="lg" variant="green" text="Cargando configuración..." />
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
              className={`mt-1 ${fieldErrors.phone ? 'border-red-500' : ''}`}
              disabled={isSaving}
            />
            {fieldErrors.phone && (
              <p className="text-sm text-red-500 mt-1 flex items-center gap-1">
                <AlertCircle className="w-4 h-4" />
                {fieldErrors.phone}
              </p>
            )}
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

          <div>
            <Label className="text-sm font-medium text-gray-700 mb-3 block">Nivel de juego</Label>
            <div className="flex flex-wrap gap-2">
              {levels.map((level) => (
                <button
                  key={level}
                  type="button"
                  onClick={() => handleInputChange("level", level)}
                  disabled={isSaving}
                  className={`px-3 py-2 rounded-lg text-sm font-medium border transition-colors disabled:opacity-50 ${
                    formData.level === level
                      ? "bg-green-100 text-green-800 border-green-300"
                      : "bg-gray-50 text-gray-700 border-gray-300 hover:border-gray-400"
                  }`}
                >
                  {level}
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
                className={`mt-1 ${fieldErrors.height ? 'border-red-500' : ''}`}
                disabled={isSaving}
              />
              {fieldErrors.height && (
                <p className="text-sm text-red-500 mt-1 flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" />
                  {fieldErrors.height}
                </p>
              )}
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
                className={`mt-1 ${fieldErrors.weight ? 'border-red-500' : ''}`}
                disabled={isSaving}
              />
              {fieldErrors.weight && (
                <p className="text-sm text-red-500 mt-1 flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" />
                  {fieldErrors.weight}
                </p>
              )}
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
          <div className="mt-8 pb-4">
            <Button
              onClick={handleSave}
              disabled={
                isSaving || 
                success || 
                !!fieldErrors.phone || 
                !!fieldErrors.height || 
                !!fieldErrors.weight
              }
              className="w-full bg-green-600 hover:bg-green-700 text-white py-4 text-lg font-semibold rounded-2xl disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving ? (
                <span className="flex items-center justify-center">
                  <LoadingSpinner size="sm" variant="white" className="mr-2" />
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

          {/* Danger Zone - Delete Account */}
          <div className="mt-8 pb-8 border-t border-gray-200 pt-8">
            <h3 className="text-lg font-bold text-red-600 mb-4 flex items-center">
              <Trash2 className="w-5 h-5 mr-2" />
              Zona de peligro
            </h3>
            
            {!showDeleteConfirm ? (
              <div>
                <p className="text-sm text-gray-600 mb-4">
                  Una vez eliminada tu cuenta, no podrás recuperarla. Todos tus datos, partidos y conexiones se perderán permanentemente.
                </p>
                <Button
                  onClick={() => setShowDeleteConfirm(true)}
                  variant="outline"
                  className="w-full border-red-300 text-red-600 hover:bg-red-50 py-3"
                  disabled={isSaving || isDeleting}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Eliminar mi cuenta
                </Button>
              </div>
            ) : (
              <div className="bg-red-50 rounded-2xl p-6 border border-red-200">
                <p className="text-sm text-red-700 mb-4 font-medium">
                  ⚠️ Esta acción no se puede deshacer. Todos tus datos serán eliminados permanentemente.
                </p>
                <p className="text-sm text-gray-700 mb-4">
                  Para confirmar, escribe <strong>ELIMINAR</strong> en el campo de abajo:
                </p>
                <Input
                  type="text"
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  placeholder="Escribe ELIMINAR"
                  className="mb-4"
                  disabled={isDeleting}
                />
                <div className="flex gap-3">
                  <Button
                    onClick={() => {
                      setShowDeleteConfirm(false)
                      setDeleteConfirmText("")
                      setError("")
                    }}
                    variant="outline"
                    className="flex-1"
                    disabled={isDeleting}
                  >
                    Cancelar
                  </Button>
                  <Button
                    onClick={handleDeleteAccount}
                    disabled={isDeleting || deleteConfirmText.toLowerCase() !== "eliminar"}
                    className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                  >
                    {isDeleting ? (
                      <span className="flex items-center justify-center">
                        <LoadingSpinner size="sm" variant="white" className="mr-2" />
                        Eliminando...
                      </span>
                    ) : (
                      <>
                        <Trash2 className="w-4 h-4 mr-2" />
                        Eliminar cuenta
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}