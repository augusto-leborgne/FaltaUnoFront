"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"
import { logger } from "@/lib/logger"

export default function DebugClearPage() {
  const router = useRouter()
  const [cleared, setCleared] = useState(false)
  const [log, setLog] = useState<string[]>([])

  const addLog = (message: string) => {
    setLog(prev => [...prev, message])
    logger.info(message)
  }

  const clearEverything = () => {
    addLog("🧹 Iniciando limpieza completa...")
    
    try {
      // 1. Limpiar localStorage
      addLog("📦 Limpiando localStorage...")
      const keys = Object.keys(localStorage)
      addLog(`   Encontradas ${keys.length} llaves: ${keys.join(", ")}`)
      localStorage.clear()
      addLog("   ✅ localStorage limpiado")

      // 2. Limpiar sessionStorage
      addLog("📦 Limpiando sessionStorage...")
      sessionStorage.clear()
      addLog("   ✅ sessionStorage limpiado")

      // 3. Limpiar cookies
      addLog("🍪 Limpiando cookies...")
      const cookies = document.cookie.split(";")
      addLog(`   Encontradas ${cookies.length} cookies`)
      for (let cookie of cookies) {
        const eqPos = cookie.indexOf("=")
        const name = eqPos > -1 ? cookie.substr(0, eqPos).trim() : cookie.trim()
        document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/"
        addLog(`   - Eliminada: ${name}`)
      }
      addLog("   ✅ Cookies limpiadas")

      // 4. Verificar limpieza
      addLog("🔍 Verificando limpieza...")
      addLog(`   localStorage: ${localStorage.length} items`)
      addLog(`   sessionStorage: ${sessionStorage.length} items`)
      
      setCleared(true)
      addLog("✅ ¡Limpieza completa exitosa!")
      addLog("🔄 Puedes cerrar esta página y volver a hacer login")
      
    } catch (error) {
      addLog(`❌ Error durante limpieza: ${error}`)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-2xl mx-auto bg-white rounded-lg shadow p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">
          🧹 Limpieza de Datos del Navegador
        </h1>
        
        <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded">
          <p className="text-sm text-yellow-800">
            ⚠️ <strong>Advertencia:</strong> Esta acción eliminará TODOS los datos guardados en tu navegador para esta aplicación, incluyendo:
          </p>
          <ul className="mt-2 ml-4 list-disc text-sm text-yellow-800">
            <li>Tokens de autenticación</li>
            <li>Datos de usuario guardados</li>
            <li>Preferencias de la aplicación</li>
            <li>Cookies de sesión</li>
          </ul>
          <p className="mt-2 text-sm text-yellow-800">
            Deberás volver a iniciar sesión después de esto.
          </p>
        </div>

        {!cleared ? (
          <button
            onClick={clearEverything}
            className="w-full bg-red-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-red-700 transition"
          >
            🧹 Limpiar Todo y Empezar de Cero
          </button>
        ) : (
          <div className="space-y-4">
            <div className="p-4 bg-green-50 border border-green-200 rounded">
              <p className="text-green-800 font-medium">
                ✅ Limpieza completada exitosamente
              </p>
            </div>
            
            <button
              onClick={() => router.push("/login")}
              className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition"
            >
              Ir a Login
            </button>
          </div>
        )}

        {/* Log de acciones */}
        {log.length > 0 && (
          <div className="mt-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Log de Acciones:</h2>
            <div className="bg-gray-900 text-gray-100 p-4 rounded font-mono text-xs space-y-1 max-h-96 overflow-y-auto">
              {log.map((line, idx) => (
                <div key={idx}>{line}</div>
              ))}
            </div>
          </div>
        )}

        {/* Información de debug */}
        <div className="mt-6 p-4 bg-gray-50 rounded">
          <h3 className="font-semibold text-gray-900 mb-2">Estado Actual:</h3>
          <div className="text-sm text-gray-600 space-y-1">
            <div>📦 localStorage items: {typeof window !== 'undefined' ? localStorage.length : 0}</div>
            <div>📦 sessionStorage items: {typeof window !== 'undefined' ? sessionStorage.length : 0}</div>
            <div>🍪 Cookies: {typeof window !== 'undefined' ? document.cookie.split(';').filter(c => c.trim()).length : 0}</div>
          </div>
        </div>

        <div className="mt-6">
          <button
            onClick={() => router.push("/login")}
            className="text-blue-600 hover:underline text-sm"
          >
            ← Volver a Login
          </button>
        </div>
      </div>
    </div>
  )
}
