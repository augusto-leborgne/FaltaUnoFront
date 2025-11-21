// lib/profile-setup-storage.ts
// Temporary storage for profile setup data during navigation

export interface ProfileSetupData {
    photoBase64?: string
    photoFile?: string // base64 encoded file
}

const STORAGE_KEY = 'profile-setup-data'

export class ProfileSetupStorage {
    /**
     * Save profile setup data to sessionStorage
     */
    static save(data: ProfileSetupData): void {
        try {
            sessionStorage.setItem(STORAGE_KEY, JSON.stringify(data))
        } catch (error) {
            console.error('[ProfileSetupStorage] Error saving data:', error)
        }
    }

    /**
     * Load profile setup data from sessionStorage
     */
    static load(): ProfileSetupData | null {
        try {
            const data = sessionStorage.getItem(STORAGE_KEY)
            if (!data) return null
            return JSON.parse(data)
        } catch (error) {
            console.error('[ProfileSetupStorage] Error loading data:', error)
            return null
        }
    }

    /**
     * Clear profile setup data from sessionStorage
     */
    static clear(): void {
        try {
            sessionStorage.removeItem(STORAGE_KEY)
        } catch (error) {
            console.error('[ProfileSetupStorage] Error clearing data:', error)
        }
    }

    /**
     * Convert base64 string to blob URL
     */
    static base64ToBlobUrl(data: ProfileSetupData): string | null {
        if (!data.photoBase64) return null
        try {
            // Extract base64 data (remove data:image/...;base64, prefix if present)
            const base64Data = data.photoBase64.split(',')[1] || data.photoBase64
            const byteCharacters = atob(base64Data)
            const byteNumbers = new Array(byteCharacters.length)
            for (let i = 0; i < byteCharacters.length; i++) {
                byteNumbers[i] = byteCharacters.charCodeAt(i)
            }
            const byteArray = new Uint8Array(byteNumbers)
            const blob = new Blob([byteArray], { type: 'image/jpeg' })
            return URL.createObjectURL(blob)
        } catch (error) {
            console.error('[ProfileSetupStorage] Error converting base64 to blob:', error)
            return null
        }
    }

    /**
     * Convert base64 string to File object
     */
    static base64ToFile(base64: string, filename: string = 'photo.jpg'): File | null {
        try {
            // Extract base64 data (remove data:image/...;base64, prefix if present)
            const base64Data = base64.split(',')[1] || base64
            const byteCharacters = atob(base64Data)
            const byteNumbers = new Array(byteCharacters.length)
            for (let i = 0; i < byteCharacters.length; i++) {
                byteNumbers[i] = byteCharacters.charCodeAt(i)
            }
            const byteArray = new Uint8Array(byteNumbers)
            const blob = new Blob([byteArray], { type: 'image/jpeg' })
            return new File([blob], filename, { type: 'image/jpeg' })
        } catch (error) {
            console.error('[ProfileSetupStorage] Error converting base64 to file:', error)
            return null
        }
    }

    /**
     * Convert File to base64 string
     */
    static async fileToBase64(file: File): Promise<string | null> {
        return new Promise((resolve) => {
            const reader = new FileReader()
            reader.onloadend = () => {
                resolve(reader.result as string)
            }
            reader.onerror = () => {
                console.error('[ProfileSetupStorage] Error reading file')
                resolve(null)
            }
            reader.readAsDataURL(file)
        })
    }
}
