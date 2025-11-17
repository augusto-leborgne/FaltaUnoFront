// components/pages/user/settings-screen.tsx - VERSIÓN MEJORADA
"use client"


import { logger } from '@/lib/logger'
import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { UserAvatar } from "@/components/ui/user-avatar"
import { ArrowLeft, Camera, Save, Bell, AlertCircle, Trash2, Upload, X } from "lucide-react"
import { useRouter } from "next/navigation"
import { AuthService } from "@/lib/auth"
import { useAuth } from "@/hooks/use-auth"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import ReactCrop, { type Crop } from 'react-image-crop'
import 'react-image-crop/dist/ReactCrop.css'
import { UsuarioAPI, API_URL } from "@/lib/api"
import { PhotoCache } from "@/lib/photo-cache"
import { ProfileSetupStorage, type ProfileSetupData } from "@/lib/profile-setup-storage"

const positions = ["Arquero", "Defensa", "Mediocampista", "Delantero"]

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
  
  // Refs para inputs de foto
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const cameraInputRef = useRef<HTMLInputElement | null>(null)
  const [showPhotoOptions, setShowPhotoOptions] = useState(false)

  const [formData, setFormData] = useState({
    name: "",
    surname: "",
    email: "",
    phone: "",
    position: "",
    height: "",
    weight: "",
  })

  // ✅ NUEVO: Guardar datos originales para detectar cambios reales
  const [originalFormData, setOriginalFormData] = useState({
    phone: "",
    position: "",
    height: "",
    weight: "",
  })

  const [avatar, setAvatar] = useState<string>("")
  const [photoFile, setPhotoFile] = useState<File | null>(null)

  // Image crop states
  const [showCropModal, setShowCropModal] = useState(false)
  const [imageToCrop, setImageToCrop] = useState<string>("")
  const [crop, setCrop] = useState<Crop>({
    unit: '%',
    width: 60,
    height: 60,
    x: 20,
    y: 20
  })
  const [completedCrop, setCompletedCrop] = useState<Crop | null>(null)
  const imageRef = useRef<HTMLImageElement | null>(null)

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

  const [isCheckingPhone, setIsCheckingPhone] = useState(false)
  const [phoneCheckDebounce, setPhoneCheckDebounce] = useState<NodeJS.Timeout | null>(null)

  // Phone verification states
  const [showPhoneVerification, setShowPhoneVerification] = useState(false)
  const [pendingPhone, setPendingPhone] = useState("")
  const [verificationCode, setVerificationCode] = useState("")
  const [resendCooldown, setResendCooldown] = useState(0)
  const [verificationAttempts, setVerificationAttempts] = useState(0)

  // Verificar si el teléfono ya está registrado
  const checkPhoneAvailability = async (phone: string) => {
    if (!phone || phone.length < 8) return;

    setIsCheckingPhone(true);
    try {
      const response = await fetch(`${API_URL}/auth/check-phone?phone=${encodeURIComponent(phone)}`);
      const data = await response.json();

      if (data.success && data.data) {
        if (data.data.exists) {
          setFieldErrors(prev => ({ ...prev, phone: "Este número ya está registrado por otro usuario" }));
        } else {
          // Teléfono disponible, limpiar error de existencia
          setFieldErrors(prev => {
            if (prev.phone === "Este número ya está registrado por otro usuario") {
              const { phone, ...rest } = prev;
              return rest;
            }
            return prev;
          });
        }
      }
    } catch (err) {
      logger.error("[Settings] Error checking phone:", err);
    } finally {
      setIsCheckingPhone(false);
    }
  };

  // Cleanup debounce
  useEffect(() => {
    return () => {
      if (phoneCheckDebounce) {
        clearTimeout(phoneCheckDebounce);
      }
    };
  }, [phoneCheckDebounce]);

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

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
    
    // Check for stored data from phone verification navigation
    const storedData = ProfileSetupStorage.load()
    if (storedData) {
      const blobUrl = ProfileSetupStorage.base64ToBlobUrl(storedData)
      if (blobUrl) {
        setAvatar(blobUrl)
        
        // Try to recreate File object if photoFile data exists
        if (storedData.photoFile) {
          const file = ProfileSetupStorage.base64ToFile(storedData.photoFile)
          setPhotoFile(file)
        }
        
        logger.log("[Settings] Photo restored from storage")
      }
    }
  }, [])

  const loadUserData = async () => {
    try {
      // ⚡ CRÍTICO: SIEMPRE fetchear desde servidor para obtener foto_perfil
      // foto_perfil NO se guarda en localStorage (puede exceder quota de 5-10MB)
      let user = await AuthService.fetchCurrentUser()
      
      if (!user) {
        router.push("/login")
        return
      }

      // Construir URL de foto de perfil desde el objeto user
      // user.foto_perfil viene en base64 desde el backend
      if (user.foto_perfil) {
        setAvatar(user.foto_perfil)
      }

      setFormData({
        name: user.nombre || "",
        surname: user.apellido || "",
        email: user.email || "",
        phone: user.celular || "",
        position: user.posicion || "",
        height: user.altura?.toString() || "",
        weight: user.peso?.toString() || "",
      })

      // ✅ CRÍTICO: Guardar datos originales para comparar después
      setOriginalFormData({
        phone: user.celular || "",
        position: user.posicion || "",
        height: user.altura?.toString() || "",
        weight: user.peso?.toString() || "",
      })

      setAuthMethod(user.provider === "GOOGLE" ? "google" : "email")

    } catch (error) {
      logger.error("[Settings] Error cargando datos:", error)
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
      logger.error("[Settings] Error cargando preferencias:", error)
    }
  }

  // Send SMS verification code
  const sendVerificationCode = async (phone: string) => {
    setIsSaving(true);
    setError("");
    
    try {
      logger.log("[Settings] Sending verification code to:", phone);
      
      // Save current form data and photo to storage before navigating
      const storageData: ProfileSetupData = {
        name: formData.name,
        surname: formData.surname,
        phone: formData.phone,
        countryCode: "+598", // Default, will be updated if needed
        fechaNacimiento: "",
        genero: "",
        position: formData.position,
        height: formData.height,
        weight: formData.weight,
        address: "",
        placeDetails: null,
      };

      // Save photo file data if exists
      if (photoFile) {
        try {
          const photoData = await ProfileSetupStorage.fileToBase64(photoFile);
          storageData.photoFile = photoData;
        } catch (err) {
          logger.warn("[Settings] Could not save photo to storage:", err);
        }
      }

      ProfileSetupStorage.save(storageData);
      
      const response = await fetch(`${API_URL}/phone-verification/send`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${AuthService.getToken()}`
        },
        body: JSON.stringify({ phoneNumber: phone }),
      });

      const data = await response.json();
      
      if (data.success) {
        logger.log("[Settings] Code sent successfully");
        setPendingPhone(phone);
        setShowPhoneVerification(true);
        setResendCooldown(60);
        setError("");
      } else {
        setError(data.message || "Error al enviar el código");
      }
    } catch (err: any) {
      logger.error("[Settings] Error sending code:", err);
      setError(err?.message || "Error al enviar el código");
    } finally {
      setIsSaving(false);
    }
  };

  // Resend verification code
  const resendVerificationCode = async () => {
    if (resendCooldown > 0) return;
    
    setIsSaving(true);
    setError("");
    
    try {
      const response = await fetch(`${API_URL}/phone-verification/resend`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${AuthService.getToken()}`
        },
        body: JSON.stringify({ phoneNumber: pendingPhone }),
      });

      const data = await response.json();
      
      if (data.success) {
        logger.log("[Settings] Code resent successfully");
        setResendCooldown(60);
        setError("");
      } else {
        setError(data.message || "Error al reenviar el código");
      }
    } catch (err: any) {
      logger.error("[Settings] Error resending code:", err);
      setError(err?.message || "Error al reenviar el código");
    } finally {
      setIsSaving(false);
    }
  };

  // Verify SMS code and update phone
  const verifyCodeAndUpdatePhone = async () => {
    setIsSaving(true);
    setError("");
    
    try {
      logger.log("[Settings] Verifying code for:", pendingPhone);
      
      const response = await fetch(`${API_URL}/phone-verification/verify`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${AuthService.getToken()}`
        },
        body: JSON.stringify({ 
          phoneNumber: pendingPhone,
          code: verificationCode 
        }),
      });

      const data = await response.json();
      
      if (data.success) {
        logger.log("[Settings] Code verified successfully");
        
        // Now update the phone in the profile
        const success = await AuthService.updateProfile({ celular: pendingPhone });
        
        if (success) {
          logger.log("[Settings] Phone updated successfully");
          await refreshUser();
          
          // Update form data and original data
          setFormData(prev => ({ ...prev, phone: pendingPhone }));
          setOriginalFormData(prev => ({ ...prev, phone: pendingPhone }));
          
          // Close verification modal
          setShowPhoneVerification(false);
          setPendingPhone("");
          setVerificationCode("");
          setVerificationAttempts(0);
          
          // Clear stored data since verification is complete
          ProfileSetupStorage.clear();
          
          setSuccess(true);
          setTimeout(() => setSuccess(false), 3000);
        } else {
          throw new Error("Error al actualizar el teléfono");
        }
      } else {
        setVerificationAttempts(prev => prev + 1);
        setError(data.message || "Código incorrecto");
        
        if (verificationAttempts >= 2) {
          setError("Demasiados intentos fallidos. Solicita un nuevo código.");
          setShowPhoneVerification(false);
          setPendingPhone("");
          setVerificationCode("");
          setVerificationAttempts(0);
        }
      }
    } catch (err: any) {
      logger.error("[Settings] Error verifying code:", err);
      setError(err?.message || "Error al verificar el código");
    } finally {
      setIsSaving(false);
    }
  };

  const handleInputChange = (field: keyof typeof formData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    // ✅ Validar campos editables (phone, height, weight)
    if (field === 'phone' || field === 'height' || field === 'weight') {
      const fieldError = validateField(field, value)
      setFieldErrors(prev => ({ ...prev, [field]: fieldError || undefined }))
      
      // Verificar disponibilidad de teléfono con debounce
      if (field === 'phone') {
        if (phoneCheckDebounce) {
          clearTimeout(phoneCheckDebounce);
        }
        
        if (!fieldError && value && value !== originalFormData.phone) {
          const timeout = setTimeout(() => {
            checkPhoneAvailability(value);
          }, 800);
          setPhoneCheckDebounce(timeout);
        }
      }
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
      logger.log("[Settings] Guardando cambios...")
      let hasProfileChanges = false

      // Check if phone changed - if so, trigger verification first
      if (formData.phone && formData.phone !== originalFormData.phone) {
        logger.log("[Settings] Phone changed, triggering verification...");
        setIsSaving(false); // Reset so verification modal can use it
        await sendVerificationCode(formData.phone);
        return; // Exit - verification will complete the save
      }

      // 1. Subir foto si hay una nueva
      if (photoFile) {
        logger.log("[Settings] Subiendo foto...")
        const success = await AuthService.updateProfilePhoto(photoFile)
        
        if (!success) {
          throw new Error("Error al subir la foto")
        }
        
        logger.log("[Settings] Foto subida exitosamente")
        
        // ✅ CRÍTICO: Invalidar cache de foto para forzar recarga
        const currentUser = AuthService.getUser()
        if (currentUser?.id) {
          PhotoCache.invalidate(currentUser.id)
          logger.log("[Settings] Cache de foto invalidado")
        }
        
        hasProfileChanges = true
      }

      // 2. Actualizar perfil SOLO si hay cambios REALES en los campos editables (excluding phone - handled above)
      const perfilData: Record<string, any> = {}
      
      // ✅ CRÍTICO: Solo incluir campos que cambiaron respecto a los originales (phone already handled via verification)
      if (formData.position && formData.position !== originalFormData.position) {
        perfilData.posicion = formData.position
      }
      if (formData.height && formData.height !== originalFormData.height) {
        perfilData.altura = parseInt(formData.height)
      }
      if (formData.weight && formData.weight !== originalFormData.weight) {
        perfilData.peso = parseInt(formData.weight)
      }
      
      // Solo hacer el PUT si hay datos de perfil que cambiaron
      if (Object.keys(perfilData).length > 0) {
        logger.log("[Settings] Actualizando perfil con cambios:", perfilData)
        
        const success = await AuthService.updateProfile(perfilData)
        
        if (!success) {
          throw new Error("Error al actualizar el perfil")
        }
        
        logger.log("[Settings] Perfil actualizado exitosamente")
        hasProfileChanges = true
      } else {
        logger.log("[Settings] No hay cambios en el perfil para actualizar")
      }

      // 3. Guardar preferencias de notificación
      logger.log("[Settings] Guardando preferencias de notificación...")
      try {
        const { NotificationPreferencesAPI } = await import('@/lib/api')
        await NotificationPreferencesAPI.update(notificationPreferences)
        logger.log("[Settings] Preferencias de notificación guardadas")
      } catch (prefError) {
        logger.warn("[Settings] Error guardando preferencias de notificación:", prefError)
        // No fallar el guardado completo por esto
      }

      // 4. Refrescar contexto SOLO si hubo cambios en el perfil
      if (hasProfileChanges) {
        logger.log("[Settings] Refrescando datos del usuario...")
        await refreshUser()
      }

      // 5. Actualizar avatar con la nueva foto desde cache (después de invalidar)
      if (photoFile) {
        const currentUser = AuthService.getUser()
        if (currentUser?.id) {
          // Esperar un momento para que el servidor procese la foto
          await new Promise(resolve => setTimeout(resolve, 500))
          
          // Cargar nueva foto desde servidor
          const newPhoto = await PhotoCache.getPhoto(currentUser.id)
          if (newPhoto) {
            setAvatar(newPhoto)
            setPhotoFile(null)
            logger.log("[Settings] Avatar actualizado con nueva foto")
          }
        }
      }

      setSuccess(true)
      
      // Redirigir después de 1 segundo
      setTimeout(() => {
        router.back()
      }, 1000)

    } catch (error) {
      logger.error("[Settings] Error guardando cambios:", error)
      setError(error instanceof Error ? error.message : "Error al guardar cambios")
    } finally {
      setIsSaving(false)
    }
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
      
      setPhotoFile(file)
      setAvatar(URL.createObjectURL(file))
      
      setShowCropModal(false)
      setImageToCrop('')
    }, 'image/jpeg', 0.92) // Calidad 92% - buen balance
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

      const reader = new FileReader()
      reader.onload = () => {
        if (reader.result) {
          setImageToCrop(reader.result as string)
          setShowCropModal(true)
        }
      }
      reader.readAsDataURL(file)
      
      setShowPhotoOptions(false)
      logger.log("[Settings] Foto seleccionada para recortar:", file.name)
    }
  }
  
  const openFileExplorer = () => {
    fileInputRef.current?.click()
    setShowPhotoOptions(false)
  }
  
  const openCamera = () => {
    cameraInputRef.current?.click()
    setShowPhotoOptions(false)
  }
  
  const removePhoto = async () => {
    try {
      setShowPhotoOptions(false)
      setPhotoFile(null)
      setAvatar("")
      
      // Clear photo locally - backend will handle on save
      const currentUser = AuthService.getUser()
      if (currentUser) {
        PhotoCache.invalidate(currentUser.id)
      }
      
      logger.log("[Settings] Foto marcada para eliminación")
    } catch (err) {
      logger.error("[Settings] Error eliminando foto:", err)
      setError("Error al eliminar foto")
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
      logger.log("[Settings] Eliminando cuenta...")
      
      const { UsuarioAPI } = await import('@/lib/api')
      const response = await UsuarioAPI.eliminarCuenta()

      if (!response.success) {
        throw new Error(response.message || "Error al eliminar la cuenta")
      }

      logger.log("[Settings] Cuenta eliminada exitosamente")
      
      // Cerrar sesión y redirigir
      AuthService.logout()
      router.replace("/login")
      
    } catch (error) {
      logger.error("[Settings] Error eliminando cuenta:", error)
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

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header */}
      <div className="pt-16 pb-6 px-6 border-b border-gray-100">
        <div className="flex items-center space-x-4">
          <button onClick={handleBack} className="p-2 sm:p-3 -ml-2 min-h-[44px] min-w-[44px] flex items-center justify-center">
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <h1 className="text-xl font-bold text-gray-900">Configuración</h1>
        </div>
      </div>

      <div className="flex-1 px-6 py-6 overflow-y-auto">
        {/* Success Message */}
        {success && (
          <div className="mb-6 p-4 bg-primary/10 border border-primary/30 rounded-2xl flex items-start space-x-3">
            <div className="w-5 h-5 bg-primary rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
              <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            </div>
            <div>
              <p className="text-primary text-sm font-medium">¡Cambios guardados!</p>
              <p className="text-primary/80 text-sm">Redirigiendo...</p>
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
            <UserAvatar 
              photo={avatar || null}
              name={formData.name}
              surname={formData.surname}
              className="w-24 h-24"
            />
            <button
              type="button"
              onClick={() => setShowPhotoOptions(true)}
              className="absolute -bottom-2 -right-2 bg-primary text-white rounded-full p-2 shadow-lg hover:bg-primary/90 transition-colors touch-manipulation"
            >
              <Camera className="w-4 h-4" />
            </button>
          </div>
          <p className="text-sm text-gray-500 mt-2">Toca para cambiar foto</p>
          {photoFile && (
            <p className="text-sm text-primary mt-1">Nueva foto seleccionada</p>
          )}
          
          {/* Hidden file inputs */}
          <input 
            ref={fileInputRef} 
            type="file" 
            accept="image/*" 
            onChange={handleUploadPhoto} 
            className="hidden"
          />
          <input 
            ref={cameraInputRef} 
            type="file" 
            accept="image/*" 
            capture
            onChange={handleUploadPhoto} 
            className="hidden"
          />
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
                  className={`px-3 py-2 rounded-xl text-sm font-medium border transition-colors disabled:opacity-50 ${
                    formData.position === position
                      ? "bg-primary/10 text-primary border-primary/30"
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
      
      {/* Photo Options Modal */}
      {showPhotoOptions && (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-4">
          <div className="bg-white rounded-t-3xl sm:rounded-3xl w-full sm:max-w-md max-w-full animate-in slide-in-from-bottom duration-300 sm:animate-in sm:fade-in">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold text-gray-900">Foto de perfil</h3>
                <button
                  onClick={() => setShowPhotoOptions(false)}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
              
              <div className="space-y-3">
                <button
                  onClick={openCamera}
                  className="w-full flex items-center space-x-3 p-4 bg-gray-50 hover:bg-gray-100 rounded-xl transition-colors text-left touch-manipulation"
                  disabled={isSaving}
                >
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Camera className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <div className="font-semibold text-gray-900">Tomar foto</div>
                    <div className="text-sm text-gray-500">Usar cámara del dispositivo</div>
                  </div>
                </button>
                
                <button
                  onClick={openFileExplorer}
                  className="w-full flex items-center space-x-3 p-4 bg-gray-50 hover:bg-gray-100 rounded-xl transition-colors text-left touch-manipulation"
                  disabled={isSaving}
                >
                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                    <Upload className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <div className="font-semibold text-gray-900">Elegir de galería</div>
                    <div className="text-sm text-gray-500">Seleccionar archivo existente</div>
                  </div>
                </button>
                
                {avatar && (
                  <button
                    onClick={removePhoto}
                    className="w-full flex items-center space-x-3 p-4 bg-red-50 hover:bg-red-100 rounded-xl transition-colors text-left touch-manipulation"
                    disabled={isSaving}
                  >
                    <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                      <Trash2 className="w-5 h-5 text-red-600" />
                    </div>
                    <div>
                      <div className="font-semibold text-red-900">Eliminar foto</div>
                      <div className="text-sm text-red-600">Usar avatar predeterminado</div>
                    </div>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Phone Verification Modal */}
      {showPhoneVerification && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-primary/10 to-orange-50">
              <h3 className="text-xl font-bold text-gray-900">Verificar número</h3>
              <p className="text-sm text-gray-600 mt-1">Enviamos un código a {pendingPhone}</p>
            </div>

            <div className="p-6 space-y-4">
              {error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-2xl flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              )}

              <div>
                <Label className="text-sm font-medium text-gray-700 mb-2 block">
                  Código de 6 dígitos
                </Label>
                <Input
                  type="text"
                  placeholder="000000"
                  value={verificationCode}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                    setVerificationCode(value);
                  }}
                  className="text-center text-2xl tracking-widest font-mono"
                  maxLength={6}
                  disabled={isSaving}
                  autoFocus
                />
              </div>

              <div className="text-center">
                {resendCooldown > 0 ? (
                  <p className="text-sm text-gray-500">
                    Reenviar código en {resendCooldown}s
                  </p>
                ) : (
                  <button
                    type="button"
                    onClick={resendVerificationCode}
                    disabled={isSaving}
                    className="text-sm text-primary hover:text-primary/80 font-medium disabled:opacity-50"
                  >
                    Reenviar código
                  </button>
                )}
              </div>
            </div>

            <div className="p-6 bg-gray-50 flex gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  setShowPhoneVerification(false);
                  setPendingPhone("");
                  setVerificationCode("");
                  setVerificationAttempts(0);
                }}
                disabled={isSaving}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button
                onClick={verifyCodeAndUpdatePhone}
                disabled={isSaving || verificationCode.length !== 6}
                className="flex-1 bg-primary text-white hover:bg-primary/90"
              >
                {isSaving ? "Verificando..." : "Verificar"}
              </Button>
            </div>
          </div>
        </div>
      )}
      
      {/* Crop Modal */}
      {showCropModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-3 sm:p-4">
          <div className="bg-white rounded-2xl sm:rounded-3xl w-full max-w-lg shadow-2xl flex flex-col overflow-hidden">
            <div className="p-3 sm:p-4 border-b border-gray-200 flex items-center justify-between bg-gradient-to-r from-primary/10 to-orange-50">
              <h3 className="text-base sm:text-lg font-bold text-gray-900">Ajusta tu foto</h3>
              <button
                type="button"
                onClick={() => {
                  setShowCropModal(false)
                  setImageToCrop('')
                }}
                className="p-1.5 sm:p-2 active:bg-white rounded-lg sm:rounded-xl transition-colors"
              >
                <X className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600" />
              </button>
            </div>

            <div className="p-3 sm:p-4 bg-gray-50 flex items-center justify-center" style={{ maxHeight: '60vh' }}>
              <div className="w-full max-w-sm">
                <ReactCrop
                  crop={crop}
                  onChange={(c) => setCrop(c)}
                  onComplete={(c) => setCompletedCrop(c)}
                  aspect={1}
                  circularCrop
                  keepSelection
                  locked
                  minWidth={50}
                  minHeight={50}
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

            <div className="p-3 sm:p-4 border-t border-gray-200 flex gap-2 sm:gap-3 bg-white">
              <Button
                type="button"
                onClick={() => {
                  setShowCropModal(false)
                  setImageToCrop('')
                }}
                variant="outline"
                className="flex-1 text-sm sm:text-base py-2 sm:py-2.5"
              >
                Cancelar
              </Button>
              <Button
                type="button"
                onClick={handleCropComplete}
                className="flex-1 bg-primary active:bg-primary/90 text-white text-sm sm:text-base py-2 sm:py-2.5"
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