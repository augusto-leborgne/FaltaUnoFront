"use client"

import React, { useRef, useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { useRouter } from "next/navigation"
import { User, ChevronDown } from "lucide-react"
import AddressAutocomplete from "@/components/google-maps/address-autocomplete"
import { AuthService } from "@/lib/auth"
import { useAuth } from "@/hooks/use-auth"
import { UsuarioAPI } from "@/lib/api"
import { usePostAuthRedirect } from "@/lib/navigation"

export function ProfileSetupForm() {
  const router = useRouter()
  const { user, setUser } = useAuth()
  const postAuthRedirect = usePostAuthRedirect()
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const [formData, setFormData] = useState({
    name: "",
    surname: "",
    phone: "",
    fechaNacimiento: "",
    position: "",
    level: "",
    height: "",
    weight: "",
    photo: null as File | null,
    photoPreviewUrl: "" as string,
    address: "",
    placeDetails: null as google.maps.places.PlaceResult | null,
  })

  const [showPositionDropdown, setShowPositionDropdown] = useState(false)
  const [showLevelDropdown, setShowLevelDropdown] = useState(false)
  const [isUploading, setIsUploading] = useState(false)

  const positions = ["Arquero", "Zaguero", "Lateral", "Mediocampista", "Volante", "Delantero"]
  const levels = ["Principiante", "Intermedio", "Avanzado", "Profesional"]

  useEffect(() => {
    return () => {
      if (formData.photoPreviewUrl) URL.revokeObjectURL(formData.photoPreviewUrl)
    }
  }, [formData.photoPreviewUrl])

  const openFilePicker = () => fileInputRef.current?.click()

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null
    if (!f) return
    if (formData.photoPreviewUrl) URL.revokeObjectURL(formData.photoPreviewUrl)
    setFormData((p) => ({ ...p, photo: f, photoPreviewUrl: URL.createObjectURL(f) }))
  }

  const handlePositionSelect = (position: string) => {
    setFormData((p) => ({ ...p, position }))
    setShowPositionDropdown(false)
  }

  const handleLevelSelect = (level: string) => {
    setFormData((p) => ({ ...p, level }))
    setShowLevelDropdown(false)
  }

  const handleAddressChangeFromAutocomplete = (
    address: string,
    placeDetails?: google.maps.places.PlaceResult | null
  ) => {
    setFormData((p) => ({ ...p, address: address ?? "", placeDetails: placeDetails ?? null }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.photo) return alert("La foto es obligatoria")
    if (!formData.name || !formData.surname) return alert("Nombre y apellido son obligatorios")
    if (!formData.phone) return alert("El número de teléfono es obligatorio")
    if (!formData.fechaNacimiento) return alert("La fecha de nacimiento es obligatoria")

    await handleUploadAndSaveProfile()
  }

  async function handleUploadAndSaveProfile() {
    if (!formData.photo) return alert("Foto requerida")

    setIsUploading(true)
    try {
      const token = AuthService.getToken()
      console.log("[ProfileSetup] Token disponible:", token ? "SÍ" : "NO")
      if (!token) {
        alert("No estás autenticado. Por favor, inicia sesión nuevamente.")
        router.replace("/login")
        return
      }
      if (AuthService.isTokenExpired(token)) {
        alert("Tu sesión ha expirado. Por favor, inicia sesión nuevamente.")
        AuthService.logout()
        router.replace("/login")
        return
      }

      // 1) Subir foto vía API unificada
      console.log("[ProfileSetup] Subiendo foto...")
      const fotoRes = await UsuarioAPI.subirFoto(formData.photo)
      if (!fotoRes?.success) throw new Error("No se pudo subir la foto")

      // 2) Actualizar perfil
      console.log("[ProfileSetup] Actualizando perfil...")
      const payload: any = {
        nombre: formData.name,
        apellido: formData.surname,
        celular: formData.phone,
        fecha_nacimiento: formData.fechaNacimiento,
        posicion: formData.position,
        nivel: formData.level,
        altura: formData.height,
        peso: formData.weight,
        direccion: formData.address,
        placeDetails: formData.placeDetails ? JSON.stringify(formData.placeDetails) : null,
      }
      const perfilRes = await UsuarioAPI.actualizarPerfil(payload)
      if (!perfilRes?.success) throw new Error("No se pudo actualizar el perfil")

      // 3) Actualizar user local inmediatamente (clave para salir del loop)
      const serverUser = perfilRes.data || {}
      const merged: any = {
        ...(AuthService.getUser() ?? {}),
        ...serverUser,
        perfilCompleto: true, // <<<< habilita flujo siguiente
      }
      AuthService.setUser(merged)
      setUser(merged)

      // 4) Redirigir según regla global (profile-setup / verification / home)
      postAuthRedirect(merged) // si cedulaVerificada=false → /verification, si true → /home

      // (opcional) refrescar en background
      setTimeout(() => AuthService.fetchCurrentUser(), 1500)
    } catch (err: any) {
      console.error("[ProfileSetup] Error al guardar perfil:", err)
      alert(`Error al guardar perfil: ${err?.message ?? "Intenta nuevamente"}`)
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <div className="pt-16 pb-8 text-center border-b border-gray-100">
        <h1 className="text-2xl font-bold text-gray-900">Crea tu perfil</h1>
      </div>

      <div className="flex-1 px-6 py-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="bg-gray-50 rounded-2xl p-6 flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Avatar className="w-16 h-16 bg-orange-100">
                {formData.photoPreviewUrl ? (
                  <img src={formData.photoPreviewUrl} alt="preview" className="w-16 h-16 object-cover rounded-md" />
                ) : (
                  <AvatarFallback className="bg-orange-100">
                    <User className="w-8 h-8 text-gray-600" />
                  </AvatarFallback>
                )}
              </Avatar>
              <div>
                <h3 className="font-semibold text-gray-900">Tu foto</h3>
                <p className="text-sm text-red-500">Obligatorio</p>
                {formData.photo && (
                  <p className="text-sm text-gray-600 mt-1 truncate" style={{ maxWidth: 220 }}>
                    {formData.photo.name}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <Button
                type="button"
                variant="outline"
                className="bg-orange-100 border-orange-200 text-gray-700 hover:bg-orange-200 active:bg-orange-300 touch-manipulation"
                onClick={openFilePicker}
              >
                {formData.photo ? "Cambiar" : "Agregar"}
              </Button>

              <input ref={fileInputRef} type="file" accept="image/*" onChange={handlePhotoChange} className="hidden" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              placeholder="Nombre"
              value={formData.name}
              onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))}
              required
            />
            <Input
              placeholder="Apellido"
              value={formData.surname}
              onChange={(e) => setFormData((p) => ({ ...p, surname: e.target.value }))}
              required
            />
          </div>

          <Input
            placeholder="Celular"
            value={formData.phone}
            onChange={(e) => setFormData((p) => ({ ...p, phone: e.target.value }))}
            required
          />

          <Input
            placeholder="Fecha de nacimiento"
            value={formData.fechaNacimiento}
            onChange={(e) => setFormData((p) => ({ ...p, fechaNacimiento: e.target.value }))}
            type="date"
            required
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              placeholder="Altura (cm)"
              type="number"
              value={formData.height}
              onChange={(e) => setFormData((p) => ({ ...p, height: e.target.value }))}
            />
            <Input
              placeholder="Peso (kg)"
              type="number"
              value={formData.weight}
              onChange={(e) => setFormData((p) => ({ ...p, weight: e.target.value }))}
            />
          </div>

          <div>
            <AddressAutocomplete
              value={formData.address}
              onChange={(address, placeDetails) => handleAddressChangeFromAutocomplete(address, placeDetails)}
              placeholder="Ubicación"
            />
          </div>

          <div className="relative">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowPositionDropdown(!showPositionDropdown)}
              className="w-full text-left py-3 px-4 rounded-xl border border-gray-300 bg-white justify-between"
            >
              <span>{formData.position || "Selecciona tu posición"}</span>
              <ChevronDown className="w-5 h-5" />
            </Button>
            {showPositionDropdown && (
              <div className="absolute mt-1 w-full bg-white border border-gray-300 rounded-xl z-50 max-h-60 overflow-auto">
                {positions.map((pos) => (
                  <div
                    key={pos}
                    onClick={() => handlePositionSelect(pos)}
                    className="p-3 hover:bg-gray-100 cursor-pointer"
                  >
                    {pos}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="relative">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowLevelDropdown(!showLevelDropdown)}
              className="w-full text-left py-3 px-4 rounded-xl border border-gray-300 bg-white justify-between"
            >
              <span>{formData.level || "Selecciona tu nivel"}</span>
              <ChevronDown className="w-5 h-5" />
            </Button>
            {showLevelDropdown && (
              <div className="absolute mt-1 w-full bg-white border border-gray-300 rounded-xl z-50">
                {levels.map((lv) => (
                  <div
                    key={lv}
                    onClick={() => handleLevelSelect(lv)}
                    className="p-3 hover:bg-gray-100 cursor-pointer"
                  >
                    {lv}
                  </div>
                ))}
              </div>
            )}
          </div>

          <Button type="submit" className="w-full bg-green-600 hover:bg-green-700 text-white py-4 rounded-2xl" disabled={isUploading}>
            {isUploading ? "Guardando..." : "Continuar"}
          </Button>
        </form>
      </div>
    </div>
  )
}

export default ProfileSetupForm