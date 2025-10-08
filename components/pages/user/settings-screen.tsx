"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ArrowLeft, Camera, Save, Bell } from "lucide-react"
import { useRouter } from "next/navigation"

const positions = ["Arquero", "Zaguero", "Lateral", "Mediocampista", "Volante", "Delantero"]

export function SettingsScreen() {
  const router = useRouter()
  const [authMethod] = useState<"email" | "google" | "apple" | "facebook">("google") // viene del usuario

  const [formData, setFormData] = useState({
    name: "Tu",
    surname: "Usuario",
    email: "usuario@gmail.com",
    phone: "+598 99 123 456",
    position: "Mediocampista",
    height: "175",
    weight: "70",
  })

  const [avatar, setAvatar] = useState<string>("/placeholder.svg?height=96&width=96")

  const [notificationPreferences, setNotificationPreferences] = useState({
    matchInvitations: true,
    friendRequests: true,
    matchUpdates: true,
    reviewRequests: true,
    newMessages: true,
    generalUpdates: false,
  })

  const handleInputChange = (field: keyof typeof formData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleNotificationToggle = (field: keyof typeof notificationPreferences) => {
    setNotificationPreferences((prev) => ({ ...prev, [field]: !prev[field] }))
  }

  const handleBack = () => router.back()

  const handleSave = () => {
    console.log("Guardando perfil:", formData)
    console.log("Guardando preferencias de notificación:", notificationPreferences)
    console.log("Foto subida:", avatar)
    router.back()
  }

  const handleUploadPhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = () => {
        if (reader.result) setAvatar(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

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
              <AvatarImage src={avatar} />
              <AvatarFallback className="bg-orange-100 text-2xl">TU</AvatarFallback>
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
              onChange={authMethod === "email" ? (e) => handleInputChange("email", e.target.value) : undefined}
              disabled={authMethod !== "email"}
              className={`mt-1 ${authMethod !== "email" ? "bg-gray-100 text-gray-500 cursor-not-allowed" : ""}`}
            />
            {authMethod !== "email" && (
              <p className="text-xs text-gray-500 mt-1">
                Registrado con {authMethod === "google" ? "Google" : authMethod === "apple" ? "Apple" : "Facebook"}, no se puede editar
              </p>
            )}
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
              {(Object.keys(notificationPreferences) as (keyof typeof notificationPreferences)[]).map((key) => (
                <div key={key} className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">{key}</p>
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
              ))}
            </div>
          </div>

          {/* Save Button */}
          <div className="mt-8 pb-8">
            <Button
              onClick={handleSave}
              className="w-full bg-green-600 hover:bg-green-700 text-white py-4 text-lg font-semibold rounded-2xl"
            >
              <Save className="w-5 h-5 mr-2" />
              Guardar cambios
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}