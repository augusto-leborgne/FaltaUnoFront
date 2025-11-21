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

	// ...rest of the component, including crop/camera/delete logic and UI, with phone field and logic removed...
}
