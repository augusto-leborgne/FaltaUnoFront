"use client"

import React, { useRef, useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { useRouter } from "next/navigation"
import { User, ChevronDown, AlertCircle } from "lucide-react"
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
    genero: "",
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
  const [showGeneroDropdown, setShowGeneroDropdown] = useState(false)
  const [isUploading, setIsUploading] = useState(false)

  // ✅ NUEVO: Validación en tiempo real
  const [fieldErrors, setFieldErrors] = useState<{
    name?: string
    surname?: string
    phone?: string
    fechaNacimiento?: string
    genero?: string
    position?: string
    level?: string
    height?: string
    weight?: string
    photo?: string
    address?: string
  }>({})

  // ✅ NUEVO: Validar campos individuales
  const validateField = (field: string, value: any): string | null => {
    switch (field) {
      case 'name':
        if (!value || value.trim().length < 2) return "El nombre debe tener al menos 2 caracteres"
        if (value.trim().length > 50) return "El nombre no puede superar 50 caracteres"
        return null
      
      case 'surname':
        if (!value || value.trim().length < 2) return "El apellido debe tener al menos 2 caracteres"
        if (value.trim().length > 50) return "El apellido no puede superar 50 caracteres"
        return null
      
      case 'phone':
        if (!value) return "El teléfono es requerido"
        const phoneRegex = /^[0-9]{8,15}$/
        if (!phoneRegex.test(value.replace(/\s/g, ''))) return "Teléfono inválido (8-15 dígitos)"
        return null
      
      case 'fechaNacimiento':
        if (!value) return "La fecha de nacimiento es requerida"
        const birthDate = new Date(value)
        const today = new Date()
        const age = today.getFullYear() - birthDate.getFullYear()
        if (age < 13) return "Debes tener al menos 13 años"
        if (age > 100) return "Fecha inválida"
        return null
      
      case 'genero':
        if (!value) return "Selecciona tu género"
        return null
      
      case 'position':
        if (!value) return "Selecciona una posición"
        return null
      
      case 'level':
        if (!value) return "Selecciona tu nivel"
        return null
      
      case 'height':
        if (!value) return "La altura es requerida"
        const h = Number(value)
        if (isNaN(h) || h < 100 || h > 250) return "Altura inválida (100-250 cm)"
        return null
      
      case 'weight':
        if (!value) return "El peso es requerido"
        const w = Number(value)
        if (isNaN(w) || w < 30 || w > 200) return "Peso inválido (30-200 kg)"
        return null
      
      case 'photo':
        if (!value) return "La foto de perfil es obligatoria"
        return null
      
      case 'address':
        if (!value || value.trim().length < 5) return "La dirección debe tener al menos 5 caracteres"
        return null
      
      default:
        return null
    }
  }

  const handleFieldChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    const fieldError = validateField(field, value)
    setFieldErrors(prev => ({ ...prev, [field]: fieldError || undefined }))
  }

  const positions = ["Arquero", "Zaguero", "Lateral", "Mediocampista", "Volante", "Delantero"]
  const levels = ["Principiante", "Intermedio", "Avanzado", "Profesional"]
  const generos = ["Masculino", "Femenino"]

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
    // ✅ Validar foto
    const photoError = validateField('photo', f)
    setFieldErrors(prev => ({ ...prev, photo: photoError || undefined }))
  }

  const handlePositionSelect = (position: string) => {
    setFormData((p) => ({ ...p, position }))
    setShowPositionDropdown(false)
    // ✅ Validar posición
    const positionError = validateField('position', position)
    setFieldErrors(prev => ({ ...prev, position: positionError || undefined }))
  }

  const handleLevelSelect = (level: string) => {
    setFormData((p) => ({ ...p, level }))
    setShowLevelDropdown(false)
    // ✅ Validar nivel
    const levelError = validateField('level', level)
    setFieldErrors(prev => ({ ...prev, level: levelError || undefined }))
  }

  const handleGeneroSelect = (genero: string) => {
    setFormData((p) => ({ ...p, genero }))
    setShowGeneroDropdown(false)
    // ✅ Validar género
    const generoError = validateField('genero', genero)
    setFieldErrors(prev => ({ ...prev, genero: generoError || undefined }))
  }

  const handleAddressChangeFromAutocomplete = (
    address: string,
    placeDetails?: google.maps.places.PlaceResult | null
  ) => {
    setFormData((p) => ({ ...p, address: address ?? "", placeDetails: placeDetails ?? null }))
    // ✅ Validar dirección
    const addressError = validateField('address', address)
    setFieldErrors(prev => ({ ...prev, address: addressError || undefined }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validación de campos obligatorios
    if (!formData.photo) return alert("La foto es obligatoria")
    if (!formData.name || !formData.surname) return alert("Nombre y apellido son obligatorios")
    if (!formData.phone) return alert("El número de teléfono es obligatorio")
    if (!formData.fechaNacimiento) return alert("La fecha de nacimiento es obligatoria")
    if (!formData.genero) return alert("El género es obligatorio")
    if (!formData.position) return alert("La posición es obligatoria")
    if (!formData.level) return alert("El nivel es obligatorio")
    if (!formData.height) return alert("La altura es obligatoria")
    if (!formData.weight) return alert("El peso es obligatorio")
    if (!formData.address) return alert("La dirección es obligatoria")

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
        genero: formData.genero,
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
                {/* ✅ Error de validación */}
                {fieldErrors.photo && (
                  <p className="text-sm text-red-500 mt-1 flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" />
                    {fieldErrors.photo}
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
            <div>
              <Input
                placeholder="Nombre"
                value={formData.name}
                onChange={(e) => handleFieldChange('name', e.target.value)}
                className={fieldErrors.name ? 'border-red-500' : ''}
                maxLength={50}
                required
              />
              {fieldErrors.name && (
                <p className="text-sm text-red-500 mt-1 flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" />
                  {fieldErrors.name}
                </p>
              )}
            </div>
            <div>
              <Input
                placeholder="Apellido"
                value={formData.surname}
                onChange={(e) => handleFieldChange('surname', e.target.value)}
                className={fieldErrors.surname ? 'border-red-500' : ''}
                maxLength={50}
                required
              />
              {fieldErrors.surname && (
                <p className="text-sm text-red-500 mt-1 flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" />
                  {fieldErrors.surname}
                </p>
              )}
            </div>
          </div>

          <div>
            <Input
              placeholder="Celular"
              value={formData.phone}
              onChange={(e) => handleFieldChange('phone', e.target.value)}
              className={fieldErrors.phone ? 'border-red-500' : ''}
              required
            />
            {fieldErrors.phone && (
              <p className="text-sm text-red-500 mt-1 flex items-center gap-1">
                <AlertCircle className="w-4 h-4" />
                {fieldErrors.phone}
              </p>
            )}
          </div>

          <div>
            <Input
              placeholder="Fecha de nacimiento"
              value={formData.fechaNacimiento}
              onChange={(e) => handleFieldChange('fechaNacimiento', e.target.value)}
              className={fieldErrors.fechaNacimiento ? 'border-red-500' : ''}
              type="date"
              max={(() => {
                const yesterday = new Date()
                yesterday.setDate(yesterday.getDate() - 1)
                return yesterday.toISOString().split('T')[0]
              })()}
              required
            />
            {fieldErrors.fechaNacimiento && (
              <p className="text-sm text-red-500 mt-1 flex items-center gap-1">
                <AlertCircle className="w-4 h-4" />
                {fieldErrors.fechaNacimiento}
              </p>
            )}
          </div>

          <div className="relative">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowGeneroDropdown(!showGeneroDropdown)}
              className={`w-full text-left py-3 px-4 rounded-xl border bg-white justify-between ${
                fieldErrors.genero ? 'border-red-500' : 'border-gray-300'
              }`}
            >
              <span>{formData.genero || "Selecciona tu género *"}</span>
              <ChevronDown className="w-5 h-5" />
            </Button>
            {showGeneroDropdown && (
              <div className="absolute mt-1 w-full bg-white border border-gray-300 rounded-xl z-50">
                {generos.map((gen) => (
                  <div
                    key={gen}
                    onClick={() => handleGeneroSelect(gen)}
                    className="p-3 hover:bg-gray-100 cursor-pointer"
                  >
                    {gen}
                  </div>
                ))}
              </div>
            )}
            {fieldErrors.genero && (
              <p className="text-sm text-red-500 mt-1 flex items-center gap-1">
                <AlertCircle className="w-4 h-4" />
                {fieldErrors.genero}
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Input
                placeholder="Altura (cm) *"
                type="number"
                value={formData.height}
                onChange={(e) => handleFieldChange('height', e.target.value)}
                className={fieldErrors.height ? 'border-red-500' : ''}
                required
              />
              {fieldErrors.height && (
                <p className="text-sm text-red-500 mt-1 flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" />
                  {fieldErrors.height}
                </p>
              )}
            </div>
            <div>
              <Input
                placeholder="Peso (kg) *"
                type="number"
                value={formData.weight}
                onChange={(e) => handleFieldChange('weight', e.target.value)}
                className={fieldErrors.weight ? 'border-red-500' : ''}
                required
              />
              {fieldErrors.weight && (
                <p className="text-sm text-red-500 mt-1 flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" />
                  {fieldErrors.weight}
                </p>
              )}
            </div>
          </div>

          <div>
            <AddressAutocomplete
              value={formData.address}
              onChange={(address, placeDetails) => handleAddressChangeFromAutocomplete(address, placeDetails)}
              placeholder="Ubicación *"
            />
            {fieldErrors.address && (
              <p className="text-sm text-red-500 mt-1 flex items-center gap-1">
                <AlertCircle className="w-4 h-4" />
                {fieldErrors.address}
              </p>
            )}
          </div>

          <div className="relative">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowPositionDropdown(!showPositionDropdown)}
              className={`w-full text-left py-3 px-4 rounded-xl border bg-white justify-between ${
                fieldErrors.position ? 'border-red-500' : 'border-gray-300'
              }`}
            >
              <span>{formData.position || "Selecciona tu posición *"}</span>
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
            {fieldErrors.position && (
              <p className="text-sm text-red-500 mt-1 flex items-center gap-1">
                <AlertCircle className="w-4 h-4" />
                {fieldErrors.position}
              </p>
            )}
          </div>

          <div className="relative">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowLevelDropdown(!showLevelDropdown)}
              className={`w-full text-left py-3 px-4 rounded-xl border bg-white justify-between ${
                fieldErrors.level ? 'border-red-500' : 'border-gray-300'
              }`}
            >
              <span>{formData.level || "Selecciona tu nivel *"}</span>
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
            {fieldErrors.level && (
              <p className="text-sm text-red-500 mt-1 flex items-center gap-1">
                <AlertCircle className="w-4 h-4" />
                {fieldErrors.level}
              </p>
            )}
          </div>

          <Button 
            type="submit" 
            className="w-full bg-green-600 hover:bg-green-700 text-white py-4 rounded-2xl" 
            disabled={
              isUploading || 
              !!fieldErrors.name || 
              !!fieldErrors.surname || 
              !!fieldErrors.phone || 
              !!fieldErrors.fechaNacimiento || 
              !!fieldErrors.genero ||
              !!fieldErrors.position || 
              !!fieldErrors.level || 
              !!fieldErrors.height || 
              !!fieldErrors.weight || 
              !!fieldErrors.photo ||
              !!fieldErrors.address ||
              !formData.name ||
              !formData.surname ||
              !formData.phone ||
              !formData.fechaNacimiento ||
              !formData.genero ||
              !formData.position ||
              !formData.level ||
              !formData.height ||
              !formData.weight ||
              !formData.photo ||
              !formData.address
            }
          >
            {isUploading ? "Guardando..." : "Continuar"}
          </Button>
        </form>
      </div>
    </div>
  )
}

export default ProfileSetupForm