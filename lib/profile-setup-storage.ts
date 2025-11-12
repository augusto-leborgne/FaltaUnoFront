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
  photoPreviewUrl?: string
}

const STORAGE_KEY = 'profile_setup_draft'

export const ProfileSetupStorage = {
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
