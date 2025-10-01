"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useRouter } from "next/navigation";
import { User, ChevronDown } from "lucide-react";
import { AddressAutocomplete } from "./address-autocomplete";
import { UsuarioAPI } from "@/lib/api";
import { AuthService } from "@/lib/auth";
import type { google } from "google-maps";

export function ProfileSetupForm() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: "",
    surname: "",
    phone: "",
    position: "",
    height: "",
    weight: "",
    photo: null as File | null,
    address: "",
    placeDetails: null as google.maps.places.PlaceResult | null,
  });
  const [showPositionDropdown, setShowPositionDropdown] = useState(false);
  const [showSmsVerification, setShowSmsVerification] = useState(false);
  const [smsCode, setSmsCode] = useState("");
  const [isUploading, setIsUploading] = useState(false);

  const positions = ["Arquero", "Zaguero", "Lateral", "Mediocampista", "Volante", "Delantero"];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.photo) return alert("La foto es obligatoria");
    if (!formData.phone) return alert("El número de teléfono es obligatorio");
    if (!formData.address) return alert("La ubicación es obligatoria");

    setShowSmsVerification(true);
  };

  const handleSmsVerification = (e: React.FormEvent) => {
    e.preventDefault();
    if (smsCode.length !== 6) return alert("Ingresa el código de 6 dígitos");
    handleUploadAndSaveProfile();
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null;
    if (f) setFormData(prev => ({ ...prev, photo: f }));
  };

  const handlePositionSelect = (position: string) => {
    setFormData(prev => ({ ...prev, position }));
    setShowPositionDropdown(false);
  };

  async function handleUploadAndSaveProfile() {
    if (!formData.photo) return alert("Foto requerida");
    setIsUploading(true);
    try {
      await UsuarioAPI.subirFoto(formData.photo, "me");

      const perfilPayload = {
        nombre: formData.name,
        apellido: formData.surname,
        celular: formData.phone,
        posicion: formData.position,
        altura: formData.height,
        peso: formData.weight,
        direccion: formData.address,
        placeDetails: formData.placeDetails ? JSON.stringify(formData.placeDetails) : null,
      };

      await UsuarioAPI.actualizarPerfil(perfilPayload, "me");
      router.push("/verification");
    } catch (err) {
      console.error("Error al guardar perfil:", err);
      alert("Error al guardar perfil. Intenta nuevamente.");
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <div className="pt-16 pb-8 text-center border-b border-gray-100">
        <h1 className="text-2xl font-bold text-gray-900">Crea tu perfil</h1>
      </div>

      <div className="flex-1 px-6 py-8">
        <form onSubmit={handleSubmit} className="space-y-6">
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
              <Button type="button" variant="outline" className="bg-orange-100 border-orange-200 text-gray-700 hover:bg-orange-200 active:bg-orange-300 touch-manipulation">
                {formData.photo ? "Cambiar" : "Agregar"}
              </Button>
              <input type="file" accept="image/*" onChange={handlePhotoChange} className="hidden" required />
            </label>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input placeholder="Nombre" value={formData.name} onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))} required />
            <Input placeholder="Apellido" value={formData.surname} onChange={e => setFormData(prev => ({ ...prev, surname: e.target.value }))} required />
          </div>

          <div>
            <AddressAutocomplete
              value={formData.address}
              onChange={(address, placeDetails) => setFormData(prev => ({ ...prev, address, placeDetails: placeDetails ?? null }))}
              placeholder="Ubicación"
              required
            />
          </div>

          <div className="relative">
            <Button type="button" variant="outline" onClick={() => setShowPositionDropdown(!showPositionDropdown)} className="w-full text-left py-3 px-4 rounded-xl border border-gray-300 bg-white">
              {formData.position || "Selecciona tu posición"}
              <ChevronDown className="w-5 h-5 float-right" />
            </Button>
            {showPositionDropdown && (
              <div className="absolute mt-1 w-full bg-white border border-gray-300 rounded-xl z-50">
                {positions.map(pos => (
                  <div key={pos} onClick={() => handlePositionSelect(pos)} className="p-3 hover:bg-gray-100 cursor-pointer">
                    {pos}
                  </div>
                ))}
              </div>
            )}
          </div>

          {showSmsVerification && (
            <div className="mt-6">
              <h3 className="text-gray-900 font-semibold mb-2">Código de verificación SMS</h3>
              <Input
                placeholder="XXXXXX"
                value={smsCode}
                onChange={e => setSmsCode(e.target.value)}
                maxLength={6}
              />
              <Button type="button" onClick={handleSmsVerification} className="w-full mt-4">
                Verificar y Guardar Perfil
              </Button>
            </div>
          )}

          {!showSmsVerification && (
            <Button type="submit" className="w-full">
              Continuar
            </Button>
          )}
        </form>
      </div>
    </div>
  );
}