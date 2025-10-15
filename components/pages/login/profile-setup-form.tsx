"use client";

import React, { useRef, useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useRouter } from "next/navigation";
import { User, ChevronDown } from "lucide-react";
import AddressAutocomplete from "@/components/google-maps/address-autocomplete";
import { UsuarioAPI } from "@/lib/api";
import { AuthService } from "@/lib/auth";
import type { google } from "google-maps";

export function ProfileSetupForm() {
  const router = useRouter();

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    surname: "",
    phone: "",
    fechaNacimiento: "",
    position: "",
    level: "",
    height: "",
    weight: "",
    photo: null as File | null,
    photoPreviewUrl: "" as string,
    address: "",
    placeDetails: null as google.maps.places.PlaceResult | null,
  });

  const [showPositionDropdown, setShowPositionDropdown] = useState(false);
  const [showLevelDropdown, setShowLevelDropdown] = useState(false);
  const [showSmsVerification, setShowSmsVerification] = useState(false);
  const [smsCode, setSmsCode] = useState("");
  const [isUploading, setIsUploading] = useState(false);

  const positions = ["Arquero", "Zaguero", "Lateral", "Mediocampista", "Volante", "Delantero"];
  const levels = ["Principiante", "Intermedio", "Avanzado", "Profesional"];

  useEffect(() => {
    return () => {
      if (formData.photoPreviewUrl) URL.revokeObjectURL(formData.photoPreviewUrl);
    };
  }, [formData.photoPreviewUrl]);

  const openFilePicker = () => { if (fileInputRef.current) fileInputRef.current.click(); };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null;
    if (!f) return;
    if (formData.photoPreviewUrl) URL.revokeObjectURL(formData.photoPreviewUrl);
    const preview = URL.createObjectURL(f);
    setFormData(prev => ({ ...prev, photo: f, photoPreviewUrl: preview }));
  };

  const handlePositionSelect = (position: string) => {
    setFormData(prev => ({ ...prev, position }));
    setShowPositionDropdown(false);
  };

  const handleLevelSelect = (level: string) => {
    setFormData(prev => ({ ...prev, level }));
    setShowLevelDropdown(false);
  };

  const handleAddressChangeFromAutocomplete = (address: string, placeDetails?: google.maps.places.PlaceResult | null) => {
    setFormData(prev => ({ ...prev, address: address ?? "", placeDetails: placeDetails ?? null }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.photo) return alert("La foto es obligatoria");
    if (!formData.phone) return alert("El número de teléfono es obligatorio");
    if (!formData.address) return alert("La ubicación es obligatoria");
    if (!formData.fechaNacimiento) return alert("La fecha de nacimiento es obligatoria");

    setShowSmsVerification(true);
  };

  const handleSmsVerification = (e: React.FormEvent) => {
    e.preventDefault();
    if (smsCode.length !== 6) return alert("Ingresa el código de 6 dígitos");
    handleUploadAndSaveProfile();
  };

  async function handleUploadAndSaveProfile() {
    if (!formData.photo) return alert("Foto requerida");
    
    setIsUploading(true);
    
    try {
      // DEBUG: Verificar que tengamos token
      const token = AuthService.getToken();
      console.log("[ProfileSetup] Token disponible:", token ? "SÍ" : "NO");
      console.log("[ProfileSetup] Token length:", token?.length);
      console.log("[ProfileSetup] Token preview:", token?.substring(0, 20) + "...");
      
      if (!token) {
        alert("No estás autenticado. Por favor, inicia sesión nuevamente.");
        router.push("/login");
        return;
      }

      // Verificar que el token no esté expirado
      if (AuthService.isTokenExpired(token)) {
        alert("Tu sesión ha expirado. Por favor, inicia sesión nuevamente.");
        AuthService.logout();
        router.push("/login");
        return;
      }

      console.log("[ProfileSetup] Subiendo foto...");
      
      // Subir foto primero
      const fotoRes = await UsuarioAPI.subirFoto(formData.photo);
      console.log("[ProfileSetup] Resultado subida foto:", fotoRes);

      if (!fotoRes.success) {
        throw new Error(fotoRes.message || "Error subiendo foto");
      }

      console.log("[ProfileSetup] Foto subida exitosamente, actualizando perfil...");

      // Actualizar perfil
      const perfilPayload = {
        nombre: formData.name,
        apellido: formData.surname,
        celular: formData.phone,
        fecha_nacimiento: formData.fechaNacimiento,
        posicion: formData.position,
        nivel: formData.level,
        altura: formData.height,
        peso: formData.weight,
        direccion: formData.address,
        placeDetails: formData.placeDetails ? JSON.stringify(formData.placeDetails) : null,
      };

      const res = await UsuarioAPI.actualizarPerfil(perfilPayload);
      console.log("[ProfileSetup] Resultado actualizar perfil:", res);

      // Si backend devuelve user actualizado, guardarlo localmente
      try {
        if (res && (res as any).success && (res as any).data) {
          AuthService.setUser((res as any).data);
        }
      } catch (e) { 
        console.warn("[ProfileSetup] No se pudo actualizar user en localStorage:", e);
      }

      // Redirigir a verificación
      router.push("/verification");
    } catch (err: any) {
      console.error("[ProfileSetup] Error al guardar perfil:", err);
      alert(`Error al guardar perfil: ${err.message || "Intenta nuevamente"}`);
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
                {formData.photoPreviewUrl ? (
                  <img src={formData.photoPreviewUrl} alt="preview" className="w-16 h-16 object-cover rounded-md" />
                ) : (
                  <AvatarFallback className="bg-orange-100">
                    <User className="w-8 h-8 text-gray-600" />
                  </AvatarFallback>
                )}
              </Avatar>
              <div>
                <h3 className="font-semibold text-gray-900">Tu foto</h3>
                <p className="text-sm text-red-500">Obligatorio</p>
                {formData.photo && <p className="text-sm text-gray-600 mt-1 truncate" style={{ maxWidth: 220 }}>{formData.photo.name}</p>}
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <Button
                type="button"
                variant="outline"
                className="bg-orange-100 border-orange-200 text-gray-700 hover:bg-orange-200 active:bg-orange-300 touch-manipulation"
                onClick={openFilePicker}
              >
                {formData.photo ? "Cambiar" : "Agregar"}
              </Button>

              <input ref={fileInputRef} type="file" accept="image/*" onChange={handlePhotoChange} className="hidden" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input placeholder="Nombre" value={formData.name} onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))} required />
            <Input placeholder="Apellido" value={formData.surname} onChange={e => setFormData(prev => ({ ...prev, surname: e.target.value }))} required />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <Input placeholder="Celular" value={formData.phone} onChange={e => setFormData(prev => ({ ...prev, phone: e.target.value }))} required />
            <Input
              placeholder="Fecha de nacimiento"
              value={formData.fechaNacimiento}
              onChange={e => setFormData(prev => ({ ...prev, fechaNacimiento: e.target.value }))}
              type="date"
              required
            />
            <Input placeholder="Altura (cm)" value={formData.height} onChange={e => setFormData(prev => ({ ...prev, height: e.target.value }))} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input placeholder="Peso (kg)" value={formData.weight} onChange={e => setFormData(prev => ({ ...prev, weight: e.target.value }))} />
            <div></div>
          </div>

          <div>
            <AddressAutocomplete
              value={formData.address}
              onChange={(address, placeDetails) => handleAddressChangeFromAutocomplete(address, placeDetails)}
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

          <div className="relative">
            <Button type="button" variant="outline" onClick={() => setShowLevelDropdown(!showLevelDropdown)} className="w-full text-left py-3 px-4 rounded-xl border border-gray-300 bg-white">
              {formData.level || "Selecciona tu nivel"}
              <ChevronDown className="w-5 h-5 float-right" />
            </Button>
            {showLevelDropdown && (
              <div className="absolute mt-1 w-full bg-white border border-gray-300 rounded-xl z-50">
                {levels.map(lv => (
                  <div key={lv} onClick={() => handleLevelSelect(lv)} className="p-3 hover:bg-gray-100 cursor-pointer">
                    {lv}
                  </div>
                ))}
              </div>
            )}
          </div>

          {showSmsVerification && (
            <div className="mt-6">
              <h3 className="text-gray-900 font-semibold mb-2">Código de verificación SMS</h3>
              <Input placeholder="XXXXXX" value={smsCode} onChange={e => setSmsCode(e.target.value)} maxLength={6} />
              <Button type="button" onClick={handleSmsVerification} className="w-full mt-4" disabled={isUploading}>
                {isUploading ? "Guardando..." : "Verificar y Guardar Perfil"}
              </Button>
            </div>
          )}

          {!showSmsVerification && (
            <Button type="submit" className="w-full" disabled={isUploading}>
              {isUploading ? "Guardando..." : "Continuar"}
            </Button>
          )}
        </form>
      </div>
    </div>
  );
}

export default ProfileSetupForm;