"use client"

import React, { useState } from "react"
import { X, AlertTriangle } from "lucide-react"
import { Button } from "./button"
import { API_BASE } from "@/lib/api"
import AuthService from "@/lib/auth"

interface ReportModalProps {
  isOpen: boolean
  onClose: () => void
  reportedUserId: string
  reportedUserName: string
}

const REPORT_REASONS = [
  { value: "COMPORTAMIENTO_INAPROPIADO", label: "Comportamiento inapropiado" },
  { value: "LENGUAJE_OFENSIVO", label: "Lenguaje ofensivo" },
  { value: "SPAM", label: "Spam" },
  { value: "SUPLANTACION", label: "Suplantación de identidad" },
  { value: "ACOSO", label: "Acoso" },
  { value: "CONTENIDO_INAPROPIADO", label: "Contenido inapropiado" },
  { value: "NO_APARECE_PARTIDOS", label: "No aparece a partidos" },
  { value: "JUGADOR_VIOLENTO", label: "Jugador violento" },
  { value: "OTRO", label: "Otro" },
]

export function ReportModal({ isOpen, onClose, reportedUserId, reportedUserName }: ReportModalProps) {
  const [reason, setReason] = useState("")
  const [description, setDescription] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    
    if (!reason) {
      setError("Por favor selecciona un motivo")
      return
    }

    if (description.trim().length < 10) {
      setError("La descripción debe tener al menos 10 caracteres")
      return
    }

    setLoading(true)

    try {
      const token = await AuthService.getToken()
      const response = await fetch(`${API_BASE}/api/reports`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          reportedUserId,
          reason,
          description: description.trim(),
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || "Error al enviar el reporte")
      }

      setSuccess(true)
      setTimeout(() => {
        onClose()
        setSuccess(false)
        setReason("")
        setDescription("")
      }, 2000)
    } catch (err: any) {
      setError(err.message || "Error al enviar el reporte")
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    if (!loading) {
      setReason("")
      setDescription("")
      setError("")
      setSuccess(false)
      onClose()
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">Reportar usuario</h2>
              <p className="text-sm text-gray-600">{reportedUserName}</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            disabled={loading}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {success ? (
          <div className="p-8 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">Reporte enviado</h3>
            <p className="text-gray-600">
              Gracias por ayudarnos a mantener la comunidad segura. Revisaremos este reporte.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {/* Reason Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">
                Motivo del reporte <span className="text-red-500">*</span>
              </label>
              <select
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                disabled={loading}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent disabled:opacity-50"
                required
              >
                <option value="">Selecciona un motivo</option>
                {REPORT_REASONS.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">
                Descripción <span className="text-red-500">*</span>
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={loading}
                rows={4}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent resize-none disabled:opacity-50"
                placeholder="Describe el motivo del reporte (mínimo 10 caracteres)..."
                required
                minLength={10}
              />
              <p className="text-xs text-gray-500 mt-1">
                {description.length}/200 caracteres
              </p>
            </div>

            {/* Info */}
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
              <p className="text-xs text-amber-800">
                • Los reportes son anónimos
                <br />
                • Puedes hacer máximo 5 reportes por mes
                <br />
                • Los reportes falsos pueden resultar en sanciones
              </p>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            {/* Actions */}
            <div className="flex space-x-3 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={loading}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={loading || !reason || description.trim().length < 10}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white"
              >
                {loading ? "Enviando..." : "Enviar reporte"}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
