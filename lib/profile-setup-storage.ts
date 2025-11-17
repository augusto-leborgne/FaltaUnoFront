/**
 * Helper para guardar y recuperar datos del formulario de profile-setup
 * Permite volver desde phone-verification con los datos preservados
 */

export interface ProfileSetupData {
  name: string
  surname: string
  phone: string
  countryCode: string
  fechaNacimiento: string
  genero: string
  position: string
  height: string
  weight: string
  address: string
  placeDetails: google.maps.places.PlaceResult | null
  photoFile?: {
    data: string // base64 encoded image data
    type: string // mime type
    name: string // original filename
  }
  photoPreviewUrl?: string // legacy support
}

const STORAGE_KEY = 'profile_setup_draft'

export const ProfileSetupStorage = {
  /**
   * Convierte un File a base64 para almacenamiento
   */
  fileToBase64(file: File): Promise<{ data: string; type: string; name: string }> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => {
        if (reader.result) {
          resolve({
            data: reader.result as string,
            type: file.type,
            name: file.name
          })
        } else {
          reject(new Error('Failed to read file'))
        }
      }
      reader.onerror = () => reject(reader.error)
      reader.readAsDataURL(file)
    })
  },

  /**
   * Convierte datos base64 de vuelta a blob URL
   */
  base64ToBlobUrl(data: ProfileSetupData): string | null {
    if (data.photoFile) {
      return data.photoFile.data // Ya es un data URL completo
    }
    if (data.photoPreviewUrl) {
      return data.photoPreviewUrl // Legacy support
    }
    return null
  },

  /**
   * Convierte datos base64 de vuelta a File object
   */
  base64ToFile(photoFile: { data: string; type: string; name: string }): File {
    // Convertir data URL a blob
    const arr = photoFile.data.split(',')
    const mime = arr[0].match(/:(.*?);/)?.[1] || photoFile.type
    const bstr = atob(arr[1])
    let n = bstr.length
    const u8arr = new Uint8Array(n)
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n)
    }
    const blob = new Blob([u8arr], { type: mime })
    return new File([blob], photoFile.name, { type: mime })
  },
  /**
   * Guarda los datos del formulario en sessionStorage
   */
  save(data: ProfileSetupData): void {
    try {
      if (typeof window !== 'undefined') {
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(data))
      }
    } catch (error) {
      console.error('[ProfileSetupStorage] Error saving data:', error)
    }
  },

  /**
   * Recupera los datos guardados del formulario
   */
  load(): ProfileSetupData | null {
    try {
      if (typeof window !== 'undefined') {
        const data = sessionStorage.getItem(STORAGE_KEY)
        if (data) {
          return JSON.parse(data)
        }
      }
    } catch (error) {
      console.error('[ProfileSetupStorage] Error loading data:', error)
    }
    return null
  },

  /**
   * Limpia los datos guardados
   */
  clear(): void {
    try {
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem(STORAGE_KEY)
      }
    } catch (error) {
      console.error('[ProfileSetupStorage] Error clearing data:', error)
    }
  },

  /**
   * Verifica si hay datos guardados
   */
  hasData(): boolean {
    try {
      if (typeof window !== 'undefined') {
        return sessionStorage.getItem(STORAGE_KEY) !== null
      }
    } catch (error) {
      console.error('[ProfileSetupStorage] Error checking data:', error)
    }
    return false
  }
}
