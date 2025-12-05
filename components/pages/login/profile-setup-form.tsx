"use client"

import { logger } from '@/lib/logger'
import React, { useRef, useState, useEffect } from "react"
import { DropdownPortal } from "./DropdownPortal"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { DateSelector } from "@/components/ui/date-selector"
import { useRouter } from "next/navigation"
import { User, ChevronDown, AlertCircle, X, Camera, Upload, ArrowLeft } from "lucide-react"
import AddressAutocomplete from "@/components/google-maps/address-autocomplete"
import { AuthService } from "@/lib/auth"
import { useAuth } from "@/hooks/use-auth"
import { UsuarioAPI, PhotoValidationAPI } from "@/lib/api"
import { usePostAuthRedirect } from "@/lib/navigation"
import ReactCrop, { type Crop } from 'react-image-crop'
import 'react-image-crop/dist/ReactCrop.css'
import { withRetry, formatErrorMessage } from '@/lib/api-utils'
import { useClickOutside } from '@/hooks/use-click-outside'
import { useDisableBodyScroll } from '@/hooks/use-disable-body-scroll'
import { cn } from '@/lib/utils'

const describePhotoValidation = (result: { message?: string; faceCount?: number; isAppropriate?: boolean; reason?: string; confidence?: number }) => {
  if (!result) return "La foto no cumple con los requisitos";

  // Usar el mensaje del servidor si está disponible (ya es específico)
  if (result.message) return result.message;

  // Fallbacks por si el mensaje no viene del servidor
  switch (result.reason) {
    case "NO_FACE":
      return "No se detectó ningún rostro. Asegúrate de que tu cara sea visible y esté bien iluminada.";
    case "MULTIPLE_FACES":
      return `Se detectaron ${result.faceCount || 'múltiples'} rostros. Solo se permite una persona en la foto.`;
    case "LOW_CONFIDENCE":
      return "La calidad de la foto es muy baja. Por favor toma una foto más clara.";
    case "BLURRY_IMAGE":
      return "La foto está borrosa o desenfocada. Toma una foto más nítida.";
    case "POOR_LIGHTING":
      return "La foto está muy oscura. Busca mejor iluminación y vuelve a intentar.";
    case "OVEREXPOSED":
      return "La foto está sobreexpuesta. Reduce la iluminación y vuelve a intentar.";
    case "BAD_LIGHTING_CONDITIONS":
      return "La foto tiene problemas de iluminación. Evita contraluz y busca luz uniforme.";
    case "EXTREME_ANGLE":
      return "Tu rostro debe estar de frente a la cámara. Evita ángulos extremos.";
    case "FACE_OCCLUDED":
      return "Tu rostro debe estar completamente visible. Evita cubrirlo con accesorios.";
    case "INAPPROPRIATE_EXPRESSION":
      return "Por favor usa una foto con expresión neutra o sonriente para tu perfil.";
    case "ADULT_CONTENT":
      return "La foto contiene contenido adulto. Usa una foto apropiada para tu perfil.";
    case "VIOLENT_CONTENT":
      return "La foto contiene contenido violento. Elige una foto apropiada.";
    case "RACY_CONTENT":
      return "La foto contiene contenido sugerente. Por favor elige otra imagen.";
    case "SPOOF_CONTENT":
      return "La foto parece ser falsa o modificada. Usa una foto real.";
    case "API_ERROR":
      return "No se pudo validar la foto. Por favor intenta nuevamente.";
    default:
      // Fallbacks antiguos
      if (result.faceCount === 0) {
        return "No se detectó ningún rostro. Sube una foto donde se vea tu cara.";
      }
      if (result.faceCount && result.faceCount > 1) {
        return "Solo se permite una persona en la foto.";
      }
      if (result.isAppropriate === false) {
        return "La foto contiene contenido inapropiado. Elige otra.";
      }
      return "La foto no cumple con los requisitos";
  }
};

