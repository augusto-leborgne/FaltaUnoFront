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
  console.log("🎨 ProfileSetupForm RENDERIZADO")
  
  // ⚡ ALERTA VISIBLE PARA CONFIRMAR QUE EL CÓDIGO SE EJECUTA
  if (typeof window !== 'undefined') {
    setTimeout(() => {
      console.log("🚨🚨🚨 COMPONENTE MONTADO - SI VES ESTO, LOS LOGS FUNCIONAN 🚨🚨🚨")
    }, 100)
  }
  
  const router = useRouter()
  const { user, setUser, refreshUser } = useAuth()
  const postAuthRedirect = usePostAuthRedirect()
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const cameraInputRef = useRef<HTMLInputElement | null>(null) // ⚡ NUEVO: Input para cámara
  const formRef = useRef<HTMLFormElement | null>(null) // ⚡ Ref para el form

  console.log("🎨 ProfileSetupForm - user:", user?.email)
  console.log("🎨 ProfileSetupForm - formRef:", formRef.current)

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
  const hasPrefilled = useRef(false) // ⚡ Track if we already prefilled from user data

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
    // ⚡ ONLY RUN ONCE to prevent infinite re-renders
    if (hasPrefilled.current || !user) return;
    
    try {
      hasPrefilled.current = true; // Mark as prefilled
      
      setFormData((prev) => {
        // ⚡ CAMBIO: Pre-rellenar campos individuales que estén vacíos
        // NO usar shouldPrefill global porque si un campo tiene valor pero otro no,
        // hay que rellenar solo el que falta
        
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
          // Pre-rellenar cada campo SI está vacío
          name: prev.name || (user as any).nombre || (user as any).name || "",
          surname: prev.surname || (user as any).apellido || "",
          phone: phoneOnly || prev.phone,
          countryCode: countryCode || prev.countryCode,
          fechaNacimiento: prev.fechaNacimiento || (user as any).fechaNacimiento || (user as any).fecha_nacimiento || "",
          genero: prev.genero || (user as any).genero || "",
          position: prev.position || (user as any).posicion || (user as any).position || "",
          height: prev.height || ((user as any).altura ? String((user as any).altura) : ""),
          weight: prev.weight || ((user as any).peso ? String((user as any).peso) : ""),
          address: prev.address || (user as any).direccion || (user as any).ubicacion || "",
        }
      })
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
    console.log("🔥🔥🔥 [1] HANDLESUBMIT LLAMADO 🔥🔥🔥")
    console.log("🔥🔥🔥 [1] Event type:", e.type)
    console.log("🔥🔥🔥 [1] Target:", e.target)
    
    // ⚡ CRÍTICO: preventDefault ANTES de cualquier otra cosa
    e.preventDefault()
    console.log("✅ [2] preventDefault ejecutado")
    
    e.stopPropagation()
    console.log("✅ [3] stopPropagation ejecutado")
    
    try {
      setGeneralError("")
      console.log("✅ [4] Iniciando validación...")
      logger.log("[ProfileSetup] 🚀 Form submitted, iniciando validación...")

      // Validación completa - SOLO campos que tienen validación
      const errors: Record<string, string> = {}
      const fieldsToValidate = ['name', 'surname', 'fechaNacimiento', 'genero', 'position', 'height', 'weight', 'photo', 'address']
      
      fieldsToValidate.forEach(key => {
        const error = validateField(key, formData[key as keyof typeof formData])
        if (error) errors[key] = error
      })

      console.log("✅ [5] Validación completada, errores:", Object.keys(errors).length)

      if (Object.keys(errors).length > 0) {
        console.log("❌ [6] HAY ERRORES DE VALIDACIÓN:", errors)
        setFieldErrors(errors)
        setGeneralError("Por favor completa todos los campos correctamente")
        logger.warn("[ProfileSetup] ❌ Errores de validación:", errors)
        return
      }

      console.log("✅ [7] Validación exitosa, llamando handleUploadAndSaveProfile...")
      logger.log("[ProfileSetup] ✅ Validación exitosa, procediendo a guardar...")
      await handleUploadAndSaveProfile()
      console.log("✅ [8] handleUploadAndSaveProfile completado")
    } catch (err: any) {
      console.error("❌ [ERROR] Error crítico en handleSubmit:", err)
      logger.error("[ProfileSetup] ❌ Error crítico en handleSubmit:", err)
      setGeneralError(`Error inesperado: ${err?.message ?? "Por favor intenta nuevamente"}`)
    }
  }

  async function handleUploadAndSaveProfile() {
    console.log("🚀 [9] handleUploadAndSaveProfile INICIADO")
    
    if (!formData.photo) {
      console.log("❌ [10] NO HAY FOTO")
      setGeneralError("Foto requerida")
      return
    }

    console.log("✅ [11] Foto presente, setIsUploading(true)")
    setIsUploading(true)
    setGeneralError("")
    try {
      console.log("✅ [12] Entrando en try block")
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
      
      console.log("🔀 [BRANCH-1] isNewRegistration:", isNewRegistration)
      console.log("🔀 [BRANCH-2] verifiedEmail:", verifiedEmail)
      console.log("🔀 [BRANCH-3] passwordHash:", passwordHash ? "PRESENTE" : "NULL")

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
        
        console.log("📸 [FOTO-1] Foto convertida a Base64:", photoBase64 ? `${photoBase64.length} caracteres` : "NULL")
        logger.log("[ProfileSetup] Foto Base64:", photoBase64 ? `${photoBase64.length} chars` : "NULL")

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

        console.log("📸 [FOTO-2] Payload preparado con fotoPerfil:", payload.fotoPerfil ? `${payload.fotoPerfil.length} chars` : "NULL")
        logger.log("[ProfileSetup] Enviando a /api/auth/complete-register...")
        logger.log("[ProfileSetup] Payload (sin foto):", { ...payload, fotoPerfil: payload.fotoPerfil ? `${payload.fotoPerfil.length} chars` : null })
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
        console.log("📸 [FOTO-3] Respuesta del servidor:", data)
        
        if (!data.success || !data.data) {
          throw new Error(data.message || 'Error al completar el registro')
        }

        // ⚡ CORREGIDO: Limpiar sessionStorage (no localStorage)
        sessionStorage.removeItem('pendingVerification')

        const { token, usuario } = data.data
        
        console.log("📸 [FOTO-4] Usuario recibido del servidor:", {
          email: usuario.email,
          hasFotoPerfil: usuario.hasFotoPerfil,
          fotoPerfil: usuario.fotoPerfil ? `${usuario.fotoPerfil.length} chars` : null,
          perfilCompleto: usuario.perfilCompleto
        })
        
        if (token) {
          logger.log("[ProfileSetup] ✅ Token recibido, guardando...")
          AuthService.setToken(token)
        } else {
          logger.warn("[ProfileSetup] ⚠️ No se recibió token del servidor")
        }

        // ⚡ CRÍTICO: NO actualizar usuario aquí para evitar que RequireIncompleteProfile 
        // detecte cambios y redirija. El usuario se actualizará en la siguiente página.
        logger.log("[ProfileSetup] ✅ Usuario recibido del backend (NO se actualiza contexto aún):", {
          id: usuario.id,
          email: usuario.email,
          nombre: usuario.nombre,
          apellido: usuario.apellido,
          perfilCompleto: usuario.perfilCompleto,
          celular: usuario.celular
        })
        
        // NO HACER: AuthService.setUser(usuario) ni setUser(usuario)

        logger.log("[ProfileSetup] ✅ Registro completado exitosamente")
        
        // ⚡ CRÍTICO: Marcar que estamos navegando para que RequireIncompleteProfile no interfiera
        sessionStorage.setItem('profileSetupNavigating', 'true')
        
        // Pequeño delay para asegurar que el token se guarde
        await new Promise(resolve => setTimeout(resolve, 300))
        
        // ⚡ DECISIÓN DE FLUJO: Verificar si tiene celular configurado
        const hasCelular = usuario.celular && usuario.celular.trim() !== ""
        
        if (hasCelular) {
          logger.log("[ProfileSetup] ✅ Usuario tiene celular configurado, redirigiendo a /home")
          router.replace('/home')
        } else {
          logger.log("[ProfileSetup] ⚠️ Usuario sin celular, redirigiendo a /phone-verification")
          router.replace('/phone-verification')
        }

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

        // ⚡ CRÍTICO: NO refrescar usuario aquí para evitar race conditions con guards
        // El usuario se cargará automáticamente en la siguiente página por AuthProvider.init
        console.log("✅ [ACTUALIZACIÓN-1] Perfil actualizado en backend")
        logger.log("[ProfileSetup] ✅ Perfil actualizado en backend")
        
        // ⚡ CRÍTICO: Marcar que estamos navegando para que RequireIncompleteProfile no interfiera
        console.log("✅ [ACTUALIZACIÓN-2] Seteando flag profileSetupNavigating")
        sessionStorage.setItem('profileSetupNavigating', 'true')
        
        // Pequeño delay para asegurar sincronización
        console.log("✅ [ACTUALIZACIÓN-3] Esperando 300ms...")
        await new Promise(resolve => setTimeout(resolve, 300))

        // ⚡ DECISIÓN DE FLUJO: Verificar si tiene celular configurado
        // Como NO refrescamos usuario, debemos verificar llamando al backend directamente
        console.log("✅ [ACTUALIZACIÓN-4] Verificando estado del perfil con getMe()...")
        logger.log("[ProfileSetup] Verificando estado del perfil...")
        const checkRes = await UsuarioAPI.getMe()
        console.log("✅ [ACTUALIZACIÓN-5] Respuesta de getMe():", checkRes)
        
        if (checkRes?.success && checkRes.data) {
          const updatedUser = checkRes.data
          console.log("✅ [ACTUALIZACIÓN-6] Usuario verificado (COMPLETO):", JSON.stringify(updatedUser, null, 2))
          logger.log("[ProfileSetup] ✅ Estado verificado:", {
            email: updatedUser.email,
            perfilCompleto: updatedUser.perfilCompleto,
            hasFotoPerfil: updatedUser.hasFotoPerfil,
            fotoPerfil: updatedUser.fotoPerfil ? `${updatedUser.fotoPerfil.substring(0, 20)}...` : null,
            celular: updatedUser.celular
          })
          
          const hasCelular = updatedUser.celular && updatedUser.celular.trim() !== ""
          console.log("✅ [ACTUALIZACIÓN-7] hasCelular:", hasCelular)
          console.log("✅ [ACTUALIZACIÓN-7.5] updatedUser.celular:", updatedUser.celular)
          console.log("✅ [ACTUALIZACIÓN-7.6] Iniciando navegación...")
          
          if (hasCelular) {
            console.log("🏠 [ACTUALIZACIÓN-8] ANTES DE router.replace('/home')")
            logger.log("[ProfileSetup] ✅ Usuario tiene celular configurado, redirigiendo a /home")
            
            // ⚡ Agregar delay mínimo para asegurar que el flag se persista
            await new Promise(resolve => setTimeout(resolve, 100))
            console.log("🏠 [ACTUALIZACIÓN-8.5] EJECUTANDO router.replace('/home')")
            router.replace('/home')
            console.log("🏠 [ACTUALIZACIÓN-8.9] DESPUÉS DE router.replace('/home') - esto NO debería ejecutarse inmediatamente")
          } else {
            console.log("📱 [ACTUALIZACIÓN-9] ANTES DE router.replace('/phone-verification')")
            logger.log("[ProfileSetup] ⚠️ Usuario sin celular, redirigiendo a /phone-verification")
            
            // ⚡ Agregar delay mínimo para asegurar que el flag se persista
            await new Promise(resolve => setTimeout(resolve, 100))
            console.log("📱 [ACTUALIZACIÓN-9.5] EJECUTANDO router.replace('/phone-verification')")
            router.replace('/phone-verification')
            console.log("📱 [ACTUALIZACIÓN-9.9] DESPUÉS DE router.replace - esto NO debería ejecutarse inmediatamente")
          }
        } else {
          console.error("❌ [ACTUALIZACIÓN-ERROR] Error en respuesta getMe:", checkRes)
          logger.error("[ProfileSetup] ❌ Error verificando estado del usuario")
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
              console.log("🔴🔴🔴 CLICK EN BOTÓN SUBMIT DETECTADO 🔴🔴🔴")
              console.log("🔴 Event:", e)
              console.log("🔴 isUploading:", isUploading)
              console.log("🔴 disabled:", isUploading)
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
