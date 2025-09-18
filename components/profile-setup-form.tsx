"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { useRouter } from "next/navigation"
import { User, ChevronDown } from "lucide-react"

export function ProfileSetupForm() {
  const router = useRouter()
  const [formData, setFormData] = useState({
    name: "",
    surname: "",
    email: "",
    phone: "", // Added phone number field
    position: "",
    height: "",
    weight: "",
    photo: null as File | null,
  })
  const [showPositionDropdown, setShowPositionDropdown] = useState(false)
  const [authMethod, setAuthMethod] = useState<"email" | "google" | "apple" | "facebook">("email")
  const [showSmsVerification, setShowSmsVerification] = useState(false) // Added SMS verification state
  const [smsCode, setSmsCode] = useState("") // Added SMS code state

  const positions = ["Arquero", "Zaguero", "Lateral", "Mediocampista", "Volante", "Delantero"]

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.photo) {
      alert("La foto es obligatoria")
      return
    }
    if (!formData.phone) {
      alert("El número de teléfono es obligatorio")
      return
    }
    setShowSmsVerification(true)
  }

  const handleSmsVerification = (e: React.FormEvent) => {
    e.preventDefault()
    if (smsCode.length !== 6) {
      alert("Ingresa el código de 6 dígitos")
      return
    }
    router.push("/verification")
  }

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setFormData((prev) => ({ ...prev, photo: file }))
    }
  }

  const handlePositionSelect = (position: string) => {
    setFormData((prev) => ({ ...prev, position }))
    setShowPositionDropdown(false)
  }

  const handleSocialLogin = (method: "google" | "apple" | "facebook") => {
    setAuthMethod(method)
    // Here would be the actual social login implementation
  }

  if (showSmsVerification) {
    return (
      <div className="min-h-screen bg-white flex flex-col">
        <div className="pt-16 pb-8 text-center border-b border-gray-100">
          <h1 className="text-2xl font-bold text-gray-900">Verificar teléfono</h1>
          <p className="text-gray-600 mt-2">Enviamos un código a {formData.phone}</p>
        </div>

        <div className="flex-1 px-6 py-8">
          <form onSubmit={handleSmsVerification} className="space-y-6">
            <Input
              placeholder="Código de 6 dígitos"
              value={smsCode}
              onChange={(e) => setSmsCode(e.target.value)}
              className="p-4 text-lg border-gray-200 rounded-2xl bg-gray-50 focus:bg-white min-h-[56px] text-center text-2xl tracking-widest"
              maxLength={6}
              required
            />

            <Button
              type="submit"
              className="w-full bg-green-500 hover:bg-green-600 active:bg-green-700 text-white py-4 text-lg font-semibold rounded-2xl min-h-[56px] touch-manipulation"
              size="lg"
            >
              Verificar
            </Button>

            <Button
              type="button"
              variant="outline"
              onClick={() => setShowSmsVerification(false)}
              className="w-full py-4 text-lg font-semibold rounded-2xl min-h-[56px] touch-manipulation"
            >
              Cambiar número
            </Button>
          </form>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header */}
      <div className="pt-16 pb-8 text-center border-b border-gray-100">
        <h1 className="text-2xl font-bold text-gray-900">Crea tu perfil</h1>
      </div>

      <div className="flex-1 px-6 py-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Profile Photo */}
          <div className="bg-gray-50 rounded-2xl p-6 flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Avatar className="w-16 h-16 bg-orange-100">
                <AvatarFallback className="bg-orange-100">
                  <User className="w-8 h-8 text-gray-600" />
                </AvatarFallback>
              </Avatar>
              <div>
                <h3 className="font-semibold text-gray-900">Tu foto</h3>
                <p className="text-sm text-red-500">Obligatorio</p>
              </div>
            </div>
            <label className="cursor-pointer">
              <Button
                type="button"
                variant="outline"
                className="bg-orange-100 border-orange-200 text-gray-700 hover:bg-orange-200 active:bg-orange-300 touch-manipulation pointer-events-none"
              >
                {formData.photo ? "Cambiar" : "Agregar"}
              </Button>
              <input type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" required />
            </label>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              placeholder="Nombre"
              value={formData.name}
              onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
              className="p-4 text-lg border-gray-200 rounded-2xl bg-gray-50 focus:bg-white min-h-[56px]"
              required
            />
            <Input
              placeholder="Apellido"
              value={formData.surname}
              onChange={(e) => setFormData((prev) => ({ ...prev, surname: e.target.value }))}
              className="p-4 text-lg border-gray-200 rounded-2xl bg-gray-50 focus:bg-white min-h-[56px]"
              required
            />
          </div>

          <Input
            placeholder="Número de teléfono"
            type="tel"
            value={formData.phone}
            onChange={(e) => setFormData((prev) => ({ ...prev, phone: e.target.value }))}
            className="w-full p-4 text-lg border-gray-200 rounded-2xl bg-gray-50 focus:bg-white min-h-[56px]"
            required
          />

          <div className="space-y-4">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setAuthMethod("email")}
                className={`px-4 py-2 rounded-xl text-sm font-medium ${
                  authMethod === "email" ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-600"
                }`}
              >
                Email
              </button>
              <button
                type="button"
                onClick={() => handleSocialLogin("google")}
                className={`px-4 py-2 rounded-xl text-sm font-medium ${
                  authMethod === "google" ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-600"
                }`}
              >
                Google
              </button>
              <button
                type="button"
                onClick={() => handleSocialLogin("apple")}
                className={`px-4 py-2 rounded-xl text-sm font-medium ${
                  authMethod === "apple" ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-600"
                }`}
              >
                Apple
              </button>
              <button
                type="button"
                onClick={() => handleSocialLogin("facebook")}
                className={`px-4 py-2 rounded-xl text-sm font-medium ${
                  authMethod === "facebook" ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-600"
                }`}
              >
                Facebook
              </button>
            </div>

            {authMethod === "email" && (
              <Input
                placeholder="Email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
                className="w-full p-4 text-lg border-gray-200 rounded-2xl bg-gray-50 focus:bg-white min-h-[56px]"
                required
              />
            )}
          </div>

          {/* Position Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowPositionDropdown(!showPositionDropdown)}
              className="w-full p-4 text-lg border border-gray-200 rounded-2xl bg-gray-50 focus:bg-white min-h-[56px] text-left flex items-center justify-between"
            >
              <span className={formData.position ? "text-gray-900" : "text-gray-500"}>
                {formData.position || "Posición favorita"}
              </span>
              <ChevronDown className="w-5 h-5 text-gray-400" />
            </button>
            {showPositionDropdown && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-2xl shadow-lg z-10">
                {positions.map((position) => (
                  <button
                    key={position}
                    type="button"
                    onClick={() => handlePositionSelect(position)}
                    className="w-full p-4 text-left hover:bg-gray-50 first:rounded-t-2xl last:rounded-b-2xl"
                  >
                    {position}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Height and Weight */}
          <div className="grid grid-cols-2 gap-4">
            <Input
              placeholder="Altura (cm)"
              type="number"
              inputMode="numeric"
              value={formData.height}
              onChange={(e) => setFormData((prev) => ({ ...prev, height: e.target.value }))}
              className="p-4 text-lg border-gray-200 rounded-2xl bg-gray-50 focus:bg-white min-h-[56px]"
              required
            />
            <Input
              placeholder="Peso (kg)"
              type="number"
              inputMode="numeric"
              value={formData.weight}
              onChange={(e) => setFormData((prev) => ({ ...prev, weight: e.target.value }))}
              className="p-4 text-lg border-gray-200 rounded-2xl bg-gray-50 focus:bg-white min-h-[56px]"
              required
            />
          </div>

          {/* Submit Button */}
          <div className="pt-8 pb-24">
            <Button
              type="submit"
              className="w-full bg-green-500 hover:bg-green-600 active:bg-green-700 text-white py-4 text-lg font-semibold rounded-2xl min-h-[56px] touch-manipulation"
              size="lg"
            >
              Continuar a verificación
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
