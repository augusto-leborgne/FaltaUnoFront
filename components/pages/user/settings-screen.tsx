"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ArrowLeft, Camera, Save, Bell } from "lucide-react"
import { useRouter } from "next/navigation"
import { AuthService } from "@/lib/auth"
import { useAuth } from "@/hooks/use-auth"

const positions = ["Arquero", "Zaguero", "Lateral", "Mediocampista", "Volante", "Delantero"]

export function SettingsScreen() {
  const router = useRouter()
  const { user: contextUser, refreshUser } = useAuth()
  const [authMethod, setAuthMethod] = useState<"email" | "google" | "apple" | "facebook">("email")
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

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
      const token = AuthService.getToken()
      if (!token) {
        router.push("/login")
        return
      }

      const response = await fetch("/api/usuarios/me", {
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      })

      if (response.ok) {
        const result = await response.json()
        const userData = result.data

        setFormData({
          name: userData.nombre || "",
          surname: userData.apellido || "",
          email: userData.email || "",
          phone: userData.celular || "",
          position: userData.posicion || "",
          height: userData.altura?.toString() || "",
          weight: userData.peso?.toString() || "",
        })

        if (userData.fotoPerfil || userData.foto_perfil) {
          const fotoBase64 = userData.fotoPerfil || userData.foto_perfil
          setAvatar(`data:image/jpeg;base64,${fotoBase64}`)
        }

        // Determinar método de autenticación
        if (userData.provider) {
          const provider = userData.provider.toLowerCase()
          if (provider === "google" || provider === "facebook" || provider === "apple") {
            setAuthMethod(provider as "google" | "facebook" | "apple")
          }
        }
      }
    } catch (error) {
      console.error("Error cargando datos:", error)
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
    try {
      const token = AuthService.getToken()
      if (!token) {
        router.push("/login")
        return
      }

      // 1. Subir foto si hay una nueva
      if (photoFile) {
        const formData = new FormData()
        formData.append("file", photoFile)

        await fetch("/api/usuarios/me/foto", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${token}`
          },
          body: formData
        })
      }

      // 2. Actualizar perfil (sin nombre, apellido, email)
      const perfilData = {
        celular: formData.phone,
        posicion: formData.position,
        altura: formData.height,
        peso: formData.weight,
      }

      const response = await fetch("/api/usuarios/me", {
        method: "PUT",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(perfilData)
      })

      if (response.ok) {
        // Actualizar contexto de autenticación
        await refreshUser()
        alert("Cambios guardados exitosamente")
        router.back()
      } else {
        const errorData = await response.json()
        alert(errorData.message || "Error al guardar cambios")
      }
    } catch (error) {
      console.error("Error guardando cambios:", error)
      alert("Error al guardar cambios")
    } finally {
      setIsSaving(false)
    }
  }

  const handleUploadPhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setPhotoFile(file)
      const reader = new FileReader()
      reader.onload = () => {
        if (reader.result) setAvatar(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full"></div>
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

      <div className="flex-1 px-6 py-6">
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
            <label className="absolute -bottom-2 -right-2 bg-green-600 text-white rounded-full p-2 shadow-lg cursor-pointer">
              <Camera className="w-4 h-4" />
              <input type="file" accept="image/*" onChange={handleUploadPhoto} className="hidden" />
            </label>
          </div>
          <p className="text-sm text-gray-500 mt-2">Toca para cambiar foto</p>
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
            />
          </div>

          <div>
            <Label className="text-sm font-medium text-gray-700 mb-3 block">Posición preferida</Label>
            <div className="flex flex-wrap gap-2">
              {positions.map((position) => (
                <button
                  key={position}
                  onClick={() => handleInputChange("position", position)}
                  className={`px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${
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
                      onClick={() => handleNotificationToggle(key)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
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
              disabled={isSaving}
              className="w-full bg-green-600 hover:bg-green-700 text-white py-4 text-lg font-semibold rounded-2xl disabled:opacity-50"
            >
              <Save className="w-5 h-5 mr-2" />
              {isSaving ? "Guardando..." : "Guardar cambios"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}