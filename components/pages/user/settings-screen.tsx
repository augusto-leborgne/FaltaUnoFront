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
			const blobUrl = ProfileSetupStorage.base64ToBlobUrl(storedData)
			if (blobUrl) {
				setAvatar(blobUrl)
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
			const stream = await navigator.mediaDevices.getUserMedia({
				video: { facingMode: 'user' }
			})
			setCameraStream(stream)
			setShowCameraModal(true)
			if (videoRef.current) {
				videoRef.current.srcObject = stream
			}
		} catch (error) {
			logger.error("[Settings] Error starting camera:", error)
			alert("No se pudo acceder a la cámara")
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
		canvas.width = video.videoWidth
		canvas.height = video.videoHeight
		const ctx = canvas.getContext('2d')
		if (!ctx) return

		ctx.drawImage(video, 0, 0)
		canvas.toBlob((blob) => {
			if (blob) {
				const url = URL.createObjectURL(blob)
				setImageToCrop(url)
				setShowCropModal(true)
				stopCamera()
			}
		}, 'image/jpeg', 0.95)
	}

	const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0]
		if (file) {
			const reader = new FileReader()
			reader.onload = () => {
				setImageToCrop(reader.result as string)
				setShowCropModal(true)
			}
			reader.readAsDataURL(file)
		}
	}

	const handleCropComplete = async () => {
		if (!completedCrop || !imageRef.current) return

		const canvas = document.createElement('canvas')
		const scaleX = imageRef.current.naturalWidth / imageRef.current.width
		const scaleY = imageRef.current.naturalHeight / imageRef.current.height
		canvas.width = completedCrop.width
		canvas.height = completedCrop.height
		const ctx = canvas.getContext('2d')

		if (!ctx) return

		ctx.drawImage(
			imageRef.current,
			completedCrop.x * scaleX,
			completedCrop.y * scaleY,
			completedCrop.width * scaleX,
			completedCrop.height * scaleY,
			0,
			0,
			completedCrop.width,
			completedCrop.height
		)

		canvas.toBlob((blob) => {
			if (blob) {
				const file = new File([blob], 'profile.jpg', { type: 'image/jpeg' })
				setPhotoFile(file)
				const url = URL.createObjectURL(blob)
				setAvatar(url)
				setShowCropModal(false)
				setImageToCrop("")
			}
		}, 'image/jpeg', 0.95)
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
		<div className="min-h-screen bg-white flex flex-col">
			{/* Header */}
			<div className="pt-12 sm:pt-16 pb-4 sm:pb-6 px-4 sm:px-6 border-b border-gray-100">
				<div className="flex items-center justify-between">
					<div className="flex items-center gap-3">
						<button
							onClick={handleBack}
							className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
						>
							<ArrowLeft className="w-5 h-5 text-gray-600" />
						</button>
						<h1 className="text-xl font-bold text-gray-900">Configuración</h1>
					</div>
					<Button
						onClick={handleSave}
						disabled={isSaving || Object.keys(fieldErrors).some(k => fieldErrors[k as keyof typeof fieldErrors])}
						className="bg-green-600 hover:bg-green-700"
					>
						{isSaving ? (
							<>
								<LoadingSpinner size="sm" variant="white" />
								<span className="ml-2">Guardando...</span>
							</>
						) : (
							<>
								<Save className="w-4 h-4 mr-2" />
								Guardar
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

				{/* Profile Photo Section */}
				<div className="bg-white border border-gray-200 rounded-xl sm:rounded-2xl p-4 sm:p-6 mb-4 sm:mb-6">
					<h3 className="text-base sm:text-lg font-bold text-gray-900 mb-4">Foto de perfil</h3>
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
								className="absolute bottom-0 right-0 p-2 bg-green-600 hover:bg-green-700 text-white rounded-full shadow-lg transition-colors"
							>
								<Camera className="w-4 h-4" />
							</button>
						</div>

						{showPhotoOptions && (
							<div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
								<Button
									onClick={() => fileInputRef.current?.click()}
									variant="outline"
									className="flex items-center gap-2"
								>
									<Upload className="w-4 h-4" />
									Subir foto
								</Button>
								<Button
									onClick={startCamera}
									variant="outline"
									className="flex items-center gap-2"
								>
									<Camera className="w-4 h-4" />
									Tomar foto
								</Button>
								{avatar && (
									<Button
										onClick={() => {
											setAvatar("")
											setPhotoFile(null)
										}}
										variant="outline"
										className="flex items-center gap-2 text-red-600 hover:text-red-700"
									>
										<X className="w-4 h-4" />
										Eliminar
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

				{/* Personal Information */}
				<div className="bg-white border border-gray-200 rounded-xl sm:rounded-2xl p-4 sm:p-6 mb-4 sm:mb-6">
					<h3 className="text-base sm:text-lg font-bold text-gray-900 mb-4">Información personal</h3>
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

				{/* Football Profile */}
				<div className="bg-white border border-gray-200 rounded-xl sm:rounded-2xl p-4 sm:p-6 mb-4 sm:mb-6">
					<h3 className="text-base sm:text-lg font-bold text-gray-900 mb-4">Perfil futbolístico</h3>
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

				{/* Notification Preferences */}
				<div className="bg-white border border-gray-200 rounded-xl sm:rounded-2xl p-4 sm:p-6 mb-4 sm:mb-6">
					<div className="flex items-center gap-2 mb-4">
						<Bell className="w-5 h-5 text-gray-600" />
						<h3 className="text-base sm:text-lg font-bold text-gray-900">Notificaciones</h3>
					</div>
					<div className="space-y-3">
						{Object.entries(notificationPreferences).map(([key, value]) => (
							<div key={key} className="flex items-center justify-between py-2">
								<span className="text-sm text-gray-700">
									{key === "matchInvitations" && "Invitaciones a partidos"}
									{key === "friendRequests" && "Solicitudes de amistad"}
									{key === "matchUpdates" && "Actualizaciones de partidos"}
									{key === "reviewRequests" && "Solicitudes de reseñas"}
									{key === "newMessages" && "Nuevos mensajes"}
									{key === "generalUpdates" && "Actualizaciones generales"}
								</span>
								<button
									onClick={() => handleNotificationToggle(key as keyof typeof notificationPreferences)}
									className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${value ? "bg-green-600" : "bg-gray-300"
										}`}
								>
									<span
										className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${value ? "translate-x-6" : "translate-x-1"
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
				<div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
					<div className="bg-white rounded-2xl p-6 max-w-md w-full">
						<h3 className="text-lg font-bold mb-4">Tomar foto</h3>
						<video
							ref={videoRef}
							autoPlay
							playsInline
							className="w-full rounded-lg mb-4"
						/>
						<canvas ref={canvasRef} className="hidden" />
						<div className="flex gap-2">
							<Button onClick={capturePhoto} className="flex-1 bg-green-600 hover:bg-green-700">
								<Camera className="w-4 h-4 mr-2" />
								Capturar
							</Button>
							<Button onClick={stopCamera} variant="outline" className="flex-1">
								Cancelar
							</Button>
						</div>
					</div>
				</div>
			)}

			{/* Crop Modal */}
			{showCropModal && imageToCrop && (
				<div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
					<div className="bg-white rounded-2xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
						<h3 className="text-lg font-bold mb-4">Ajustar foto</h3>
						<div className="mb-4">
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
									alt="Crop"
									className="max-w-full"
								/>
							</ReactCrop>
						</div>
						<div className="flex gap-2">
							<Button onClick={handleCropComplete} className="flex-1 bg-green-600 hover:bg-green-700">
								Confirmar
							</Button>
							<Button
								onClick={() => {
									setShowCropModal(false)
									setImageToCrop("")
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
