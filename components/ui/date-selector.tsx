"use client"

import { useState, useEffect } from "react"
import { Label } from "./label"
import { AlertCircle } from "lucide-react"

interface DateSelectorProps {
  value: string // ISO date string (YYYY-MM-DD)
  onChange: (value: string) => void
  label?: string
  error?: string
  required?: boolean
  minAge?: number // Edad mínima (ej: 13 para registro)
  maxAge?: number // Edad máxima
  className?: string
}

/**
 * Selector de fecha con dropdowns separados (día, mes, año).
 * Más intuitivo que el input[type=date] nativo, especialmente para ir hacia atrás.
 */
export function DateSelector({
  value,
  onChange,
  label,
  error,
  required = false,
  minAge = 13,
  maxAge = 100,
  className = "",
}: DateSelectorProps) {
  const [day, setDay] = useState("")
  const [month, setMonth] = useState("")
  const [year, setYear] = useState("")

  // Parse initial value - SOLO la primera vez
  useEffect(() => {
    if (value && value.includes("-")) {
      const [y, m, d] = value.split("-")
      if (y && m && d) {
        // Solo actualizar si los valores internos están vacíos
        if (!year && !month && !day) {
          setYear(y)
          setMonth(parseInt(m).toString()) // Quitar ceros a la izquierda
          setDay(parseInt(d).toString())
        }
      }
    }
  }, [value]) // Removí la dependencia de initialized

  // Update parent on change - solo cuando todos los campos están completos
  const updateDate = (newDay: string, newMonth: string, newYear: string) => {
    if (newDay && newMonth && newYear) {
      // Formatear con padding de ceros
      const paddedMonth = newMonth.padStart(2, "0")
      const paddedDay = newDay.padStart(2, "0")
      const newValue = `${newYear}-${paddedMonth}-${paddedDay}`
      
      // Solo llamar onChange si el valor cambió
      if (newValue !== value) {
        onChange(newValue)
      }
    }
  }

  const handleDayChange = (newDay: string) => {
    setDay(newDay)
    // Preservar mes y año existentes
    updateDate(newDay, month, year)
  }

  const handleMonthChange = (newMonth: string) => {
    setMonth(newMonth)
    // Preservar día y año existentes
    updateDate(day, newMonth, year)
  }

  const handleYearChange = (newYear: string) => {
    setYear(newYear)
    // Preservar día y mes existentes
    updateDate(day, month, newYear)
  }

  // Generar rangos
  const currentYear = new Date().getFullYear()
  const minYear = currentYear - maxAge
  const maxYear = currentYear - minAge

  const years = Array.from(
    { length: maxYear - minYear + 1 },
    (_, i) => maxYear - i
  )

  const months = [
    { value: "1", label: "Enero" },
    { value: "2", label: "Febrero" },
    { value: "3", label: "Marzo" },
    { value: "4", label: "Abril" },
    { value: "5", label: "Mayo" },
    { value: "6", label: "Junio" },
    { value: "7", label: "Julio" },
    { value: "8", label: "Agosto" },
    { value: "9", label: "Septiembre" },
    { value: "10", label: "Octubre" },
    { value: "11", label: "Noviembre" },
    { value: "12", label: "Diciembre" },
  ]

  // Días en el mes seleccionado
  const getDaysInMonth = () => {
    if (!month || !year) return 31
    const monthNum = parseInt(month)
    const yearNum = parseInt(year)
    return new Date(yearNum, monthNum, 0).getDate()
  }

  const days = Array.from({ length: getDaysInMonth() }, (_, i) => i + 1)

  return (
    <div className={className}>
      {label && (
        <Label className="text-sm font-medium text-gray-700 mb-2 block">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </Label>
      )}

      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        {/* Día */}
        <div>
          <select
            value={day}
            onChange={(e) => handleDayChange(e.target.value)}
            className={`w-full px-3 py-2 border rounded-xl text-sm focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors ${
              error ? "border-red-500" : "border-gray-300"
            }`}
            required={required}
          >
            <option value="">Día</option>
            {days.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </div>

        {/* Mes */}
        <div>
          <select
            value={month}
            onChange={(e) => handleMonthChange(e.target.value)}
            className={`w-full px-3 py-2 border rounded-xl text-sm focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors ${
              error ? "border-red-500" : "border-gray-300"
            }`}
            required={required}
          >
            <option value="">Mes</option>
            {months.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
        </div>

        {/* Año */}
        <div>
          <select
            value={year}
            onChange={(e) => handleYearChange(e.target.value)}
            className={`w-full px-3 py-2 border rounded-xl text-sm focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors ${
              error ? "border-red-500" : "border-gray-300"
            }`}
            required={required}
          >
            <option value="">Año</option>
            {years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>
      </div>

      {error && (
        <p className="text-sm text-red-500 mt-2 flex items-center gap-1">
          <AlertCircle className="w-4 h-4" />
          {error}
        </p>
      )}
    </div>
  )
}
