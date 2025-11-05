"use client"


import { logger } from '@/lib/logger'
import React, { useRef, useState, useEffect } from "react"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { DateSelector } from "@/components/ui/date-selector"
import { useRouter } from "next/navigation"
import { User, ChevronDown, AlertCircle, X } from "lucide-react"
import AddressAutocomplete from "@/components/google-maps/address-autocomplete"
import { AuthService } from "@/lib/auth"
import { useAuth } from "@/hooks/use-auth"
import { UsuarioAPI } from "@/lib/api"
import { usePostAuthRedirect } from "@/lib/navigation"
import PhoneInput from 'react-phone-number-input'
import ReactCrop, { type Crop } from 'react-image-crop'

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
    // nivel: "",  // Campo removido - no existe en backend
    height: "",
    weight: "",
    photo: null as File | null,
    photoPreviewUrl: "" as string,
    address: "",
    placeDetails: null as google.maps.places.PlaceResult | null,
  })

  const [showPositionDropdown, setShowPositionDropdown] = useState(false)
  // const [showLevelDropdown, setShowLevelDropdown] = useState(false)  // Removido
  const [showGeneroDropdown, setShowGeneroDropdown] = useState(false)
  const [isUploading, setIsUploading] = useState(false)

  // Image crop states
  const [showCropModal, setShowCropModal] = useState(false)
  const [imageToCrop, setImageToCrop] = useState<string>("")
  const [crop, setCrop] = useState<Crop>({
    unit: '%',
    width: 90,
    height: 90,
    x: 5,
    y: 5
  })
  const [completedCrop, setCompletedCrop] = useState<Crop | null>(null)
  const imageRef = useRef<HTMLImageElement | null>(null)

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
        if (!value) return "Selecciona una posición preferida"
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
        // ✅ Validar tamaño (máx 5MB)
        if (value instanceof File && value.size > 5 * 1024 * 1024) {
          return "La foto no puede superar 5MB"
        }
        // ✅ Validar tipo
        if (value instanceof File && !value.type.startsWith('image/')) {
          return "Solo se permiten imágenes"
        }
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
    
    // Crear URL para preview y abrir modal de crop
    const reader = new FileReader()
    reader.onload = () => {
      setImageToCrop(reader.result as string)
      setShowCropModal(true)
    }
    reader.readAsDataURL(f)
    
    // Resetear input para permitir seleccionar la misma imagen
    e.target.value = ''
  }

  const handleCropComplete = async () => {
    if (!imageRef.current || !completedCrop) return

    const canvas = document.createElement('canvas')
    const scaleX = imageRef.current.naturalWidth / imageRef.current.width
    const scaleY = imageRef.current.naturalHeight / imageRef.current.height
    const ctx = canvas.getContext('2d')

    if (!ctx) return

    canvas.width = completedCrop.width * scaleX
    canvas.height = completedCrop.height * scaleY

    ctx.drawImage(
      imageRef.current,
      completedCrop.x * scaleX,
      completedCrop.y * scaleY,
      completedCrop.width * scaleX,
      completedCrop.height * scaleY,
      0,
      0,
      canvas.width,
      canvas.height
    )

    // Convertir canvas a blob
    canvas.toBlob((blob) => {
      if (!blob) return
      
      // Crear archivo desde blob
      const file = new File([blob], 'profile-photo.jpg', { type: 'image/jpeg' })
      
      // Limpiar URL anterior
      if (formData.photoPreviewUrl) URL.revokeObjectURL(formData.photoPreviewUrl)
      
      // Actualizar formData
      setFormData((p) => ({ ...p, photo: file, photoPreviewUrl: URL.createObjectURL(file) }))
      
      // Validar foto
      const photoError = validateField('photo', file)
      setFieldErrors(prev => ({ ...prev, photo: photoError || undefined }))
      
      // Cerrar modal
      setShowCropModal(false)
      setImageToCrop('')
    }, 'image/jpeg', 0.95)
  }

  const handlePositionSelect = (position: string) => {
    setFormData((p) => ({ ...p, position }))
    setShowPositionDropdown(false)
    // ✅ Validar posición
    const positionError = validateField('position', position)
    setFieldErrors(prev => ({ ...prev, position: positionError || undefined }))
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
    if (!formData.position) return alert("La posición preferida es obligatoria")
    // Nivel removido - no existe en backend
    if (!formData.height) return alert("La altura es obligatoria")
    if (!formData.weight) return alert("El peso es obligatorio")
    if (!formData.address) return alert("La dirección es obligatoria")

    await handleUploadAndSaveProfile()
  }

  async function handleUploadAndSaveProfile() {
    if (!formData.photo) return alert("Foto requerida")

    setIsUploading(true)
    try {
      // ✅ Detectar si es nuevo registro (viene desde verify-email) o actualización de perfil
      const verifiedEmail = typeof window !== 'undefined' ? localStorage.getItem('verifiedEmail') : null
      const passwordHash = typeof window !== 'undefined' ? localStorage.getItem('passwordHash') : null
      const isNewRegistration = !!(verifiedEmail && passwordHash)

      logger.log("[ProfileSetup] Modo:", isNewRegistration ? "NUEVO REGISTRO" : "ACTUALIZACIÓN DE PERFIL")

      if (isNewRegistration) {
        // ====================================
        // FLUJO 1: NUEVO REGISTRO
        // ====================================
        logger.log("[ProfileSetup] Completando registro para:", verifiedEmail)
        
        // Convertir foto a base64
        const photoBase64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader()
          reader.onloadend = () => resolve((reader.result as string).split(',')[1]) // Quitar prefijo data:image/...
          reader.onerror = reject
          reader.readAsDataURL(formData.photo!)
        })

        const payload = {
          email: verifiedEmail,
          verificationCode: 'already-verified', // Ya verificado
          password: passwordHash, // Password hash del pre-registro
          nombre: formData.name,
          apellido: formData.surname,
          celular: formData.phone,
          fechaNacimiento: formData.fechaNacimiento,
          genero: formData.genero,
          posicion: formData.position,
          altura: parseFloat(formData.height),
          peso: parseFloat(formData.weight),
          fotoPerfil: photoBase64,
          emailVerified: true,
        }

        logger.log("[ProfileSetup] Enviando a /auth/complete-register...")
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/complete-register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ message: 'Error del servidor' }))
          throw new Error(errorData.message || `Error ${response.status}`)
        }

        const data = await response.json()
        if (!data.success || !data.data) {
          throw new Error(data.message || 'Error al completar el registro')
        }

        // Limpiar localStorage
        localStorage.removeItem('verifiedEmail')
        localStorage.removeItem('passwordHash')

        // Extraer token y usuario de la respuesta
        const { token, usuario } = data.data
        
        if (token) {
          AuthService.setToken(token)
        }

        // Guardar usuario con perfilCompleto=true
        const userWithProfile = { ...usuario, perfilCompleto: true }
        AuthService.setUser(userWithProfile)
        setUser(userWithProfile)

        logger.log("[ProfileSetup] ✅ Registro completado exitosamente")
        
        // Redirigir a verificación de cédula o home
        router.push(usuario.cedulaVerificada ? '/home' : '/verification')

      } else {
        // ====================================
        // FLUJO 2: ACTUALIZACIÓN DE PERFIL
        // ====================================
        const token = AuthService.getToken()
        logger.log("[ProfileSetup] Token disponible:", token ? "SÍ" : "NO")
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
        logger.log("[ProfileSetup] Subiendo foto...")
        const fotoRes = await UsuarioAPI.subirFoto(formData.photo)
        logger.log("[ProfileSetup] Respuesta subir foto:", fotoRes)
        if (!fotoRes?.success) {
          const errorMsg = fotoRes?.message || "No se pudo subir la foto"
          logger.error("[ProfileSetup] Error subiendo foto:", errorMsg)
          throw new Error(errorMsg)
        }

        // 2) Actualizar perfil
        logger.log("[ProfileSetup] Actualizando perfil...")
        const payload: any = {
          nombre: formData.name,
          apellido: formData.surname,
          celular: formData.phone,
          fecha_nacimiento: formData.fechaNacimiento,
          genero: formData.genero,
          posicion: formData.position,
          altura: String(formData.height),  // Backend espera string
          peso: String(formData.weight),    // Backend espera string
          direccion: formData.address,
          placeDetails: formData.placeDetails ? JSON.stringify(formData.placeDetails) : null,
        }
        logger.log("[ProfileSetup] Payload a enviar:", payload)
        const perfilRes = await UsuarioAPI.actualizarPerfil(payload)
        logger.log("[ProfileSetup] Respuesta actualizar perfil:", perfilRes)
        if (!perfilRes?.success) {
          const errorMsg = perfilRes?.message || "No se pudo actualizar el perfil"
          logger.error("[ProfileSetup] Error actualizando perfil:", errorMsg)
          throw new Error(errorMsg)
        }

        // 3) Actualizar user local inmediatamente (clave para salir del loop)
        const serverUser: any = perfilRes.data || {}
        const currentUser: any = AuthService.getUser() || {}
        
        // ⚡ CRÍTICO: Preservar TODOS los campos importantes
        const merged: any = {
          ...currentUser,           // Empezar con usuario actual
          ...serverUser,            // Sobrescribir con datos del servidor
          perfilCompleto: true,     // <<<< FORZAR perfilCompleto=true después de completar setup
          cedulaVerificada: serverUser.cedulaVerificada ?? currentUser.cedulaVerificada ?? false,
          // Asegurar que campos críticos no se pierdan
          email: serverUser.email ?? currentUser.email,
          id: serverUser.id ?? currentUser.id,
        }
        
        logger.log("[ProfileSetup] ✅ Perfil completado, guardando usuario:", {
          email: merged.email,
          perfilCompleto: merged.perfilCompleto,
          cedulaVerificada: merged.cedulaVerificada,
        })
        
        AuthService.setUser(merged)
        setUser(merged)

        // 4) Redirigir según regla global (profile-setup / verification / home)
        postAuthRedirect(merged) // si cedulaVerificada=false → /verification, si true → /home

        // (opcional) refrescar en background
        setTimeout(() => AuthService.fetchCurrentUser(), 1500)
      }
    } catch (err: any) {
      logger.error("[ProfileSetup] Error al guardar perfil:", err)
      alert(`Error al guardar perfil: ${err?.message ?? "Intenta nuevamente"}`)
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <div className="pt-16 pb-8 border-b border-gray-100">
        <div className="px-6 mb-2">
          <h1 className="text-2xl font-bold text-gray-900 text-center">Crea tu perfil</h1>
        </div>
        <p className="text-sm text-gray-500 text-center mt-2">Completa tu información para continuar</p>
      </div>

      <div className="flex-1 px-6 py-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="bg-gray-50 rounded-2xl p-6 flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Avatar className="w-16 h-16 bg-orange-100 relative overflow-hidden">
                {formData.photoPreviewUrl ? (
                  <Image 
                    src={formData.photoPreviewUrl} 
                    alt="Vista previa de foto de perfil" 
                    width={64}
                    height={64}
                    className="object-cover rounded-md"
                    unoptimized // Local blob URL
                  />
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

              <input 
                ref={fileInputRef} 
                id="profile-photo"
                name="photo"
                type="file" 
                accept="image/*" 
                onChange={handlePhotoChange} 
                className="hidden"
                aria-label="Subir foto de perfil"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="profile-name" className="sr-only">Nombre</label>
              <Input
                id="profile-name"
                name="given-name"
                placeholder="Nombre"
                value={formData.name}
                onChange={(e) => handleFieldChange('name', e.target.value)}
                className={fieldErrors.name ? 'border-red-500' : ''}
                maxLength={50}
                autoComplete="given-name"
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
              <label htmlFor="profile-surname" className="sr-only">Apellido</label>
              <Input
                id="profile-surname"
                name="family-name"
                placeholder="Apellido"
                value={formData.surname}
                onChange={(e) => handleFieldChange('surname', e.target.value)}
                className={fieldErrors.surname ? 'border-red-500' : ''}
                maxLength={50}
                autoComplete="family-name"
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
            <label htmlFor="profile-phone" className="text-sm font-medium text-gray-700 mb-1 block">
              Celular
            </label>
            <PhoneInput
              international
              defaultCountry="UY"
              value={formData.phone}
              onChange={(value) => handleFieldChange('phone', value || '')}
              className={fieldErrors.phone ? 'phone-input-error' : ''}
              placeholder="Ingresa tu número de celular"
            />
            {fieldErrors.phone && (
              <p className="text-sm text-red-500 mt-1 flex items-center gap-1">
                <AlertCircle className="w-4 h-4" />
                {fieldErrors.phone}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="profile-birthdate" className="text-sm font-medium text-gray-700 mb-1 block">
              Fecha de nacimiento
            </label>
            <DateSelector
              value={formData.fechaNacimiento}
              onChange={(date) => handleFieldChange('fechaNacimiento', date)}
              error={fieldErrors.fechaNacimiento}
              minAge={13}
              required
            />
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
              <label htmlFor="profile-height" className="sr-only">Altura (cm)</label>
              <Input
                id="profile-height"
                name="height"
                placeholder="Altura (cm) *"
                type="number"
                value={formData.height}
                onChange={(e) => handleFieldChange('height', e.target.value)}
                className={fieldErrors.height ? 'border-red-500' : ''}
                min="1"
                max="300"
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
              <label htmlFor="profile-weight" className="sr-only">Peso (kg)</label>
              <Input
                id="profile-weight"
                name="weight"
                placeholder="Peso (kg) *"
                type="number"
                value={formData.weight}
                onChange={(e) => handleFieldChange('weight', e.target.value)}
                className={fieldErrors.weight ? 'border-red-500' : ''}
                min="1"
                max="300"
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
              hasError={!!fieldErrors.address}
            />
            {fieldErrors.address && (
              <p className="text-sm text-red-500 mt-2 flex items-center gap-1">
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
              <span>{formData.position || "Selecciona tu posición preferida *"}</span>
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

      {/* Modal de crop de imagen */}
      {showCropModal && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-900">Recortar imagen</h3>
              <button
                onClick={() => {
                  setShowCropModal(false)
                  setImageToCrop('')
                }}
                className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
              >
                <X className="w-5 h-5 text-gray-600" />
              </button>
            </div>

            <div className="flex-1 overflow-auto p-4 flex items-center justify-center bg-gray-50">
              <ReactCrop
                crop={crop}
                onChange={(c) => setCrop(c)}
                onComplete={(c) => setCompletedCrop(c)}
                aspect={1}
                circularCrop
              >
                <img
                  ref={imageRef}
                  src={imageToCrop}
                  alt="Imagen a recortar"
                  className="max-w-full max-h-[60vh] object-contain"
                />
              </ReactCrop>
            </div>

            <div className="p-4 border-t border-gray-200 flex space-x-3">
              <Button
                onClick={() => {
                  setShowCropModal(false)
                  setImageToCrop('')
                }}
                variant="outline"
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleCropComplete}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                disabled={!completedCrop}
              >
                Aplicar recorte
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default ProfileSetupForm