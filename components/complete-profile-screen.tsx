"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useRouter } from "next/navigation";
import { User, Camera, MapPin } from "lucide-react";
import { AddressAutocomplete } from "./address-autocomplete";
import type { google } from "google-maps";
import { UsuarioAPI, Usuario } from "@/lib/api";

export function CompleteProfileScreen() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    nombre: "",
    apellido: "",
    celular: "",
    birthDate: "",
    address: "",
    city: "",
    position: "",
    experience: "",
    photoFile: null as File | null,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleAddressChange = (address: string, placeDetails?: google.maps.places.PlaceResult) => {
    setFormData((prev) => ({ ...prev, address }));

    if (placeDetails?.address_components) {
      const cityComponent = placeDetails.address_components.find(
        (component) =>
          component.types.includes("locality") ||
          component.types.includes("administrative_area_level_1")
      );
      if (cityComponent) {
        setFormData((prev) => ({ ...prev, city: cityComponent.long_name }));
      }
    }
  };

  const handleFileChange = (file: File | null) => {
    setFormData((prev) => ({ ...prev, photoFile: file }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.photoFile) {
      alert("Debes subir una foto de perfil");
      return;
    }

    setIsSubmitting(true);

    try {
      const uploadRes = await UsuarioAPI.subirFoto(formData.photoFile, "me");
      let fotoUrl: string | undefined;
      if (uploadRes && (uploadRes as any).data?.url) fotoUrl = (uploadRes as any).data.url;

      const payload: Partial<Usuario> = {
        nombre: formData.nombre || undefined,
        apellido: formData.apellido || undefined,
        celular: formData.celular || undefined,
        edad: formData.birthDate
          ? new Date().getFullYear() - new Date(formData.birthDate).getFullYear()
          : undefined,
        ubicacion: formData.address || undefined,
        posicion: formData.position || undefined,
        foto_perfil: fotoUrl || undefined,
      };

      await UsuarioAPI.actualizarPerfil(payload);

      router.push("/verificacion");
    } catch (err: any) {
      console.error("Error completando perfil:", err);
      if (String(err).includes("401")) {
        alert("No autenticado. Inicia sesión nuevamente.");
        router.push("/login");
      } else {
        alert("Ocurrió un error al completar tu perfil");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <div className="pt-20 pb-8 text-center px-6">
        <User className="w-16 h-16 text-green-600 mx-auto mb-6" />
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Completa tu Perfil</h1>
        <p className="text-gray-600">Ayúdanos a conocerte mejor para conectarte con los jugadores ideales</p>
      </div>

      <div className="flex-1 px-6 pb-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="text-center">
            <div className="w-24 h-24 bg-gray-100 rounded-full mx-auto mb-4 flex items-center justify-center">
              <Camera className="w-8 h-8 text-gray-400" />
            </div>
            <Input
              type="file"
              accept="image/*"
              onChange={(e) => handleFileChange(e.target.files?.[0] || null)}
              className="mx-auto"
              required
            />
          </div>

          <div className="space-y-4">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              <User className="w-5 h-5" />
              Información de Contacto
            </h3>

            <Input
              type="text"
              placeholder="Nombre"
              value={formData.nombre}
              onChange={(e) => handleInputChange("nombre", e.target.value)}
              className="py-3 rounded-xl"
              required
            />

            <Input
              type="text"
              placeholder="Apellido"
              value={formData.apellido}
              onChange={(e) => handleInputChange("apellido", e.target.value)}
              className="py-3 rounded-xl"
              required
            />

            <Input
              type="tel"
              placeholder="Teléfono"
              value={formData.celular}
              onChange={(e) => handleInputChange("celular", e.target.value)}
              className="py-3 rounded-xl"
              required
            />

            <Input
              type="date"
              placeholder="Fecha de nacimiento"
              value={formData.birthDate}
              onChange={(e) => handleInputChange("birthDate", e.target.value)}
              className="py-3 rounded-xl"
              required
            />
          </div>

          <div className="space-y-4">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              <MapPin className="w-5 h-5" />
              Ubicación
            </h3>

            <AddressAutocomplete
              value={formData.address}
              onChange={handleAddressChange}
              placeholder="Dirección"
              className="py-3 rounded-xl"
              required
            />

            <Input
              type="text"
              placeholder="Ciudad"
              value={formData.city}
              onChange={(e) => handleInputChange("city", e.target.value)}
              className="py-3 rounded-xl"
              required
            />
          </div>

          <div className="space-y-4">
            <h3 className="font-semibold text-gray-900">⚽ Información Futbolística</h3>

            <select
              value={formData.position}
              onChange={(e) => handleInputChange("position", e.target.value)}
              className="w-full py-3 px-4 rounded-xl border border-gray-300 bg-white"
              required
            >
              <option value="">Selecciona tu posición</option>
              <option value="arquero">Arquero</option>
              <option value="defensor">Defensor</option>
              <option value="mediocampista">Mediocampista</option>
              <option value="delantero">Delantero</option>
              <option value="cualquiera">Cualquier posición</option>
            </select>

            <select
              value={formData.experience}
              onChange={(e) => handleInputChange("experience", e.target.value)}
              className="w-full py-3 px-4 rounded-xl border border-gray-300 bg-white"
              required
            >
              <option value="">Nivel de experiencia</option>
              <option value="principiante">Principiante</option>
              <option value="intermedio">Intermedio</option>
              <option value="avanzado">Avanzado</option>
              <option value="profesional">Profesional</option>
            </select>
          </div>

          <Button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-green-600 hover:bg-green-700 text-white py-4 text-lg font-semibold rounded-2xl min-h-[56px] touch-manipulation disabled:opacity-50"
          >
            {isSubmitting ? "Guardando..." : "Completar Perfil"}
          </Button>
        </form>
      </div>
    </div>
  );
}