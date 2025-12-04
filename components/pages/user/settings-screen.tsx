// components/pages/user/settings-screen.tsx - VERSIÓN MEJORADA SIN TELÉFONO
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
	const imageRef = useRef<HTMLImageElement | null>(null)
	const [showPhotoOptions, setShowPhotoOptions] = useState(false)
	const [formData, setFormData] = useState({
		name: "",
		surname: "",
		email: "",
		position: "",
		height: "",
		weight: "",
	})
	// Guardar datos originales para detectar cambios reales
	const [originalFormData, setOriginalFormData] = useState({
		position: "",
		height: "",
		weight: "",
	})
	const [avatar, setAvatar] = useState<string>("")
	const [photoFile, setPhotoFile] = useState<File | null>(null)
	// Camera states
	const [showCameraModal, setShowCameraModal] = useState(false)
	const [cameraStream, setCameraStream] = useState<MediaStream | null>(null)
	const videoRef = useRef<HTMLVideoElement | null>(null)
	const canvasRef = useRef<HTMLCanvasElement | null>(null)
	const [notificationPreferences, setNotificationPreferences] = useState({
		matchInvitations: true,
		friendRequests: true,
		matchUpdates: true,
		reviewRequests: true,
		newMessages: true,
		generalUpdates: false,
	})
	// Validación en tiempo real
	const [fieldErrors, setFieldErrors] = useState<{
		height?: string
		weight?: string
	}>({})
	// Image crop states
	const [showCropModal, setShowCropModal] = useState(false)
	const [imageToCrop, setImageToCrop] = useState<string>("")
	const [crop, setCrop] = useState<Crop>({
		unit: '%',
		width: 70,
		height: 70,
		x: 15,
		y: 15
	})
	const [completedCrop, setCompletedCrop] = useState<Crop | null>(null)

	useEffect(() => {
		loadUserData()
		loadNotificationPreferences()
		// Check for stored data from photo navigation
		const storedData = ProfileSetupStorage.load()
		if (storedData) {
			// ⚡ FIX: Use base64 data directly, not blob URL (prevents ERR_INVALID_URL)
			if (storedData.photoBase64) {
				setAvatar(storedData.photoBase64)
				logger.log("[Settings] Photo restored from storage (base64)")
			}
			if (storedData.photoFile) {
				const file = ProfileSetupStorage.base64ToFile(storedData.photoFile)
				if (file) {
					setPhotoFile(file)
					logger.log("[Settings] Photo file restored from storage")
				}
			}
		}
	}, [])

	const loadUserData = async () => {
		try {
			let user = await AuthService.fetchCurrentUser()
			if (!user) {
				router.push("/login")
				return
			}
			if (user.foto_perfil) {
				setAvatar(user.foto_perfil)
			}
			setFormData({
				name: user.nombre || "",
				surname: user.apellido || "",
				email: user.email || "",
				position: user.posicion || "",
				height: user.altura?.toString() || "",
				weight: user.peso?.toString() || "",
			})
			setOriginalFormData({
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

	const validateField = (field: string, value: any): string | null => {
		switch (field) {
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

	const handleInputChange = (field: keyof typeof formData, value: string) => {
		setFormData((prev) => ({ ...prev, [field]: value }))
		if (field === 'height' || field === 'weight') {
			const fieldError = validateField(field, value)
			setFieldErrors(prev => ({ ...prev, [field]: fieldError || undefined }))
		}
	}

	const handleNotificationToggle = async (field: keyof typeof notificationPreferences) => {
		// Update local state immediately for instant feedback
		const newValue = !notificationPreferences[field]
		setNotificationPreferences((prev) => ({ ...prev, [field]: newValue }))

		// Auto-save to backend
		try {
			logger.log(`[Settings] Auto-saving notification preference: ${field} = ${newValue}`)
			const { NotificationPreferencesAPI } = await import('@/lib/api')
			const updatedPrefs = { ...notificationPreferences, [field]: newValue }
			await NotificationPreferencesAPI.update(updatedPrefs)
			logger.log(`[Settings] Notification preference saved successfully`)
		} catch (error) {
			logger.error('[Settings] Error saving notification preference:', error)
			// Revert on error
			setNotificationPreferences((prev) => ({ ...prev, [field]: !newValue }))
			setError('Error al guardar preferencia de notificación')
			setTimeout(() => setError(''), 3000)
		}
	}

	const handleBack = () => router.back()

	const handleSave = async () => {
		setIsSaving(true)
		setError("")
		setSuccess(false)
		try {
			logger.log("[Settings] Guardando cambios...")
			let hasProfileChanges = false
			// 1. Subir foto si hay una nueva
			if (photoFile) {
				logger.log("[Settings] Subiendo foto...")
				const success = await AuthService.updateProfilePhoto(photoFile)
				if (!success) {
					throw new Error("Error al subir la foto")
				}
				logger.log("[Settings] Foto subida exitosamente")
				const currentUser = AuthService.getUser()
				if (currentUser?.id) {
					PhotoCache.invalidate(currentUser.id)
					logger.log("[Settings] Cache de foto invalidado")
				}
				hasProfileChanges = true
			}
			// 2. Actualizar perfil SOLO si hay cambios REALES en los campos editables
			const perfilData: Record<string, any> = {}
			if (formData.position && formData.position !== originalFormData.position) {
				perfilData.posicion = formData.position
			}
			if (formData.height && formData.height !== originalFormData.height) {
				perfilData.altura = parseInt(formData.height)
			}
			if (formData.weight && formData.weight !== originalFormData.weight) {
				perfilData.peso = parseInt(formData.weight)
			}
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
					await new Promise(resolve => setTimeout(resolve, 500))
					const newPhoto = await PhotoCache.getPhoto(currentUser.id)
					if (newPhoto) {
						setAvatar(newPhoto)
						setPhotoFile(null)
						logger.log("[Settings] Avatar actualizado con nueva foto")
					}
				}
			}
			setSuccess(true)
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


	// Camera functions
	const startCamera = async () => {
		try {
			logger.log("[Settings] Requesting camera access...")
			const stream = await navigator.mediaDevices.getUserMedia({
				video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } }
			})
			logger.log("[Settings] Camera access granted, stream obtained")

			setCameraStream(stream)
			setShowCameraModal(true)

			// ⚡ FIX: Wait for modal to render before setting video source
			await new Promise(resolve => setTimeout(resolve, 100))

			if (videoRef.current) {
				videoRef.current.srcObject = stream
				// Wait for video to be ready
				await videoRef.current.play()
				logger.log("[Settings] Video stream connected and playing")
			} else {
				logger.error("[Settings] Video ref not available after delay")
			}
		} catch (error) {
			logger.error("[Settings] Error starting camera:", error)
			const errorMessage = error instanceof Error ? error.message : "Error desconocido"
			if (errorMessage.includes('Permission')) {
				setError("Permiso de cámara denegado. Por favor, permite el acceso a la cámara en la configuración del navegador.")
			} else {
				setError("No se pudo acceder a la cámara. Verifica que esté conectada y no la esté usando otra aplicación.")
			}
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
		if (!videoRef.current || !canvasRef.current) {
			logger.error("[Settings] Video or canvas ref not available")
			return
		}

		const video = videoRef.current
		const canvas = canvasRef.current

		if (video.videoWidth === 0 || video.videoHeight === 0) {
			logger.error("[Settings] Video not ready")
			setError("La cámara no está lista, por favor intenta de nuevo")
			return
		}

		canvas.width = video.videoWidth
		canvas.height = video.videoHeight
		const ctx = canvas.getContext('2d')
		if (!ctx) {
			logger.error("[Settings] Could not get canvas context")
			return
		}

		logger.log("[Settings] Capturing photo from camera")
		ctx.drawImage(video, 0, 0)
		canvas.toBlob((blob) => {
			if (blob) {
				logger.log("[Settings] Photo captured, showing crop modal")
				const url = URL.createObjectURL(blob)
				setImageToCrop(url)
				// Initialize crop to centered position
				setCrop({
					unit: '%',
					width: 50,
					height: 50,
					x: 25,
					y: 25
				})
				setCompletedCrop(null)
				setShowCropModal(true)
				stopCamera()
			} else {
				logger.error("[Settings] Failed to create blob from canvas")
				setError("Error al capturar la foto")
			}
		}, 'image/jpeg', 0.95)
	}

	const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0]
		if (!file) return

		logger.log("[Settings] File selected:", file.name, file.type, file.size)

		// Validate file type
		if (!file.type.startsWith('image/')) {
			setError("Por favor selecciona una imagen válida")
			return
		}

		// Validate file size (30MB max, like Instagram)
		const MAX_SIZE = 30 * 1024 * 1024
		if (file.size > MAX_SIZE) {
			setError("La imagen no puede superar 30MB")
			return
		}

		// ✅ NEW: Validate photo with Google Cloud Vision API
		setError("")
		setIsSaving(true)

		try {
			logger.log('[Settings] Validating photo...', file.name)
			const { PhotoValidationAPI } = await import('@/lib/api')
			const validationResult = await PhotoValidationAPI.validate(file)

			if (!validationResult.valid) {
				logger.warn('[Settings] Photo validation failed:', validationResult.message)

				// Provide specific error messages
				if (validationResult.faceCount === 0) {
					setError("No se detectó ningún rostro en la foto. Por favor sube una foto donde se vea tu rostro claramente")
				} else if (validationResult.faceCount > 1) {
					setError(`Se detectaron ${validationResult.faceCount} rostros. Por favor sube una foto con una sola persona`)
				} else if (!validationResult.isAppropriate) {
					setError("La foto contiene contenido inapropiado. Por favor elige otra imagen")
				} else {
					setError(validationResult.message || "La foto no cumple con los requisitos")
				}

				setIsSaving(false)
				e.target.value = '' // Reset input
				return
			}

			logger.log('[Settings] Photo validated successfully')
		} catch (error) {
			logger.error('[Settings] Error validating photo:', error)
			// Allow upload if validation fails (graceful degradation)
			logger.warn('[Settings] Proceeding with upload despite validation error')
		}

		setIsSaving(false)

		const reader = new FileReader()
		reader.onload = () => {
			logger.log("[Settings] Image loaded, showing crop modal")
			setImageToCrop(reader.result as string)
			// Initialize crop to centered position
			setCrop({
				unit: '%',
				width: 50,
				height: 50,
				x: 25,
				y: 25
			})
			setCompletedCrop(null)
			setShowCropModal(true)
		}
		reader.onerror = () => {
			logger.error("[Settings] Error reading file")
			setError("Error al leer la imagen")
		}
		reader.readAsDataURL(file)
		e.target.value = '' // Reset input
	}

	const handleCropComplete = async () => {
		if (!completedCrop || !imageRef.current) {
			logger.error("[Settings] Missing crop or image ref")
			return
		}

		const canvas = document.createElement('canvas')
		const scaleX = imageRef.current.naturalWidth / imageRef.current.width
		const scaleY = imageRef.current.naturalHeight / imageRef.current.height
		const ctx = canvas.getContext('2d')

		if (!ctx) {
			logger.error("[Settings] Could not get canvas context")
			return
		}

		// Resize to 400x400 for optimal quality and file size
		const targetSize = 400
		canvas.width = targetSize
		canvas.height = targetSize

		logger.log("[Settings] Cropping image with dimensions:", {
			cropX: completedCrop.x,
			cropY: completedCrop.y,
			cropWidth: completedCrop.width,
			cropHeight: completedCrop.height,
			scaleX,
			scaleY
		})

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
			if (blob) {
				logger.log("[Settings] Cropped image created, size:", blob.size)
				const file = new File([blob], 'profile.jpg', { type: 'image/jpeg' })
				setPhotoFile(file)
				const url = URL.createObjectURL(blob)
				setAvatar(url)
				setShowCropModal(false)
				setImageToCrop("")
				setError("") // Clear any previous errors
			} else {
				logger.error("[Settings] Failed to create blob from cropped image")
				setError("Error al procesar la imagen")
			}
		}, 'image/jpeg', 0.92)
	}

	const handleDeleteAccount = async () => {
		if (deleteConfirmText !== "ELIMINAR") {
			alert("Por favor escribe ELIMINAR para confirmar")
			return
		}

		setIsDeleting(true)
		try {
			// TODO: Implement deleteAccount in AuthService
			// const success = await AuthService.deleteAccount()
			// For now, just logout
			alert("Funcionalidad de eliminación de cuenta pendiente de implementación")
			AuthService.logout()
		} catch (error) {
			logger.error("[Settings] Error deleting account:", error)
			alert("Error al eliminar la cuenta")
		} finally {
			setIsDeleting(false)
			setShowDeleteConfirm(false)
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
		<div className="min-h-screen bg-white flex flex-col pb-24 sm:pb-24">
			{/* Header */}
			<div className="pt-12 sm:pt-16 pb-4 sm:pb-6 px-4 sm:px-6 border-b border-gray-100">
				<div className="flex items-center justify-between gap-2 sm:gap-3">
					<div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
						<button
							onClick={handleBack}
							className="p-2 sm:p-2.5 hover:bg-gray-100 active:bg-gray-200 rounded-xl transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center touch-manipulation active:scale-95"
						>
							<ArrowLeft className="w-5 h-5 sm:w-6 sm:h-6 text-gray-600" />
						</button>
						<h1 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 truncate">Configuración</h1>
					</div>
					<Button
						onClick={handleSave}
						disabled={isSaving || Object.keys(fieldErrors).some(k => fieldErrors[k as keyof typeof fieldErrors])}
						className="bg-green-600 hover:bg-green-700 active:bg-green-800 min-h-[48px] px-4 sm:px-6 text-sm sm:text-base font-semibold shadow-lg hover:shadow-xl touch-manipulation active:scale-95 flex items-center gap-2 whitespace-nowrap flex-shrink-0"
					>
						{isSaving ? (
							<>
								<LoadingSpinner size="sm" variant="white" />
								<span>Guardando...</span>
							</>
						) : (
							<>
								<Save className="w-5 h-5" />
								<span className="hidden sm:inline">Guardar</span>
							</>
						)}
					</Button>
				</div>
			</div>

			<div className="flex-1 px-4 sm:px-6 py-4 sm:py-6 overflow-y-auto pb-24">
				{/* Success Message */}
				{success && (
					<div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-xl text-green-800">
						✅ Cambios guardados exitosamente
					</div>
				)}

				{/* Error Message */}
				{error && (
					<div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl text-red-800 flex items-start gap-2">
						<AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
						<span>{error}</span>
					</div>
				)}

				{/* Profile Photo Section - MODERNIZED */}
				<div className="bg-gradient-to-br from-white to-gray-50 border-2 border-gray-200 rounded-2xl sm:rounded-3xl p-5 sm:p-8 mb-5 sm:mb-6 shadow-lg hover:shadow-xl transition-shadow">
					<div className="flex items-center gap-2 sm:gap-3 mb-5 sm:mb-6">
						<div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl sm:rounded-2xl flex items-center justify-center shadow-md">
							<Camera className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
						</div>
						<h3 className="text-lg sm:text-xl md:text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">Foto de perfil</h3>
					</div>
					<div className="flex flex-col items-center gap-4">
						<div className="relative">
							<UserAvatar
								photo={avatar}
								name={formData.name}
								surname={formData.surname}
								className="w-24 h-24 sm:w-32 sm:h-32"
							/>
							<button
								onClick={() => setShowPhotoOptions(!showPhotoOptions)}
								className="absolute bottom-0 right-0 p-2 bg-green-600 hover:bg-green-700 active:bg-green-800 text-white rounded-full shadow-lg hover:shadow-xl transition-all active:scale-95 flex items-center justify-center"
							>
								<Camera className="w-4 h-4" />
							</button>
						</div>

						{showPhotoOptions && (
							<div className="flex flex-col gap-2 w-full">
								<Button
									onClick={() => fileInputRef.current?.click()}
									variant="outline"
									className="flex items-center justify-center gap-2 min-h-[48px] w-full"
								>
									<Upload className="w-5 h-5" />
									<span>Subir foto</span>
								</Button>
								<Button
									onClick={startCamera}
									variant="outline"
									className="flex items-center justify-center gap-2 min-h-[48px] w-full"
								>
									<Camera className="w-5 h-5" />
									<span>Tomar foto</span>
								</Button>
								{avatar && (
									<Button
										onClick={() => {
											setAvatar("")
											setPhotoFile(null)
										}}
										variant="outline"
										className="flex items-center justify-center gap-2 text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200 min-h-[48px] w-full"
									>
										<X className="w-5 h-5" />
										<span>Eliminar foto</span>
									</Button>
								)}
							</div>
						)}

						<input
							ref={fileInputRef}
							type="file"
							accept="image/*"
							onChange={handleFileSelect}
							className="hidden"
						/>
						<input
							ref={cameraInputRef}
							type="file"
							accept="image/*"
							capture="user"
							onChange={handleFileSelect}
							className="hidden"
						/>
					</div>
				</div>

				{/* Personal Information - MODERNIZED */}
				<div className="bg-gradient-to-br from-white to-gray-50 border-2 border-gray-200 rounded-2xl sm:rounded-3xl p-5 sm:p-8 mb-5 sm:mb-6 shadow-lg hover:shadow-xl transition-shadow">
					<div className="flex items-center gap-2 sm:gap-3 mb-5 sm:mb-6">
						<div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl sm:rounded-2xl flex items-center justify-center shadow-md">
							<svg className="w-5 h-5 sm:w-6 sm:h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
							</svg>
						</div>
						<h3 className="text-lg sm:text-xl md:text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">Información personal</h3>
					</div>
					<div className="space-y-4">
						<div>
							<Label htmlFor="name">Nombre</Label>
							<Input
								id="name"
								value={formData.name}
								disabled
								className="bg-gray-50"
							/>
							<p className="text-xs text-gray-500 mt-1">No se puede modificar</p>
						</div>

						<div>
							<Label htmlFor="surname">Apellido</Label>
							<Input
								id="surname"
								value={formData.surname}
								disabled
								className="bg-gray-50"
							/>
							<p className="text-xs text-gray-500 mt-1">No se puede modificar</p>
						</div>

						<div>
							<Label htmlFor="email">Email</Label>
							<Input
								id="email"
								type="email"
								value={formData.email}
								disabled
								className="bg-gray-50"
							/>
							<p className="text-xs text-gray-500 mt-1">
								{authMethod === "google" ? "Autenticado con Google" : "No se puede modificar"}
							</p>
						</div>
					</div>
				</div>

				{/* Football Profile - MODERNIZED */}
				<div className="bg-gradient-to-br from-white to-green-50 border-2 border-green-200 rounded-2xl sm:rounded-3xl p-5 sm:p-8 mb-5 sm:mb-6 shadow-lg hover:shadow-xl transition-shadow">
					<div className="flex items-center gap-2 sm:gap-3 mb-5 sm:mb-6">
						<div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-xl sm:rounded-2xl flex items-center justify-center shadow-md">
							<svg className="w-5 h-5 sm:w-6 sm:h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
								<path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z" />
							</svg>
						</div>
						<h3 className="text-lg sm:text-xl md:text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">Perfil futbolístico</h3>
					</div>
					<div className="space-y-4">
						<div>
							<Label htmlFor="position">Posición preferida</Label>
							<select
								id="position"
								value={formData.position}
								onChange={(e) => handleInputChange("position", e.target.value)}
								className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
							>
								<option value="">Seleccionar posición</option>
								{positions.map((pos) => (
									<option key={pos} value={pos}>
										{pos}
									</option>
								))}
							</select>
						</div>

						<div>
							<Label htmlFor="height">Altura (cm)</Label>
							<Input
								id="height"
								type="number"
								value={formData.height}
								onChange={(e) => handleInputChange("height", e.target.value)}
								placeholder="170"
								min="100"
								max="250"
							/>
							{fieldErrors.height && (
								<p className="text-xs text-red-600 mt-1">{fieldErrors.height}</p>
							)}
						</div>

						<div>
							<Label htmlFor="weight">Peso (kg)</Label>
							<Input
								id="weight"
								type="number"
								value={formData.weight}
								onChange={(e) => handleInputChange("weight", e.target.value)}
								placeholder="70"
								min="30"
								max="200"
							/>
							{fieldErrors.weight && (
								<p className="text-xs text-red-600 mt-1">{fieldErrors.weight}</p>
							)}
						</div>
					</div>
				</div>

				{/* Notification Preferences - MODERNIZED */}
				<div className="bg-gradient-to-br from-white to-blue-50 border-2 border-blue-200 rounded-2xl sm:rounded-3xl p-5 sm:p-8 mb-5 sm:mb-6 shadow-lg hover:shadow-xl transition-shadow">
					<div className="flex items-center gap-2 sm:gap-3 mb-5 sm:mb-6">
						<div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl sm:rounded-2xl flex items-center justify-center shadow-md">
							<Bell className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
						</div>
						<h3 className="text-lg sm:text-xl md:text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">Notificaciones</h3>
					</div>
					<div className="space-y-4">
						{Object.entries(notificationPreferences).map(([key, value]) => (
							<div key={key} className="flex items-center justify-between py-3 sm:py-4 min-h-[56px] px-4 sm:px-5 bg-white rounded-xl hover:bg-gray-50 transition-colors border border-gray-100">
								<span className="text-sm sm:text-base text-gray-800 font-medium">
									{key === "matchInvitations" && "Invitaciones a partidos"}
									{key === "friendRequests" && "Solicitudes de amistad"}
									{key === "matchUpdates" && "Actualizaciones de partidos"}
									{key === "reviewRequests" && "Solicitudes de reseñas"}
									{key === "newMessages" && "Nuevos mensajes"}
									{key === "generalUpdates" && "Actualizaciones generales"}
								</span>
								<button
									onClick={() => handleNotificationToggle(key as keyof typeof notificationPreferences)}
									className={`relative inline-flex h-8 w-14 sm:h-9 sm:w-16 items-center rounded-full transition-all duration-300 touch-manipulation active:scale-95 shadow-inner ${value ? "bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700" : "bg-gray-300 hover:bg-gray-400"
										}`}
								>
									<span
										className={`inline-block h-6 w-6 sm:h-7 sm:w-7 transform rounded-full bg-white transition-all duration-300 shadow-lg ${value ? "translate-x-7 sm:translate-x-8 scale-110" : "translate-x-1 scale-100"
											}`}
									/>
								</button>
							</div>
						))}
					</div>
				</div>

				{/* Danger Zone */}
				<div className="bg-white border border-red-200 rounded-xl sm:rounded-2xl p-4 sm:p-6 mb-4 sm:mb-6">
					<div className="flex items-center gap-2 mb-4">
						<AlertCircle className="w-5 h-5 text-red-600" />
						<h3 className="text-base sm:text-lg font-bold text-red-600">Zona de peligro</h3>
					</div>
					<p className="text-sm text-gray-600 mb-4">
						Una vez que elimines tu cuenta, no hay vuelta atrás. Por favor, está seguro.
					</p>
					<Button
						onClick={() => setShowDeleteConfirm(true)}
						variant="destructive"
						className="w-full"
					>
						<Trash2 className="w-4 h-4 mr-2" />
						Eliminar cuenta
					</Button>
				</div>
			</div>

			{/* Camera Modal */}
			{showCameraModal && (
				<div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50">
					<div className="w-full h-full sm:h-auto sm:max-w-lg sm:rounded-2xl bg-black sm:bg-white overflow-hidden flex flex-col">
						<div className="p-4 border-b border-gray-700 sm:border-gray-200 flex items-center justify-between bg-black sm:bg-white flex-shrink-0">
							<h3 className="text-lg font-bold text-white sm:text-gray-900">Tomar foto</h3>
							<button
								onClick={stopCamera}
								className="p-2 hover:bg-gray-800 sm:hover:bg-gray-100 rounded-xl transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
							>
								<X className="w-5 h-5 text-white sm:text-gray-600" />
							</button>
						</div>
						<div className="flex-1 bg-black flex items-center justify-center relative p-4">
							<video
								ref={videoRef}
								autoPlay
								playsInline
								muted
								className="w-full h-auto max-h-[70vh] object-contain rounded-lg"
							/>
							<canvas ref={canvasRef} className="hidden" />
							{/* Visual guide overlay */}
							<div className="absolute inset-0 flex items-center justify-center pointer-events-none">
								<div className="w-64 h-64 sm:w-72 sm:h-72 border-4 border-white/50 rounded-full"></div>
							</div>
							{/* Instructions */}
							<div className="absolute bottom-20 left-1/2 transform -translate-x-1/2 text-center">
								<p className="text-white text-sm bg-black/50 px-4 py-2 rounded-full backdrop-blur-sm">
									Ajusta tu cara dentro del círculo
								</p>
							</div>
						</div>
						<div className="p-4 bg-black sm:bg-white flex gap-3">
							<Button
								onClick={capturePhoto}
								className="flex-1 bg-green-600 hover:bg-green-700 min-h-[48px] text-base"
							>
								<Camera className="w-5 h-5 mr-2" />
								Capturar
							</Button>
							<Button
								onClick={stopCamera}
								variant="outline"
								className="flex-1 min-h-[48px] text-base border-gray-600 text-gray-300 sm:text-gray-900 sm:border-gray-300"
							>
								Cancelar
							</Button>
						</div>
					</div>
				</div>
			)}

			{/* Crop Modal */}
			{showCropModal && imageToCrop && (
				<div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50">
					<div className="w-full h-full sm:h-auto sm:max-w-2xl sm:rounded-2xl bg-white overflow-hidden flex flex-col max-h-screen">
						<div className="p-4 border-b border-gray-200 flex items-center justify-between flex-shrink-0">
							<h3 className="text-base sm:text-lg font-bold text-gray-900">Ajustar foto</h3>
							<button
								onClick={() => {
									setShowCropModal(false)
									setImageToCrop("")
								}}
								className="p-2 hover:bg-gray-100 rounded-xl transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
							>
								<X className="w-5 h-5 text-gray-600" />
							</button>
						</div>
						<div className="flex-1 overflow-hidden p-4 sm:p-6 flex items-center justify-center bg-gray-50">
							<div className="relative w-full" style={{ maxHeight: '500px', height: '500px' }}>
								<div className="w-full h-full flex items-center justify-center">
									<ReactCrop
										crop={crop}
										onChange={(c) => {
											// Enforce circular aspect ratio by keeping width and height equal
											const size = Math.max(c.width, c.height);
											setCrop({
												...c,
												width: size,
												height: size
											});
										}}
										onComplete={(c) => {
											// Ensure completed crop is also circular
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
										minWidth={120}
										minHeight={120}
										className="max-w-full max-h-full"
										style={{ maxHeight: '500px' }}
									>
										<img
											ref={imageRef}
											src={imageToCrop}
											alt="Crop"
											className="max-w-full max-h-full"
											style={{ maxHeight: '500px', width: 'auto', height: 'auto', objectFit: 'contain' }}
										/>
									</ReactCrop>
								</div>
							</div>
						</div>
						<div className="p-4 bg-white border-t border-gray-200 flex gap-3 flex-shrink-0">
							<Button
								onClick={handleCropComplete}
								className="flex-1 bg-green-600 hover:bg-green-700 min-h-[48px] text-base"
							>
								Confirmar
							</Button>
							<Button
								onClick={() => {
									setShowCropModal(false)
									setImageToCrop("")
								}}
								variant="outline"
								className="flex-1 min-h-[48px] text-base"
							>
								Cancelar
							</Button>
						</div>
					</div>
				</div>
			)}

			{/* Delete Confirmation Modal */}
			{showDeleteConfirm && (
				<div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
					<div className="bg-white rounded-2xl p-6 max-w-md w-full">
						<div className="flex items-center gap-2 mb-4">
							<AlertCircle className="w-6 h-6 text-red-600" />
							<h3 className="text-lg font-bold text-red-600">Eliminar cuenta</h3>
						</div>
						<p className="text-sm text-gray-600 mb-4">
							Esta acción es permanente y no se puede deshacer. Todos tus datos serán eliminados.
						</p>
						<p className="text-sm text-gray-900 mb-2 font-medium">
							Escribe <span className="font-bold text-red-600">ELIMINAR</span> para confirmar:
						</p>
						<Input
							value={deleteConfirmText}
							onChange={(e) => setDeleteConfirmText(e.target.value)}
							placeholder="ELIMINAR"
							className="mb-4"
						/>
						<div className="flex gap-2">
							<Button
								onClick={handleDeleteAccount}
								disabled={isDeleting || deleteConfirmText !== "ELIMINAR"}
								variant="destructive"
								className="flex-1"
							>
								{isDeleting ? (
									<>
										<LoadingSpinner size="sm" variant="white" />
										<span className="ml-2">Eliminando...</span>
									</>
								) : (
									"Eliminar cuenta"
								)}
							</Button>
							<Button
								onClick={() => {
									setShowDeleteConfirm(false)
									setDeleteConfirmText("")
								}}
								variant="outline"
								className="flex-1"
							>
								Cancelar
							</Button>
						</div>
					</div>
				</div>
			)}
		</div>
	)
}