export function ProfileSetupForm() {
  const router = useRouter()
  const { user, setUser, refreshUser } = useAuth()
  const postAuthRedirect = usePostAuthRedirect()
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const cameraInputRef = useRef<HTMLInputElement | null>(null)
  const formRef = useRef<HTMLFormElement | null>(null)

  // Refs for controlling prefill logic
  const isInitialMount = useRef(true)
  const hasPrefilled = useRef(false)

  // Refs para dropdowns
  const positionDropdownRef = useRef<HTMLDivElement | null>(null)
  const positionButtonRef = useRef<HTMLButtonElement | null>(null)
  const generoDropdownRef = useRef<HTMLDivElement | null>(null)
  const generoButtonRef = useRef<HTMLButtonElement | null>(null)

  const [formData, setFormData] = useState({
    name: "",
    surname: "",
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
  const [isUploading, setIsUploading] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string | undefined>>({})
  const [photoError, setPhotoError] = useState<string>("")

  // Click outside handlers para cerrar dropdowns
  useClickOutside(positionDropdownRef, () => setShowPositionDropdown(false), showPositionDropdown)
  useClickOutside(generoDropdownRef, () => setShowGeneroDropdown(false), showGeneroDropdown)
  const [generalError, setGeneralError] = useState<string>("")

  // Image crop states
  const [showCropModal, setShowCropModal] = useState(false)
  const [imageToCrop, setImageToCrop] = useState<string>("")
  // ⚡ FIX: Crop inicial CIRCULAR - size = min(width, height) para que se ajuste a la imagen
  const [crop, setCrop] = useState<Crop>({
    unit: '%',
    width: 50,
    height: 50,
    x: 25,
    y: 25
  })
  const [completedCrop, setCompletedCrop] = useState<Crop | null>(null)
  const imageRef = useRef<HTMLImageElement | null>(null)

  // Camera states
  const [showPhotoOptions, setShowPhotoOptions] = useState(false)
  const [showCameraModal, setShowCameraModal] = useState(false)
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null)
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const photoOptionsRef = useRef<HTMLDivElement | null>(null)

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
        // Note: Photo validation is handled specially in handleSubmit to check both File and photoPreviewUrl
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
  const generos = ["Hombre", "Mujer"]

  useEffect(() => {
    // ✅ FIX: Always load from user object first (most recent data from backend)
    // This ensures data is current when returning from cedula verification
    if (!isInitialMount.current) return;
    if (hasPrefilled.current) return;

    isInitialMount.current = false;
    hasPrefilled.current = true;

    const loadUserData = async () => {
      try {
        // ✅ Always fetch fresh user data from backend first
        logger.log('[ProfileSetup] Fetching fresh user data from backend...');
        const userRes = await UsuarioAPI.getMe();
        
        if (userRes?.success && userRes.data) {
          const freshUser = userRes.data;
          logger.log('[ProfileSetup] Fresh user data loaded, prefilling form');
          
          // ✅ Update context with fresh data
          setUser(freshUser);
          
          // ✅ Load address and placeDetails from localStorage (not stored in backend)
          let savedAddress = "";
          let savedPlaceDetails = null;
          try {
            const savedData = localStorage.getItem('profileSetupFormData');
            if (savedData) {
              const parsed = JSON.parse(savedData);
              savedAddress = parsed.address || "";
              savedPlaceDetails = parsed.placeDetails || null;
            }
          } catch (e) {
            logger.warn('[ProfileSetup] Error loading address from localStorage:', e);
          }

          // ✅ Prefill form with fresh backend data + localStorage address
          setFormData((prev) => ({
            ...prev,
            name: freshUser.nombre || freshUser.name || prev.name || "",
            surname: freshUser.apellido || prev.surname || "",
            fechaNacimiento: freshUser.fechaNacimiento || freshUser.fecha_nacimiento || prev.fechaNacimiento || "",
            genero: freshUser.genero || prev.genero || "",
            position: freshUser.posicion || freshUser.position || prev.position || "",
            height: freshUser.altura ? String(freshUser.altura) : (prev.height || ""),
            weight: freshUser.peso ? String(freshUser.peso) : (prev.weight || ""),
            address: savedAddress || prev.address || "",
            placeDetails: savedPlaceDetails || prev.placeDetails,
            photoPreviewUrl: freshUser.fotoPerfil ? `data:image/jpeg;base64,${freshUser.fotoPerfil}` : prev.photoPreviewUrl,
          }));
          
          // ✅ Don't clear localStorage - keep address data
          return;
        }
        
        // Fallback: If backend call fails, try localStorage
        const savedData = localStorage.getItem('profileSetupFormData');
        if (savedData) {
          const parsed = JSON.parse(savedData);
          logger.log('[ProfileSetup] Backend failed, loaded form data from localStorage');
          setFormData(prev => ({
            ...prev,
            ...parsed,
            photo: prev.photo,
            photoPreviewUrl: prev.photoPreviewUrl,
          }));
          return;
        }

        // Last fallback: use context user if available
        if (user) {
          logger.log('[ProfileSetup] Using context user as fallback');
          setFormData((prev) => ({
            ...prev,
            name: prev.name || (user as any).nombre || (user as any).name || "",
            surname: prev.surname || (user as any).apellido || "",
            fechaNacimiento: prev.fechaNacimiento || (user as any).fechaNacimiento || (user as any).fecha_nacimiento || "",
            genero: prev.genero || (user as any).genero || "",
            position: prev.position || (user as any).posicion || (user as any).position || "",
            height: prev.height || ((user as any).altura ? String((user as any).altura) : ""),
            weight: prev.weight || ((user as any).peso ? String((user as any).peso) : ""),
            address: prev.address || (user as any).direccion || (user as any).ubicacion || "",
          }));
        }
      } catch (e) {
        logger.error('[ProfileSetup] Error loading user data:', e);
        // Try localStorage as fallback on error
        try {
          const savedData = localStorage.getItem('profileSetupFormData');
          if (savedData) {
            const parsed = JSON.parse(savedData);
            logger.log('[ProfileSetup] Error occurred, loaded from localStorage');
            setFormData(prev => ({
              ...prev,
              ...parsed,
              photo: prev.photo,
              photoPreviewUrl: prev.photoPreviewUrl,
            }));
          }
        } catch (storageError) {
          logger.error('[ProfileSetup] Error loading from localStorage:', storageError);
        }
      }
    };

    loadUserData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // ⚡ EMPTY DEPS - Run ONLY on mount

  // ✅ NEW: Save form data to localStorage on change (including address and placeDetails)
  useEffect(() => {
    // Don't save on initial mount
    if (isInitialMount.current) return;

    try {
      // Save form data (excluding photo which is a File object)
      const dataToSave = {
        name: formData.name,
        surname: formData.surname,
        fechaNacimiento: formData.fechaNacimiento,
        genero: formData.genero,
        position: formData.position,
        height: formData.height,
        weight: formData.weight,
        address: formData.address,
        placeDetails: formData.placeDetails, // ✅ Save Google Maps place details
      };
      localStorage.setItem('profileSetupFormData', JSON.stringify(dataToSave));
    } catch (e) {
      logger.error('[ProfileSetup] Error saving form data:', e);
    }
  }, [formData.name, formData.surname, formData.fechaNacimiento, formData.genero,
  formData.position, formData.height, formData.weight, formData.address, formData.placeDetails])

  useEffect(() => {
    return () => {
      if (formData.photoPreviewUrl) URL.revokeObjectURL(formData.photoPreviewUrl)
    }
  }, [formData.photoPreviewUrl])

  // Camera functions
  const openCamera = () => {
    // Try to use getUserMedia for desktop, fallback to file input for mobile
    if (navigator.mediaDevices && typeof navigator.mediaDevices.getUserMedia === 'function') {
      setShowCameraModal(true)
      setShowPhotoOptions(false)
    } else {
      // Fallback for older browsers or when getUserMedia is not available
      cameraInputRef.current?.click()
      setShowPhotoOptions(false)
    }
  }

  const startCamera = async () => {
    try {
      // Check if media devices are supported
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('La API de cámara no está disponible en este navegador. Actualiza tu navegador o usa uno moderno como Chrome, Firefox o Edge.');
      }

      // Check current permission status if available
      if (navigator.permissions && navigator.permissions.query) {
        try {
          const permissionStatus = await navigator.permissions.query({ name: 'camera' as PermissionName });
          if (permissionStatus.state === 'denied') {
            throw new Error('Permiso de cámara denegado. Ve a la configuración de tu navegador y permite el acceso a la cámara para este sitio.');
          }
        } catch (permError) {
          // Permission API might not be fully supported, continue with getUserMedia
          logger.warn("[ProfileSetup] Permission API not fully supported:", permError);
        }
      }

      let stream: MediaStream | null = null;
      let lastError: any = null;

      // Try different camera options with better error handling for computers
      try {
        // First try user camera (front camera) - most computers have this
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: 'user',
            width: { ideal: 1280 },
            height: { ideal: 720 }
          },
          audio: false
        });
        logger.log("[ProfileSetup] Successfully accessed front camera");
      } catch (userError) {
        lastError = userError;
        logger.warn("[ProfileSetup] Front camera failed, trying back camera:", userError instanceof Error ? userError.message : String(userError));

        try {
          // Fallback to environment camera (back camera) - some computers might have external cameras
          stream = await navigator.mediaDevices.getUserMedia({
            video: {
              facingMode: 'environment',
              width: { ideal: 1280 },
              height: { ideal: 720 }
            },
            audio: false
          });
          logger.log("[ProfileSetup] Successfully accessed back camera");
        } catch (envError) {
          lastError = envError;
          logger.warn("[ProfileSetup] Back camera failed, trying any camera:", envError instanceof Error ? envError.message : String(envError));

          try {
            // Final fallback - any camera available with basic constraints
            stream = await navigator.mediaDevices.getUserMedia({
              video: {
                width: { ideal: 1280 },
                height: { ideal: 720 }
              },
              audio: false
            });
            logger.log("[ProfileSetup] Successfully accessed any available camera");
          } catch (anyError) {
            lastError = anyError;
            logger.error("[ProfileSetup] All camera attempts failed:", anyError);

            // Try one more time with minimal constraints for very old devices/browsers
            try {
              stream = await navigator.mediaDevices.getUserMedia({
                video: true,
                audio: false
              });
              logger.log("[ProfileSetup] Successfully accessed camera with minimal constraints");
            } catch (minimalError) {
              // If all attempts fail, provide helpful error message
              const error = minimalError || lastError;
              if (error instanceof Error) {
                if (error.name === 'NotAllowedError') {
                  throw new Error('Permiso de cámara denegado. Haz clic en el icono de cámara en la barra de direcciones y permite el acceso. Si el problema persiste, reinicia tu navegador.');
                } else if (error.name === 'NotFoundError') {
                  throw new Error('No se encontró ninguna cámara. Verifica que tu dispositivo tenga una cámara conectada y funcionando.');
                } else if (error.name === 'NotReadableError') {
                  throw new Error('La cámara está siendo usada por otra aplicación. Cierra otras apps que puedan estar usando la cámara e intenta nuevamente.');
                } else if (error.name === 'OverconstrainedError') {
                  throw new Error('La configuración de cámara solicitada no es compatible. Intenta con una resolución más baja.');
                } else if (error.name === 'SecurityError') {
                  throw new Error('Error de seguridad al acceder a la cámara. Asegúrate de que estés accediendo desde HTTPS.');
                } else {
                  throw new Error(`Error al acceder a la cámara: ${error.message || 'Error desconocido'}`);
                }
              } else {
                throw new Error('Error desconocido al acceder a la cámara. Intenta refrescar la página o reiniciar tu navegador.');
              }
            }
          }
        }
      }

      if (!stream) {
        throw lastError || new Error('No camera available');
      }

      setCameraStream(stream);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        // Wait for video to be ready
        videoRef.current.onloadedmetadata = () => {
          logger.log("[ProfileSetup] Camera video metadata loaded");
        };
      }
    } catch (err) {
      logger.error("[ProfileSetup] Error accessing camera:", err);
      const errorMessage = err instanceof Error ? err.message : "Error al acceder a la cámara. Verifica los permisos del navegador.";
      setGeneralError(errorMessage);
      setShowCameraModal(false);
    }
  }

  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop())
      setCameraStream(null)
    }
    setShowCameraModal(false)
  }

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return

    const video = videoRef.current
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')

    if (!ctx) return

    // Set canvas size to video dimensions
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight

    // Draw the video frame to canvas (flipped horizontally to match mirrored preview)
    ctx.scale(-1, 1)
    ctx.drawImage(video, -canvas.width, 0, canvas.width, canvas.height)

    // Convert to blob and create file
    canvas.toBlob((blob) => {
      if (!blob) return

      const file = new File([blob], 'camera-photo.jpg', { type: 'image/jpeg' })

      // Process the captured photo like uploaded photos
      const reader = new FileReader()
      reader.onload = () => {
        if (reader.result) {
          setImageToCrop(reader.result as string)

          // ⚡ FIX: Reset crop to circular centered position for camera photo
          setCrop({
            unit: '%',
            width: 50,
            height: 50,
            x: 25,
            y: 25
          })
          setCompletedCrop(null) // Reset completed crop
          setShowCropModal(true)
        }
      }
      reader.readAsDataURL(file)

      stopCamera()
    }, 'image/jpeg', 0.92)
  }

  // Start camera when modal opens
  useEffect(() => {
    if (showCameraModal) {
      startCamera()
    }
  }, [showCameraModal])

  // Close photo options when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showPhotoOptions && photoOptionsRef.current && !photoOptionsRef.current.contains(event.target as Node)) {
        setShowPhotoOptions(false)
      }
    }

    if (showPhotoOptions) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showPhotoOptions])

  // Disable body scroll when modals are open
  useDisableBodyScroll(showCameraModal || showCropModal)

  // Cleanup camera stream on unmount
  useEffect(() => {
    return () => {
      if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop())
      }
    }
  }, [cameraStream])





  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null
    if (!f) return

    // ⚡ LÍMITES COMO INSTAGRAM: 30MB, 8K resolution (8192x8192)
    const MAX_SIZE = 30 * 1024 * 1024 // 30MB
    const MAX_DIMENSION = 8192

    if (f.size > MAX_SIZE) {
      setPhotoError("La imagen no puede superar 30MB")
      setFieldErrors(prev => ({ ...prev, photo: "La imagen no puede superar 30MB" }))
      return
    }

    setPhotoError("")
    setFieldErrors(prev => ({ ...prev, photo: undefined }))
    setGeneralError("")

    const reader = new FileReader()
    reader.onload = () => {
      const img = document.createElement('img')
      img.onload = () => {
        if (img.width > MAX_DIMENSION || img.height > MAX_DIMENSION) {
          setGeneralError(`La imagen no puede superar ${MAX_DIMENSION}x${MAX_DIMENSION} píxeles`)
          return
        }
        setImageToCrop(reader.result as string)

        // ⚡ FIX: Reset crop to circular centered position when new image loads
        const minDimension = Math.min(img.width, img.height)
        const size = 50 // 50% of image
        const offsetX = 25 // Center horizontally
        const offsetY = 25 // Center vertically

        setCrop({
          unit: '%',
          width: size,
          height: size,
          x: offsetX,
          y: offsetY
        })
        setCompletedCrop(null) // Reset completed crop
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

    canvas.toBlob(async (blob) => {
      if (!blob) return

      const file = new File([blob], 'profile-photo.jpg', { type: 'image/jpeg' })

      setIsUploading(true)
      setFieldErrors(prev => ({ ...prev, photo: undefined }))

      try {
        logger.log('[ProfileSetup] Validating cropped photo...')
        const validationResult = await PhotoValidationAPI.validate(file)

        if (!validationResult.valid) {
          logger.warn('[ProfileSetup] Cropped photo failed validation:', validationResult.message)
          const inlineMessage = describePhotoValidation(validationResult)
          setPhotoError(inlineMessage)
          setFieldErrors(prev => ({ ...prev, photo: inlineMessage }))
          // Keep modal open so user can adjust crop or cancel
          return
        }

        if (formData.photoPreviewUrl) URL.revokeObjectURL(formData.photoPreviewUrl)
        setPhotoError("")
        setFieldErrors(prev => ({ ...prev, photo: undefined }))
        setFormData((p) => ({ ...p, photo: file, photoPreviewUrl: URL.createObjectURL(file) }))
        setShowCropModal(false)
        setImageToCrop('')
      } catch (error) {
        logger.error('[ProfileSetup] Error validating cropped photo:', error)
        const fallbackMessage = error instanceof Error
          ? error.message
          : 'No se pudo validar la foto. Intenta nuevamente.'
        setPhotoError(fallbackMessage)
        setFieldErrors(prev => ({ ...prev, photo: fallbackMessage }))
        // Keep modal open on error
      } finally {
        setIsUploading(false)
      }
    }, 'image/jpeg', 0.92) // Calidad 92% - buen balance
  }

  const handleSubmit = async (e: React.FormEvent) => {
    // ⚡ CRÍTICO: preventDefault ANTES de cualquier otra cosa
    e.preventDefault()
    e.stopPropagation()

    try {
      setGeneralError("")
      logger.log("[ProfileSetup] Form submitted")

      const errors: Record<string, string> = {}
      const fieldsToValidate = ['name', 'surname', 'fechaNacimiento', 'genero', 'position', 'height', 'weight', 'photo', 'address']

      fieldsToValidate.forEach(key => {
        // ⚡ FIXED: Special handling for photo - check both File and photoPreviewUrl
        if (key === 'photo') {
          if (!formData.photo && !formData.photoPreviewUrl) {
            errors[key] = "Foto obligatoria"
          } else if (formData.photo) {
            // Validate File object if present
            const error = validateField(key, formData[key as keyof typeof formData])
            if (error) errors[key] = error
          }
          // If photoPreviewUrl exists but no formData.photo, photo is valid (pre-loaded)
        } else {
          const error = validateField(key, formData[key as keyof typeof formData])
          if (error) errors[key] = error
        }
      })

      if (Object.keys(errors).length > 0) {
        setFieldErrors(errors)
        setGeneralError("Por favor completa todos los campos correctamente")
        logger.warn("[ProfileSetup] Validation errors:", errors)
        return
      }

      logger.log("[ProfileSetup] Validation OK, saving...")
      await handleUploadAndSaveProfile()
    } catch (err: any) {
      logger.error("[ProfileSetup] Submit error:", err)
      setGeneralError(`Error inesperado: ${err?.message ?? "Por favor intenta nuevamente"}`)
    }
  }

  async function handleUploadAndSaveProfile() {
    // ⚡ FIXED: Check both formData.photo and photoPreviewUrl for photo existence
    if (!formData.photo && !formData.photoPreviewUrl) {
      setGeneralError("Foto requerida")
      return
    }

    // ⚡ IMPROVED: Set navigation flag IMMEDIATELY before any async operations
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('profileSetupNavigating', 'true')
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
          } catch (e) {
            logger.error("[ProfileSetup] Error parsing pendingVerification:", e)
          }
        }
      }

      const isNewRegistration = !!(verifiedEmail && passwordHash)
      logger.log("[ProfileSetup] Mode:", isNewRegistration ? "NEW REGISTRATION" : "PROFILE UPDATE")

      if (isNewRegistration) {
        logger.log("[ProfileSetup] Completing registration for:", verifiedEmail)

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

        sessionStorage.removeItem('pendingVerification')

        const { token, usuario } = data.data

        if (token) {
          AuthService.setToken(token)
        } else {
          logger.warn("[ProfileSetup] No token received")
        }

        logger.log("[ProfileSetup] Registration completed")

        // ✅ Clear saved form data after successful registration
        localStorage.removeItem('profileSetupFormData')

        // ⚡ CRITICAL FIX: Update context with user data from registration
        setUser(usuario)

        // Navigation flag already set at the beginning of function
        await new Promise(resolve => setTimeout(resolve, 200))

        const isComplete = usuario.perfilCompleto === true

        if (isComplete) {
          logger.log("[ProfileSetup] Registration complete, redirecting to /home")
          router.replace('/home')
        } else {
          logger.warn("[ProfileSetup] Profile incomplete - staying on setup")
          setGeneralError("Por favor completa todos los campos requeridos")
        }

      } else {
        const token = AuthService.getToken()
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

        // ⚡ FIXED: Only upload photo if there's a new File (not pre-loaded)
        if (formData.photo instanceof File) {
          logger.log("[ProfileSetup] Uploading new photo...")
          const fotoRes = await UsuarioAPI.subirFoto(formData.photo)
          if (!fotoRes?.success) {
            const errorMsg = fotoRes?.message || "No se pudo subir la foto"
            logger.error("[ProfileSetup] Photo upload error:", errorMsg)
            throw new Error(errorMsg)
          }
          logger.log("[ProfileSetup] Photo uploaded successfully")
        } else {
          logger.log("[ProfileSetup] Skipping photo upload (using existing photo)")
        }

        // ⚡ CRITICAL: Preserve celular if it exists to avoid backend overwriting with null
        const payload: any = {
          nombre: formData.name,
          apellido: formData.surname,
          fecha_nacimiento: formData.fechaNacimiento,
          genero: formData.genero,
          posicion: formData.position,
          altura: String(formData.height),
          peso: String(formData.weight),
          direccion: formData.address,
          placeDetails: formData.placeDetails ? JSON.stringify(formData.placeDetails) : null,
        }

        // ⚡ IMPROVED: Use retry logic for critical profile update
        const perfilRes = await withRetry(
          () => UsuarioAPI.actualizarPerfil(payload),
          {
            maxRetries: 2,
            delayMs: 1500,
            shouldRetry: (error) => {
              // Retry on network errors or 5xx
              return error.name === 'AbortError' ||
                error.message?.includes('timeout') ||
                (error.status >= 500 && error.status < 600)
            }
          }
        )

        if (!perfilRes?.success) {
          const errorMsg = perfilRes?.message || "No se pudo actualizar el perfil"
          logger.error("[ProfileSetup] Profile update error:", errorMsg)
          throw new Error(errorMsg)
        }

        logger.log("[ProfileSetup] Profile updated")

        // Navigation flag already set at the beginning of function
        await new Promise(resolve => setTimeout(resolve, 200))

        // ⚡ DECISIÓN DE FLUJO: Verificar si tiene celular configurado
        // Como NO refrescamos usuario, debemos verificar llamando al backend directamente
        logger.log("[ProfileSetup] Fetching updated profile state...")
        const checkRes = await UsuarioAPI.getMe()

        if (checkRes?.success && checkRes.data) {
          const updatedUser = checkRes.data
          logger.log("[ProfileSetup] Profile state verified:", {
            email: updatedUser.email,
            perfilCompleto: updatedUser.perfilCompleto,
            hasFotoPerfil: updatedUser.hasFotoPerfil,
          })

          // ⚡ CRITICAL FIX: Update context with latest user data to prevent redirect loops
          setUser(updatedUser)

          const isComplete = updatedUser.perfilCompleto === true

          if (isComplete) {
            logger.log("[ProfileSetup] Profile complete, checking cedula verification")
            // ✅ Clear saved form data after successful update
            localStorage.removeItem('profileSetupFormData')
            // ✅ Use postAuthRedirect to check for cedula verification
            postAuthRedirect(updatedUser)
          } else {
            logger.warn("[ProfileSetup] Profile incomplete - staying on /profile-setup")
            setGeneralError("Por favor completa todos los campos requeridos")
          }
        } else {
          logger.error("[ProfileSetup] Failed to verify profile state:", checkRes)
          throw new Error("No se pudo verificar la actualización. Por favor, intenta nuevamente.")
        }
      }
    } catch (err: any) {
      logger.error("[ProfileSetup] Error saving profile:", err)
      const userMessage = formatErrorMessage(err)
      setGeneralError(userMessage)
      // ⚡ CLEANUP: Remove navigation flag on error
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem('profileSetupNavigating')
      }
    } finally {
      setIsUploading(false)
    }
  }

  const handleBackToLogin = () => {
    AuthService.logout()
    router.replace('/login')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-orange-50 safe-top safe-bottom">
      {/* Header moderno */}
      <div className="bg-white border-b border-gray-100 shadow-sm sticky top-0 z-10 safe-top">
        <div className="max-w-2xl mx-auto px-3 xs:px-4 sm:px-6 py-3 xs:py-4 sm:py-6">
          <div className="relative flex items-center justify-center">
            {/* Botón volver */}
            <button
              type="button"
              onClick={handleBackToLogin}
              className="absolute left-0 p-2 rounded-lg hover:bg-gray-100 active:bg-gray-200 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center touch-manipulation"
              aria-label="Volver a login"
            >
              <ArrowLeft className="w-5 h-5 xs:w-5.5 xs:h-5.5 sm:w-6 sm:h-6 text-gray-600" />
            </button>
            
            <div className="text-center">
              <h1 className="text-lg xs:text-xl sm:text-2xl md:text-3xl font-bold text-gray-900">
                Completa tu perfil
              </h1>
              <p className="text-xs xs:text-sm text-gray-600 mt-1 xs:mt-1.5 sm:mt-2">Un paso más para empezar a jugar</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-3 xs:px-4 sm:px-6 py-3 xs:py-4 sm:py-8 pb-24 xs:pb-28 sm:pb-32">
        <form
          ref={formRef}
          onSubmit={handleSubmit}
          className="space-y-4 xs:space-y-5 sm:space-y-6"
        >
          {/* Foto de perfil - Diseño destacado */}
          <div className="bg-white rounded-xl xs:rounded-2xl sm:rounded-3xl shadow-lg p-3 xs:p-4 sm:p-8 border border-gray-100">
            <div className="flex flex-col items-center text-center">
              <div className="relative group mb-3 xs:mb-3.5 sm:mb-4">
                <Avatar className="w-20 h-20 xs:w-24 xs:h-24 sm:w-32 sm:h-32 border-2 xs:border-3 sm:border-4 border-primary/20 shadow-xl relative overflow-hidden transition-transform active:scale-105">
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
                      <User className="w-10 h-10 xs:w-12 xs:h-12 sm:w-16 sm:h-16 text-gray-400" />
                    </AvatarFallback>
                  )}
                </Avatar>
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    setShowPhotoOptions(!showPhotoOptions)
                  }}
                  className="absolute bottom-0 right-0 bg-primary text-white rounded-full w-10 h-10 sm:w-12 sm:h-12 shadow-lg active:bg-primary/90 transition-all active:scale-110 cursor-pointer flex items-center justify-center"
                >
                  <Camera className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>
                {/* Popover con opciones de foto */}
                {showPhotoOptions && (
                  <div ref={photoOptionsRef} className="absolute bottom-0 right-12 sm:right-14 z-50 bg-white rounded-lg shadow-xl border border-gray-200 overflow-hidden min-w-[160px] animate-in fade-in zoom-in-95 duration-200">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        openCamera()
                      }}
                      className="w-full px-4 py-3 text-left hover:bg-gray-50 active:bg-gray-100 flex items-center gap-3 text-sm font-medium text-gray-700 transition-colors"
                    >
                      <Camera className="w-4 h-4 text-primary" />
                      <span>Cámara</span>
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        fileInputRef.current?.click()
                        setShowPhotoOptions(false)
                      }}
                      className="w-full px-4 py-3 text-left hover:bg-gray-50 active:bg-gray-100 flex items-center gap-3 text-sm font-medium text-gray-700 border-t border-gray-100 transition-colors"
                    >
                      <Upload className="w-4 h-4 text-primary" />
                      <span>Galería</span>
                    </button>
                  </div>
                )}
              </div>
              <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-1">Foto de perfil</h3>
              <p className="text-xs sm:text-sm text-gray-500 mb-2 sm:mb-3 px-2">
                {formData.photo ? "¡Foto cargada! Puedes cambiarla" : "Agrega una foto para que te reconozcan"}
              </p>
              {photoError && (
                <p className="text-xs sm:text-sm text-red-500 mt-2 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  {photoError}
                </p>
              )}
              {/* Input para galería */}
              <input
                ref={fileInputRef}
                id="file-input"
                type="file"
                accept="image/*"
                onChange={handlePhotoChange}
                className="hidden"
              />
              {/* ⚡ Input para cámara - capture="user" para cámara frontal */}
              <input
                ref={cameraInputRef}
                id="camera-input"
                type="file"
                accept="image/*"
                capture="user"
                onChange={handlePhotoChange}
                className="hidden"
              />
            </div>
          </div>

          {/* Información personal */}
          <div className="bg-white rounded-2xl sm:rounded-3xl shadow-lg p-4 sm:p-6 border border-gray-100">
            <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-3 sm:mb-4 flex items-center">
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-primary/10 flex items-center justify-center mr-2 sm:mr-3">
                <span className="text-primary font-bold text-sm sm:text-base">1</span>
              </div>
              Información personal
            </h2>

            <div className="space-y-3 sm:space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <label className="text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-1.5 block">Nombre *</label>
                  <Input
                    placeholder="Juan"
                    value={formData.name}
                    onChange={(e) => handleFieldChange('name', e.target.value)}
                    className={`${fieldErrors.name ? 'border-red-500 focus:ring-red-500' : 'focus:ring-primary'} placeholder:text-gray-300 text-sm sm:text-base h-10 sm:h-auto`}
                    maxLength={50}
                    required
                  />
                  {fieldErrors.name && (
                    <p className="text-xs text-red-500 mt-1">{fieldErrors.name}</p>
                  )}
                </div>
                <div>
                  <label className="text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-1.5 block">Apellido *</label>
                  <Input
                    placeholder="Pérez"
                    value={formData.surname}
                    onChange={(e) => handleFieldChange('surname', e.target.value)}
                    className={`${fieldErrors.surname ? 'border-red-500 focus:ring-red-500' : 'focus:ring-primary'} placeholder:text-gray-300 text-sm sm:text-base h-10 sm:h-auto`}
                    maxLength={50}
                    required
                  />
                  {fieldErrors.surname && (
                    <p className="text-xs text-red-500 mt-1">{fieldErrors.surname}</p>
                  )}
                </div>
              </div>

              <div>
                <label className="text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-1.5 block">Fecha de nacimiento *</label>
                <DateSelector
                  value={formData.fechaNacimiento}
                  onChange={(date) => handleFieldChange('fechaNacimiento', date)}
                  error={fieldErrors.fechaNacimiento}
                  minAge={13}
                  required
                />
              </div>

              <div>
                <label className="text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-1.5 block">Género *</label>
                <div className="relative" ref={generoDropdownRef}>
                  <Button
                    type="button"
                    variant="outline"
                    ref={generoButtonRef}
                    onClick={(e) => {
                      e.preventDefault()
                      setShowGeneroDropdown(!showGeneroDropdown)
                    }}
                    className={`w-full justify-between text-sm sm:text-base h-10 sm:h-auto ${fieldErrors.genero ? 'border-red-500' : ''}`}
                  >
                    <span className={formData.genero ? 'text-gray-900' : 'text-gray-500'}>
                      {formData.genero || "Selecciona tu género"}
                    </span>
                    <ChevronDown className="w-4 h-4 sm:w-5 sm:h-5" />
                  </Button>
                  <DropdownPortal
                    anchorRef={generoButtonRef}
                    open={showGeneroDropdown}
                    minWidth={generoButtonRef.current?.offsetWidth || 200}
                    maxWidth={400}
                    maxHeight={240}
                    onClose={() => setShowGeneroDropdown(false)}
                    className="bg-white border border-gray-300 rounded-xl shadow-xl overflow-y-auto"
                  >
                    <div role="listbox">
                      {generos.map((gen) => (
                        <div
                          key={gen}
                          onClick={() => {
                            handleFieldChange('genero', gen)
                            setShowGeneroDropdown(false)
                          }}
                          className="p-3 hover:bg-primary/10 active:bg-primary/20 cursor-pointer first:rounded-t-xl last:rounded-b-xl transition-colors text-sm sm:text-base whitespace-nowrap"
                        >
                          {gen}
                        </div>
                      ))}
                    </div>
                  </DropdownPortal>
                </div>
                {fieldErrors.genero && (
                  <p className="text-xs text-red-500 mt-1">{fieldErrors.genero}</p>
                )}
              </div>

              <div>
                <label className="text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-1.5 block">Ubicación *</label>
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
          <div className="bg-white rounded-2xl sm:rounded-3xl shadow-lg p-4 sm:p-6 border border-gray-100">
            <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-3 sm:mb-4 flex items-center">
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-orange-100 flex items-center justify-center mr-2 sm:mr-3">
                <span className="text-orange-600 font-bold text-sm sm:text-base">2</span>
              </div>
              Información deportiva
            </h2>

            <div className="space-y-3 sm:space-y-4">
              <div>
                <label className="text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-1.5 block">Posición preferida *</label>
                <div className="relative" ref={positionDropdownRef}>
                  <Button
                    type="button"
                    variant="outline"
                    ref={positionButtonRef}
                    onClick={(e) => {
                      e.preventDefault()
                      setShowPositionDropdown(!showPositionDropdown)
                    }}
                    className={`w-full justify-between text-sm sm:text-base h-10 sm:h-auto ${fieldErrors.position ? 'border-red-500' : ''}`}
                  >
                    <span className={formData.position ? 'text-gray-900' : 'text-gray-500'}>
                      {formData.position || "Selecciona tu posición"}
                    </span>
                    <ChevronDown className="w-4 h-4 sm:w-5 sm:h-5" />
                  </Button>
                  <DropdownPortal
                    anchorRef={positionButtonRef}
                    open={showPositionDropdown}
                    minWidth={positionButtonRef.current?.offsetWidth || 200}
                    maxWidth={400}
                    maxHeight={240}
                    onClose={() => setShowPositionDropdown(false)}
                    className="bg-white border border-gray-300 rounded-xl shadow-xl overflow-y-auto"
                  >
                    <div role="listbox">
                      {positions.map((pos) => (
                        <div
                          key={pos}
                          onClick={() => {
                            handleFieldChange('position', pos)
                            setShowPositionDropdown(false)
                          }}
                          className="p-3 hover:bg-orange-50 active:bg-orange-100 cursor-pointer first:rounded-t-xl last:rounded-b-xl transition-colors text-sm sm:text-base whitespace-nowrap"
                        >
                          {pos}
                        </div>
                      ))}
                    </div>
                  </DropdownPortal>
                </div>
                {fieldErrors.position && (
                  <p className="text-xs text-red-500 mt-1">{fieldErrors.position}</p>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <label className="text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-1.5 block">Altura (cm) *</label>
                  <Input
                    type="number"
                    placeholder="175"
                    value={formData.height}
                    onChange={(e) => handleFieldChange('height', e.target.value)}
                    className={`${fieldErrors.height ? 'border-red-500' : 'focus:ring-orange-500'} placeholder:text-gray-300 text-sm sm:text-base h-10 sm:h-auto`}
                    min="100"
                    max="250"
                    required
                  />
                  {fieldErrors.height && (
                    <p className="text-xs text-red-500 mt-1">{fieldErrors.height}</p>
                  )}
                </div>
                <div>
                  <label className="text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-1.5 block">Peso (kg) *</label>
                  <Input
                    type="number"
                    placeholder="70"
                    value={formData.weight}
                    onChange={(e) => handleFieldChange('weight', e.target.value)}
                    className={`${fieldErrors.weight ? 'border-red-500' : 'focus:ring-orange-500'} placeholder:text-gray-300 text-sm sm:text-base h-10 sm:h-auto`}
                    min="30"
                    max="200"
                    required
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
            <div className="bg-red-50 border border-red-200 rounded-xl sm:rounded-2xl p-3 sm:p-4 flex items-start gap-2 sm:gap-3">
              <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-xs sm:text-sm font-medium text-red-900">{generalError}</p>
              </div>
              <button
                type="button"
                onClick={() => setGeneralError("")}
                className="text-red-400 active:text-red-600"
              >
                <X className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </button>
            </div>
          )}

          {/* Botón de submit - USANDO BUTTON NATIVO PARA DESCARTAR PROBLEMAS CON EL COMPONENTE */}
          <button
            type="submit"
            disabled={isUploading}
            className="w-full bg-primary active:bg-primary/90 text-white py-4 sm:py-6 rounded-xl sm:rounded-2xl text-base sm:text-lg font-semibold shadow-lg active:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isUploading ? (
              <span className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-4 w-4 sm:h-5 sm:w-5 border-b-2 border-white mr-2 sm:mr-3"></div>
                Guardando...
              </span>
            ) : (
              "Completar perfil"
            )}
          </button>
        </form>
      </div>

      {/* Modal de crop MEJORADO - Como Instagram/Facebook */}
      {showCropModal && (
        <div className="fixed inset-0 bg-black flex items-center justify-center z-[100]">
          <div className="w-full h-full sm:w-auto sm:h-auto sm:max-w-[90vw] sm:max-h-[90vh] bg-white sm:rounded-2xl flex flex-col overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between bg-white flex-shrink-0">
              <h3 className="text-base font-semibold text-gray-900">Ajustar foto de perfil</h3>
              <button
                type="button"
                onClick={() => {
                  setShowCropModal(false)
                  setImageToCrop('')
                  setPhotoError('')
                }}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors min-h-[40px] min-w-[40px] flex items-center justify-center"
              >
                <X className="w-5 h-5 text-gray-600" />
              </button>
            </div>

            {photoError && (
              <div className="px-4 py-3 bg-red-50 border-b border-red-100 flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-700 flex-1">{photoError}</p>
              </div>
            )}

            <div className="flex-1 overflow-hidden bg-gray-900 relative" style={{ minHeight: '400px' }}>
              <div className="absolute inset-0 flex items-center justify-center">
                <ReactCrop
                  crop={crop}
                  onChange={(c) => {
                    const size = Math.max(c.width, c.height);
                    setCrop({
                      ...c,
                      width: size,
                      height: size
                    });
                  }}
                  onComplete={(c) => {
                    const size = Math.max(c.width, c.height);
                    setCompletedCrop({
                      ...c,
                      width: size,
                      height: size
                    });
                  }}
                  aspect={1}
                  circularCrop
                  keepSelection
                  minWidth={100}
                  minHeight={100}
                  className="max-h-full"
                >
                  <img
                    ref={imageRef}
                    src={imageToCrop}
                    alt="Recortar"
                    style={{
                      maxHeight: '70vh',
                      maxWidth: '100%',
                      display: 'block'
                    }}
                  />
                </ReactCrop>
              </div>
            </div>

            <div className="p-3 sm:p-4 border-t border-gray-200 flex gap-2 sm:gap-3 bg-white flex-shrink-0">
              <Button
                type="button"
                onClick={() => {
                  setShowCropModal(false)
                  setImageToCrop('')
                }}
                variant="outline"
                className="flex-1 text-sm sm:text-base py-3 sm:py-2.5 touch-manipulation min-h-[48px]"
              >
                Cancelar
              </Button>
              <Button
                type="button"
                onClick={handleCropComplete}
                className="flex-1 bg-primary active:bg-primary/90 text-white text-sm sm:text-base py-3 sm:py-2.5 touch-manipulation min-h-[48px]"
                disabled={!completedCrop || isUploading}
              >
                {isUploading ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Validando...
                  </span>
                ) : (
                  'Aplicar'
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Camera Modal */}
      {showCameraModal && (
        <div className="fixed inset-0 bg-black flex items-center justify-center z-50 p-1 sm:p-2 md:p-4">
          <div className="bg-white rounded-2xl sm:rounded-3xl w-full max-w-[95vw] sm:max-w-[90vw] md:max-w-lg lg:max-w-xl xl:max-w-2xl shadow-2xl flex flex-col overflow-hidden max-h-[95vh]">
            <div className="p-3 sm:p-4 border-b border-gray-200 flex items-center justify-between bg-gradient-to-r from-primary/10 to-orange-50 flex-shrink-0">
              <h3 className="text-base sm:text-lg font-bold text-gray-900">Tomar foto</h3>
              <button
                type="button"
                onClick={stopCamera}
                className="p-2 active:bg-white rounded-lg sm:rounded-xl transition-colors touch-manipulation min-h-[44px] min-w-[44px] flex items-center justify-center"
              >
                <X className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600" />
              </button>
            </div>

            <div className="p-2 sm:p-3 md:p-4 bg-gray-900 flex items-center justify-center relative flex-1 min-h-0">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-auto max-h-[75vh] sm:max-h-[80vh] md:max-h-[85vh] lg:max-h-[90vh] object-contain rounded-lg sm:rounded-xl"
                style={{ transform: 'scaleX(-1)' }} // Unmirror the camera view
              />
              <canvas ref={canvasRef} className="hidden" />

              {/* Camera overlay guide - Responsive sizing */}
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                <div className="w-48 h-48 sm:w-56 sm:h-56 md:w-64 md:h-64 lg:w-72 lg:h-72 xl:w-80 xl:h-80 border-2 border-white/50 rounded-full"></div>
              </div>

              {/* Camera instructions for mobile */}
              <div className="absolute bottom-20 sm:bottom-24 left-1/2 transform -translate-x-1/2 text-center">
                <p className="text-white text-xs sm:text-sm bg-black/50 px-3 py-1 rounded-full backdrop-blur-sm">
                  Ajusta tu cara dentro del círculo
                </p>
              </div>
            </div>

            <div className="p-3 sm:p-4 border-t border-gray-200 flex gap-2 sm:gap-3 bg-white flex-shrink-0">
              <Button
                type="button"
                onClick={stopCamera}
                variant="outline"
                className="flex-1 text-sm sm:text-base py-3 sm:py-2.5 touch-manipulation min-h-[48px]"
              >
                Cancelar
              </Button>
              <Button
                type="button"
                onClick={capturePhoto}
                className="flex-1 bg-primary active:bg-primary/90 text-white text-sm sm:text-base py-3 sm:py-2.5 touch-manipulation min-h-[48px]"
              >
                <Camera className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                Capturar
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default ProfileSetupForm
