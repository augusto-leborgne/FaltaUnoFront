"use client"

import { logger } from '@/lib/logger'
import React, { useRef, useState, useEffect } from "react"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { DateSelector } from "@/components/ui/date-selector"
import { useRouter } from "next/navigation"
import { User, ChevronDown, AlertCircle, X, Camera, Upload } from "lucide-react"
import AddressAutocomplete from "@/components/google-maps/address-autocomplete"
import { AuthService } from "@/lib/auth"
import { useAuth } from "@/hooks/use-auth"
import { UsuarioAPI } from "@/lib/api"
import { usePostAuthRedirect } from "@/lib/navigation"
import ReactCrop, { type Crop } from 'react-image-crop'
import 'react-image-crop/dist/ReactCrop.css'

export function ProfileSetupForm() {
  const router = useRouter()
  const { user, setUser, refreshUser } = useAuth()
  const postAuthRedirect = usePostAuthRedirect()
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const cameraInputRef = useRef<HTMLInputElement | null>(null) // ⚡ NUEVO: Input para cámara
  const formRef = useRef<HTMLFormElement | null>(null) // ⚡ Ref para el form

  const [formData, setFormData] = useState({
    name: "",
    surname: "",
    phone: "",
    countryCode: "+598", // Default Uruguay
    fechaNacimiento: "",
    genero: "",
    position: "",
    height: "",
    weight: "",
    photo: null as File | null,
    photoPreviewUrl: "" as string,
    address: "",
    placeDetails: null as google.maps.places.PlaceResult | null,
  })

  const [showPositionDropdown, setShowPositionDropdown] = useState(false)
  const [showGeneroDropdown, setShowGeneroDropdown] = useState(false)
  const [showCountryCodeDropdown, setShowCountryCodeDropdown] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [generalError, setGeneralError] = useState<string>("")

  // Image crop states
  const [showCropModal, setShowCropModal] = useState(false)
  const [imageToCrop, setImageToCrop] = useState<string>("")
  const [crop, setCrop] = useState<Crop>({
    unit: '%',
    width: 80,
    height: 80,
    x: 10,
    y: 10
  })
  const [completedCrop, setCompletedCrop] = useState<Crop | null>(null)
  const imageRef = useRef<HTMLImageElement | null>(null)

  const [fieldErrors, setFieldErrors] = useState<Record<string, string | undefined>>({})

  // Códigos de país más comunes en Latinoamérica
  const countryCodes = [
    { code: "+598", country: "🇺🇾 Uruguay", flag: "🇺🇾" },
    { code: "+54", country: "🇦🇷 Argentina", flag: "🇦🇷" },
    { code: "+55", country: "🇧🇷 Brasil", flag: "🇧🇷" },
    { code: "+56", country: "🇨🇱 Chile", flag: "🇨🇱" },
    { code: "+57", country: "🇨🇴 Colombia", flag: "🇨🇴" },
    { code: "+51", country: "🇵🇪 Perú", flag: "🇵🇪" },
    { code: "+52", country: "🇲🇽 México", flag: "🇲🇽" },
    { code: "+34", country: "🇪🇸 España", flag: "🇪🇸" },
    { code: "+1", country: "🇺🇸 USA/Canadá", flag: "🇺🇸" },
  ]

  const validateField = (field: string, value: any): string | null => {
    switch (field) {
      case 'name':
        if (!value || value.trim().length < 2) return "Mínimo 2 caracteres"
        if (value.trim().length > 50) return "Máximo 50 caracteres"
        return null
      
      case 'surname':
        if (!value || value.trim().length < 2) return "Mínimo 2 caracteres"
        if (value.trim().length > 50) return "Máximo 50 caracteres"
        return null
      
      case 'phone':
        // Phone no es requerido - se pedirá en paso posterior
        return null
      
      case 'fechaNacimiento':
        if (!value) return "Requerido"
        const birthDate = new Date(value)
        const today = new Date()
        const age = today.getFullYear() - birthDate.getFullYear()
        if (age < 13) return "Mínimo 13 años"
        if (age > 100) return "Fecha inválida"
        return null
      
      case 'genero':
        if (!value) return "Requerido"
        return null
      
      case 'position':
        if (!value) return "Requerido"
        return null
      
      case 'height':
        if (!value) return "Requerido"
        const h = Number(value)
        if (isNaN(h) || h < 100 || h > 250) return "100-250 cm"
        return null
      
      case 'weight':
        if (!value) return "Requerido"
        const w = Number(value)
        if (isNaN(w) || w < 30 || w > 200) return "30-200 kg"
        return null
      
      case 'photo':
        if (!value) return "Foto obligatoria"
        // ⚡ LÍMITES COMO INSTAGRAM: 30MB (antes era 5MB)
        if (value instanceof File && value.size > 30 * 1024 * 1024) {
          return "Máx 30MB"
        }
        if (value instanceof File && !value.type.startsWith('image/')) {
          return "Solo imágenes"
        }
        return null
      
      case 'address':
        if (!value || value.trim().length < 5) return "Mínimo 5 caracteres"
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

  const positions = ["Arquero", "Defensa", "Mediocampista", "Delantero"]
  const generos = ["Masculino", "Femenino", "Otro"]

  useEffect(() => {
    // Prefill form data from existing authenticated user to avoid losing inputs
    // This helps when the app redirects back to profile-setup (e.g., after phone verify)
    try {
      if (user) {
        setFormData((prev) => {
          // Only prefill when fields are still empty to avoid overwriting user edits
          const shouldPrefill = !prev.name && !prev.surname && !prev.photoPreviewUrl && !prev.address;
          if (!shouldPrefill) return prev;

          // Extract phone without country code if possible
          let phoneOnly = prev.phone;
          let countryCode = prev.countryCode;
          if ((user as any).celular) {
            const cleaned = (user as any).celular.trim();
            const match = cleaned.match(/^(\+\d{1,4})\s*(.*)$/);
            if (match) {
              countryCode = match[1];
              phoneOnly = match[2];
            } else {
              phoneOnly = cleaned;
            }
          }

          return {
            ...prev,
            name: (user as any).nombre ?? (user as any).name ?? prev.name,
            surname: (user as any).apellido ?? (user as any).apellido ?? prev.surname,
            phone: phoneOnly ?? prev.phone,
            countryCode: countryCode ?? prev.countryCode,
            fechaNacimiento: (user as any).fechaNacimiento ?? (user as any).fecha_nacimiento ?? prev.fechaNacimiento,
            genero: (user as any).genero ?? prev.genero,
            position: (user as any).posicion ?? (user as any).position ?? prev.position,
            height: (user as any).altura ? String((user as any).altura) : prev.height,
            weight: (user as any).peso ? String((user as any).peso) : prev.weight,
            address: (user as any).direccion ?? (user as any).ubicacion ?? prev.address,
          }
        })
      }
    } catch (e) {
      logger.error('[ProfileSetup] Error prefill desde user:', e)
    }
  }, [user])

  useEffect(() => {
    return () => {
      if (formData.photoPreviewUrl) URL.revokeObjectURL(formData.photoPreviewUrl)
    }
  }, [formData.photoPreviewUrl])

  const openFilePicker = () => fileInputRef.current?.click()
  const openCamera = () => cameraInputRef.current?.click() // ⚡ NUEVO: Abrir cámara

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null
    if (!f) return
    
    // ⚡ LÍMITES COMO INSTAGRAM: 30MB, 8K resolution (8192x8192)
    const MAX_SIZE = 30 * 1024 * 1024 // 30MB
    const MAX_DIMENSION = 8192
    
    if (f.size > MAX_SIZE) {
      setGeneralError("La imagen no puede superar 30MB")
      return
    }
    
    const reader = new FileReader()
    reader.onload = () => {
      const img = document.createElement('img')
      img.onload = () => {
        if (img.width > MAX_DIMENSION || img.height > MAX_DIMENSION) {
          setGeneralError(`La imagen no puede superar ${MAX_DIMENSION}x${MAX_DIMENSION} píxeles`)
          return
        }
        setImageToCrop(reader.result as string)
        setShowCropModal(true)
      }
      img.src = reader.result as string
    }
    reader.readAsDataURL(f)
    
    e.target.value = ''
  }

  const handleCropComplete = async () => {
    if (!imageRef.current || !completedCrop) return

    const canvas = document.createElement('canvas')
    const scaleX = imageRef.current.naturalWidth / imageRef.current.width
    const scaleY = imageRef.current.naturalHeight / imageRef.current.height
    const ctx = canvas.getContext('2d')

    if (!ctx) return

    // Tamaño final: 400x400px (suficiente calidad, peso razonable)
    const targetSize = 400
    canvas.width = targetSize
    canvas.height = targetSize

    ctx.drawImage(
      imageRef.current,
      completedCrop.x * scaleX,
      completedCrop.y * scaleY,
      completedCrop.width * scaleX,
      completedCrop.height * scaleY,
      0,
      0,
      targetSize,
      targetSize
    )

    canvas.toBlob((blob) => {
      if (!blob) return
      
      const file = new File([blob], 'profile-photo.jpg', { type: 'image/jpeg' })
      
      if (formData.photoPreviewUrl) URL.revokeObjectURL(formData.photoPreviewUrl)
      
      setFormData((p) => ({ ...p, photo: file, photoPreviewUrl: URL.createObjectURL(file) }))
      
      const photoError = validateField('photo', file)
      setFieldErrors(prev => ({ ...prev, photo: photoError || undefined }))
      
      setShowCropModal(false)
      setImageToCrop('')
    }, 'image/jpeg', 0.92) // Calidad 92% - buen balance
  }

  const handleSubmit = async (e: React.FormEvent) => {
    // ⚡ CRÍTICO: preventDefault ANTES de cualquier otra cosa
    console.log("🔥🔥🔥 HANDLESUBMIT LLAMADO - ANTES DE PREVENTDEFAULT 🔥🔥🔥")
    e.preventDefault()
    e.stopPropagation()
    console.log("✅ preventDefault ejecutado exitosamente")
    
    try {
      setGeneralError("")
      logger.log("[ProfileSetup] 🚀 Form submitted, iniciando validación...")

      // Validación completa - SOLO campos que tienen validación
      const errors: Record<string, string> = {}
      const fieldsToValidate = ['name', 'surname', 'fechaNacimiento', 'genero', 'position', 'height', 'weight', 'photo', 'address']
      
      fieldsToValidate.forEach(key => {
        const error = validateField(key, formData[key as keyof typeof formData])
        if (error) errors[key] = error
      })

      if (Object.keys(errors).length > 0) {
        setFieldErrors(errors)
        setGeneralError("Por favor completa todos los campos correctamente")
        logger.warn("[ProfileSetup] ❌ Errores de validación:", errors)
        return
      }

      logger.log("[ProfileSetup] ✅ Validación exitosa, procediendo a guardar...")
      await handleUploadAndSaveProfile()
    } catch (err: any) {
      logger.error("[ProfileSetup] ❌ Error crítico en handleSubmit:", err)
      setGeneralError(`Error inesperado: ${err?.message ?? "Por favor intenta nuevamente"}`)
    }
  }

  async function handleUploadAndSaveProfile() {
    if (!formData.photo) {
      setGeneralError("Foto requerida")
      return
    }

    setIsUploading(true)
    setGeneralError("")
    try {
      // ⚡ CORREGIDO: Leer de sessionStorage (verify-email ahora guarda ahí)
      let verifiedEmail: string | null = null
      let passwordHash: string | null = null
      
      if (typeof window !== 'undefined') {
        const pendingData = sessionStorage.getItem('pendingVerification')
        if (pendingData) {
          try {
            const parsed = JSON.parse(pendingData)
            verifiedEmail = parsed.email
            passwordHash = parsed.passwordHash
            logger.log("[ProfileSetup] ✅ Datos leídos de sessionStorage:", { email: verifiedEmail })
          } catch (e) {
            logger.error("[ProfileSetup] Error parseando pendingVerification:", e)
          }
        }
      }
      
      const isNewRegistration = !!(verifiedEmail && passwordHash)

      // Construir teléfono completo con código de país
      const fullPhone = `${formData.countryCode}${formData.phone}`

      logger.log("[ProfileSetup] Modo:", isNewRegistration ? "NUEVO REGISTRO" : "ACTUALIZACIÓN DE PERFIL")

      if (isNewRegistration) {
        logger.log("[ProfileSetup] Completando registro para:", verifiedEmail)
        
        const photoBase64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader()
          reader.onloadend = () => resolve((reader.result as string).split(',')[1])
          reader.onerror = reject
          reader.readAsDataURL(formData.photo!)
        })

        const payload = {
          email: verifiedEmail,
          verificationCode: 'already-verified',
          password: passwordHash,
          nombre: formData.name,
          apellido: formData.surname,
          // celular no se envía aquí - se pedirá en paso posterior
          fechaNacimiento: formData.fechaNacimiento,
          genero: formData.genero,
          posicion: formData.position,
          altura: parseFloat(formData.height),
          peso: parseFloat(formData.weight),
          fotoPerfil: photoBase64,
          emailVerified: true,
          direccion: formData.address,
          placeDetails: formData.placeDetails ? JSON.stringify(formData.placeDetails) : null,
        }

        logger.log("[ProfileSetup] Enviando a /api/auth/complete-register...")
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/complete-register`, {
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

        // ⚡ CORREGIDO: Limpiar sessionStorage (no localStorage)
        sessionStorage.removeItem('pendingVerification')

        const { token, usuario } = data.data
        
        if (token) {
          logger.log("[ProfileSetup] ✅ Token recibido, guardando...")
          AuthService.setToken(token)
        } else {
          logger.warn("[ProfileSetup] ⚠️ No se recibió token del servidor")
        }

        // ⚡ NUEVO: Usar el usuario devuelto por el backend directamente
        logger.log("[ProfileSetup] ✅ Usuario recibido del backend:", {
          id: usuario.id,
          email: usuario.email,
          nombre: usuario.nombre,
          apellido: usuario.apellido,
          perfilCompleto: usuario.perfilCompleto
        })
        
        // Guardar usuario con los datos del backend
        AuthService.setUser(usuario)
        setUser(usuario)

        logger.log("[ProfileSetup] ✅ Registro completado exitosamente, redirigiendo a phone-verification")
        
        // Pequeño delay para asegurar que localStorage se actualice
        await new Promise(resolve => setTimeout(resolve, 300))
        
        // Redirigir a verificación de celular (replace para no permitir volver atrás)
        router.replace('/phone-verification')

      } else {
        const token = AuthService.getToken()
        logger.log("[ProfileSetup] Token disponible:", token ? "SÍ" : "NO")
        if (!token) {
          setGeneralError("No estás autenticado. Por favor, inicia sesión nuevamente.")
          setTimeout(() => router.replace("/login"), 2000)
          return
        }
        if (AuthService.isTokenExpired(token)) {
          setGeneralError("Tu sesión ha expirado. Por favor, inicia sesión nuevamente.")
          AuthService.logout()
          setTimeout(() => router.replace("/login"), 2000)
          return
        }

        logger.log("[ProfileSetup] Subiendo foto...")
        const fotoRes = await UsuarioAPI.subirFoto(formData.photo)
        logger.log("[ProfileSetup] Respuesta subir foto:", fotoRes)
        if (!fotoRes?.success) {
          const errorMsg = fotoRes?.message || "No se pudo subir la foto"
          logger.error("[ProfileSetup] Error subiendo foto:", errorMsg)
          throw new Error(errorMsg)
        }

        logger.log("[ProfileSetup] Actualizando perfil...")
        const payload: any = {
          nombre: formData.name,
          apellido: formData.surname,
          // celular no se envía aquí - se pedirá en paso posterior  
          fecha_nacimiento: formData.fechaNacimiento, // ⚡ Backend espera snake_case
          genero: formData.genero,
          posicion: formData.position,
          altura: String(formData.height),
          peso: String(formData.weight),
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

        // ⚡ NUEVO: Refrescar usuario INMEDIATAMENTE desde el servidor después de actualizar
        logger.log("[ProfileSetup] ✅ Perfil actualizado en backend, refrescando desde servidor...")
        const refreshed = await refreshUser()
        
        if (refreshed) {
          logger.log("[ProfileSetup] ✅ Usuario refrescado desde servidor:", {
            email: refreshed.email,
            nombre: refreshed.nombre,
            apellido: refreshed.apellido,
            perfilCompleto: refreshed.perfilCompleto,
          })
          
          // Actualizar contexto con datos del servidor
          setUser(refreshed)
          
          // Pequeño delay para asegurar que localStorage se actualice
          await new Promise(resolve => setTimeout(resolve, 300))

          // Redirigir a verificación de celular (replace para no permitir volver atrás)
          router.replace('/phone-verification')
        } else {
          logger.error("[ProfileSetup] ❌ Error: no se pudo refrescar usuario desde servidor")
          throw new Error("No se pudo verificar la actualización. Por favor, intenta nuevamente.")
        }
      }
    } catch (err: any) {
      logger.error("[ProfileSetup] Error al guardar perfil:", err)
      setGeneralError(`Error al guardar perfil: ${err?.message ?? "Intenta nuevamente"}`)
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-orange-50">
      {/* Header moderno */}
      <div className="bg-white border-b border-gray-100 shadow-sm sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-6 py-6">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-900">
              Completa tu perfil
            </h1>
            <p className="text-sm text-gray-600 mt-2">Un paso más para empezar a jugar</p>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-6 py-8 pb-20">
        <form 
          ref={formRef}
          onSubmit={handleSubmit} 
          className="space-y-6" 
        >
          {/* Foto de perfil - Diseño destacado */}
          <div className="bg-white rounded-3xl shadow-lg p-8 border border-gray-100">
            <div className="flex flex-col items-center text-center">
              <div className="relative group mb-4">
                <Avatar className="w-32 h-32 border-4 border-primary/20 shadow-xl relative overflow-hidden transition-transform group-hover:scale-105">
                  {formData.photoPreviewUrl ? (
                    <Image 
                      src={formData.photoPreviewUrl} 
                      alt="Foto de perfil" 
                      width={128}
                      height={128}
                      className="object-cover"
                      unoptimized
                    />
                  ) : (
                    <AvatarFallback className="bg-gradient-to-br from-primary/10 to-orange-100">
                      <User className="w-16 h-16 text-gray-400" />
                    </AvatarFallback>
                  )}
                </Avatar>
                <button
                  type="button"
                  onClick={openFilePicker}
                  className="absolute bottom-0 right-0 bg-primary text-white rounded-full p-3 shadow-lg hover:bg-primary/90 transition-all hover:scale-110"
                >
                  <Camera className="w-5 h-5" />
                </button>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-1">Foto de perfil</h3>
              <p className="text-sm text-gray-500 mb-3">
                {formData.photo ? "¡Foto cargada! Puedes cambiarla" : "Agrega una foto para que te reconozcan"}
              </p>
              {/* ⚡ NUEVO: Dos botones - Cámara + Galería (como Instagram) */}
              <div className="flex gap-3 w-full max-w-sm">
                <Button
                  type="button"
                  onClick={openCamera}
                  className="flex-1 bg-primary hover:bg-primary/90 text-white shadow-md"
                >
                  <Camera className="w-4 h-4 mr-2" />
                  Cámara
                </Button>
                <Button
                  type="button"
                  onClick={openFilePicker}
                  variant="outline"
                  className="flex-1 hover:bg-gray-50"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Galería
                </Button>
              </div>
              {fieldErrors.photo && (
                <p className="text-sm text-red-500 mt-2 flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" />
                  {fieldErrors.photo}
                </p>
              )}
              {/* Input para galería */}
              <input 
                ref={fileInputRef} 
                type="file" 
                accept="image/*" 
                onChange={handlePhotoChange} 
                className="hidden"
              />
              {/* ⚡ Input para cámara - capture sin valor para forzar cámara del dispositivo */}
              <input 
                ref={cameraInputRef} 
                type="file" 
                accept="image/*" 
                capture
                onChange={handlePhotoChange} 
                className="hidden"
              />
            </div>
          </div>

          {/* Información personal */}
          <div className="bg-white rounded-3xl shadow-lg p-6 border border-gray-100">
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center mr-3">
                <span className="text-primary font-bold">1</span>
              </div>
              Información personal
            </h2>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1.5 block">Nombre *</label>
                  <Input
                    placeholder="Juan"
                    value={formData.name}
                    onChange={(e) => handleFieldChange('name', e.target.value)}
                    className={`${fieldErrors.name ? 'border-red-500 focus:ring-red-500' : 'focus:ring-primary'}`}
                    maxLength={50}
                  />
                  {fieldErrors.name && (
                    <p className="text-xs text-red-500 mt-1">{fieldErrors.name}</p>
                  )}
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1.5 block">Apellido *</label>
                  <Input
                    placeholder="Pérez"
                    value={formData.surname}
                    onChange={(e) => handleFieldChange('surname', e.target.value)}
                    className={`${fieldErrors.surname ? 'border-red-500 focus:ring-red-500' : 'focus:ring-primary'}`}
                    maxLength={50}
                  />
                  {fieldErrors.surname && (
                    <p className="text-xs text-red-500 mt-1">{fieldErrors.surname}</p>
                  )}
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">Fecha de nacimiento *</label>
                <DateSelector
                  value={formData.fechaNacimiento}
                  onChange={(date) => handleFieldChange('fechaNacimiento', date)}
                  error={fieldErrors.fechaNacimiento}
                  minAge={13}
                  required
                />
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">Género *</label>
                <div className="relative">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowGeneroDropdown(!showGeneroDropdown)}
                    className={`w-full justify-between ${fieldErrors.genero ? 'border-red-500' : ''}`}
                  >
                    <span className={formData.genero ? 'text-gray-900' : 'text-gray-500'}>
                      {formData.genero || "Selecciona tu género"}
                    </span>
                    <ChevronDown className="w-5 h-5" />
                  </Button>
                  {showGeneroDropdown && (
                    <div className="absolute mt-1 w-full bg-white border border-gray-300 rounded-xl shadow-xl z-50">
                      {generos.map((gen) => (
                        <div
                          key={gen}
                          onClick={() => {
                            handleFieldChange('genero', gen)
                            setShowGeneroDropdown(false)
                          }}
                          className="p-3 hover:bg-primary/10 cursor-pointer first:rounded-t-xl last:rounded-b-xl"
                        >
                          {gen}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                {fieldErrors.genero && (
                  <p className="text-xs text-red-500 mt-1">{fieldErrors.genero}</p>
                )}
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">Ubicación *</label>
                <AddressAutocomplete
                  value={formData.address}
                  onChange={(address, placeDetails) => {
                    setFormData(prev => ({ ...prev, address: address ?? "", placeDetails: placeDetails ?? null }))
                    const addressError = validateField('address', address)
                    setFieldErrors(prev => ({ ...prev, address: addressError || undefined }))
                  }}
                  placeholder="Ingresa tu dirección"
                  hasError={!!fieldErrors.address}
                />
                {fieldErrors.address && (
                  <p className="text-xs text-red-500 mt-1">{fieldErrors.address}</p>
                )}
              </div>
            </div>
          </div>

          {/* Información deportiva */}
          <div className="bg-white rounded-3xl shadow-lg p-6 border border-gray-100">
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
              <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center mr-3">
                <span className="text-orange-600 font-bold">2</span>
              </div>
              Información deportiva
            </h2>
            
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">Posición preferida *</label>
                <div className="relative">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowPositionDropdown(!showPositionDropdown)}
                    className={`w-full justify-between ${fieldErrors.position ? 'border-red-500' : ''}`}
                  >
                    <span className={formData.position ? 'text-gray-900' : 'text-gray-500'}>
                      {formData.position || "Selecciona tu posición"}
                    </span>
                    <ChevronDown className="w-5 h-5" />
                  </Button>
                  {showPositionDropdown && (
                    <div className="absolute mt-1 w-full bg-white border border-gray-300 rounded-xl shadow-xl z-50 max-h-60 overflow-y-auto">
                      {positions.map((pos) => (
                        <div
                          key={pos}
                          onClick={() => {
                            handleFieldChange('position', pos)
                            setShowPositionDropdown(false)
                          }}
                          className="p-3 hover:bg-orange-50 cursor-pointer first:rounded-t-xl last:rounded-b-xl"
                        >
                          {pos}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                {fieldErrors.position && (
                  <p className="text-xs text-red-500 mt-1">{fieldErrors.position}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1.5 block">Altura (cm) *</label>
                  <Input
                    type="number"
                    placeholder="175"
                    value={formData.height}
                    onChange={(e) => handleFieldChange('height', e.target.value)}
                    className={`${fieldErrors.height ? 'border-red-500' : 'focus:ring-orange-500'}`}
                    min="100"
                    max="250"
                  />
                  {fieldErrors.height && (
                    <p className="text-xs text-red-500 mt-1">{fieldErrors.height}</p>
                  )}
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1.5 block">Peso (kg) *</label>
                  <Input
                    type="number"
                    placeholder="70"
                    value={formData.weight}
                    onChange={(e) => handleFieldChange('weight', e.target.value)}
                    className={`${fieldErrors.weight ? 'border-red-500' : 'focus:ring-orange-500'}`}
                    min="30"
                    max="200"
                  />
                  {fieldErrors.weight && (
                    <p className="text-xs text-red-500 mt-1">{fieldErrors.weight}</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Mensaje de error general */}
          {generalError && (
            <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-red-900">{generalError}</p>
              </div>
              <button
                type="button"
                onClick={() => setGeneralError("")}
                className="text-red-400 hover:text-red-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Botón de submit - USANDO BUTTON NATIVO PARA DESCARTAR PROBLEMAS CON EL COMPONENTE */}
          <button
            type="submit"
            disabled={isUploading}
            onClick={(e) => {
              console.log("🔴 CLICK EN BOTÓN SUBMIT DETECTADO")
            }}
            className="w-full bg-primary hover:bg-primary/90 text-white py-6 rounded-2xl text-lg font-semibold shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isUploading ? (
              <span className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
                Guardando...
              </span>
            ) : (
              "Completar perfil"
            )}
          </button>
        </form>
      </div>

      {/* Modal de crop MEJORADO - Responsivo */}
      {showCropModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl flex flex-col overflow-hidden">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-gradient-to-r from-primary/10 to-orange-50">
              <h3 className="text-lg font-bold text-gray-900">Ajusta tu foto</h3>
              <button
                type="button"
                onClick={() => {
                  setShowCropModal(false)
                  setImageToCrop('')
                }}
                className="p-2 hover:bg-white rounded-xl transition-colors"
              >
                <X className="w-5 h-5 text-gray-600" />
              </button>
            </div>

            <div className="p-4 bg-gray-50 flex items-center justify-center" style={{ maxHeight: '60vh' }}>
              <div className="w-full max-w-sm">
                <ReactCrop
                  crop={crop}
                  onChange={(c) => setCrop(c)}
                  onComplete={(c) => setCompletedCrop(c)}
                  aspect={1}
                  circularCrop
                  className="max-w-full"
                >
                  <img
                    ref={imageRef}
                    src={imageToCrop}
                    alt="Recortar"
                    className="max-w-full h-auto"
                    style={{ maxHeight: '50vh' }}
                  />
                </ReactCrop>
              </div>
            </div>

            <div className="p-4 border-t border-gray-200 flex gap-3 bg-white">
              <Button
                type="button"
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
                type="button"
                onClick={handleCropComplete}
                className="flex-1 bg-primary hover:bg-primary/90 text-white"
                disabled={!completedCrop}
              >
                Aplicar
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default ProfileSetupForm
