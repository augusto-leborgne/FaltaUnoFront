"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useRouter } from "next/navigation";
import { Shield, CheckCircle } from "lucide-react";
import { UsuarioAPI } from "@/lib/api";
import { AuthService } from "@/lib/auth";

export function VerificationScreen() {
  const router = useRouter();
  const [cedula, setCedula] = React.useState("");
  const [isVerifying, setIsVerifying] = React.useState(false);
  const [isVerified, setIsVerified] = React.useState(false);
  const [error, setError] = React.useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsVerifying(true);
    setError("");
    try {
      const res = await UsuarioAPI.verificarCedula(cedula);

      if (res.success) {
        if (res.data?.verified) {
          setIsVerified(true);

          // Guardar usuario actualizado
          if (res.data.user) {
            AuthService.setUser(res.data.user);
          } else {
            const current = AuthService.getUser();
            if (current) {
              (current as any).cedulaVerificada = true;
              AuthService.setUser(current);
            }
          }

          // Redirigir a home
          setTimeout(() => router.push("/"), 800);
        } else {
          setError(res.message ?? "Cédula inválida");
        }
      } else {
        setError(res.message ?? "No se pudo verificar la cédula");
      }
    } catch (err) {
      console.error("Verification error:", err);
      setError("Error al verificar la identidad. Intenta nuevamente.");
    } finally {
      setIsVerifying(false);
    }
  };

  if (isVerified) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center px-6">
        <CheckCircle className="w-24 h-24 text-green-500 mx-auto mb-6" />
        <h1 className="text-2xl font-bold text-gray-900 mb-4">¡Verificación exitosa!</h1>
        <p className="text-gray-600 mb-8">Tu identidad ha sido confirmada. Bienvenido a Falta Uno.</p>
        <div className="animate-pulse text-green-600">Redirigiendo...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <div className="pt-20 pb-12 text-center">
        <Shield className="w-16 h-16 text-green-600 mx-auto mb-6" />
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Verificación de Identidad</h1>
        <p className="text-gray-600 px-6">Ingresa tu cédula para verificar tu identidad</p>
      </div>

      <div className="flex-1 px-6">
        {error && <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-2xl">{error}</div>}
        <form onSubmit={handleSubmit} className="space-y-6">
          <Input
            type="text"
            placeholder="Número de cédula"
            value={cedula}
            onChange={(e) => setCedula(e.target.value)}
            maxLength={8}
            pattern="[0-9]{7,8}"
            required
            disabled={isVerifying}
          />
          <Button type="submit" disabled={isVerifying} className="w-full bg-green-600 text-white py-4 rounded-2xl">
            {isVerifying ? "Verificando..." : "Verificar Identidad"}
          </Button>
        </form>
        {isVerifying && (
          <div className="mt-8 text-center">
            <div className="animate-spin w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-gray-600">Consultando registro uruguayo...</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default VerificationScreen;