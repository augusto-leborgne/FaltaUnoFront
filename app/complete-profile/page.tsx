'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle2, XCircle, Loader2, User, Phone, Calendar } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api';

export default function CompleteProfilePage() {
  const router = useRouter();
  
  const [email, setEmail] = useState('');
  const [passwordHash, setPasswordHash] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [formData, setFormData] = useState({
    nombre: '',
    apellido: '',
    celular: '',
    fechaNacimiento: '',
  });

  // Cargar datos de verificación
  useEffect(() => {
    const verifiedEmail = localStorage.getItem('verifiedEmail');
    const hash = localStorage.getItem('passwordHash');

    if (!verifiedEmail || !hash) {
      router.push('/register');
      return;
    }

    setEmail(verifiedEmail);
    setPasswordHash(hash);
  }, [router]);

  // Manejar cambios en el formulario
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
    setError('');
  };

  // Validar formulario
  const validateForm = () => {
    if (!formData.nombre.trim()) {
      setError('El nombre es requerido');
      return false;
    }
    if (!formData.apellido.trim()) {
      setError('El apellido es requerido');
      return false;
    }
    if (!formData.celular.trim()) {
      setError('El celular es requerido');
      return false;
    }
    if (!/^\+?[\d\s-]+$/.test(formData.celular)) {
      setError('El celular no es válido');
      return false;
    }
    if (!formData.fechaNacimiento) {
      setError('La fecha de nacimiento es requerida');
      return false;
    }

    // Validar edad mínima (13 años)
    const birthDate = new Date(formData.fechaNacimiento);
    const today = new Date();
    const age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (age < 13 || (age === 13 && monthDiff < 0)) {
      setError('Debes tener al menos 13 años para registrarte');
      return false;
    }

    if (age > 100) {
      setError('La fecha de nacimiento no es válida');
      return false;
    }

    return true;
  };

  // Enviar formulario
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsLoading(true);
    setError('');

    try {
      const response = await fetch(`${API_URL}/auth/complete-register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          verificationCode: 'already-verified', // Ya verificado
          password: passwordHash, // Password hash del pre-registro
          nombre: formData.nombre,
          apellido: formData.apellido,
          celular: formData.celular,
          fechaNacimiento: formData.fechaNacimiento,
          emailVerified: true,
        }),
      });

      const data = await response.json();

      if (data.success && data.data) {
        // Limpiar localStorage
        localStorage.removeItem('verifiedEmail');
        localStorage.removeItem('passwordHash');

        // Guardar token si viene
        if (data.data.token) {
          localStorage.setItem('token', data.data.token);
        }

        // Redirigir a profile-setup o home
        router.push('/profile-setup');
      } else {
        setError(data.message || 'Error al completar el registro');
      }
    } catch (err) {
      console.error('Error completando registro:', err);
      setError('Error al completar el registro. Por favor intenta de nuevo.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!email || !passwordHash) {
    return null; // Se redirigirá automáticamente
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-green-50 flex items-center justify-center p-4">
      <div className="max-w-lg w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
            <CheckCircle2 className="w-8 h-8 text-green-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            ¡Email verificado!
          </h1>
          <p className="text-gray-600">
            Completa tu perfil para continuar
          </p>
        </div>

        {/* Card del formulario */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Email (readonly) */}
            <div>
              <Label htmlFor="email">Email verificado</Label>
              <div className="mt-1 flex items-center gap-2">
                <Input
                  id="email"
                  type="email"
                  value={email}
                  readOnly
                  className="bg-gray-50"
                />
                <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0" />
              </div>
            </div>

            {/* Nombre */}
            <div>
              <Label htmlFor="nombre">
                Nombre <span className="text-red-500">*</span>
              </Label>
              <div className="mt-1 relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="nombre"
                  name="nombre"
                  type="text"
                  value={formData.nombre}
                  onChange={handleChange}
                  placeholder="Juan"
                  className="pl-10"
                  required
                  disabled={isLoading}
                />
              </div>
            </div>

            {/* Apellido */}
            <div>
              <Label htmlFor="apellido">
                Apellido <span className="text-red-500">*</span>
              </Label>
              <div className="mt-1 relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="apellido"
                  name="apellido"
                  type="text"
                  value={formData.apellido}
                  onChange={handleChange}
                  placeholder="Pérez"
                  className="pl-10"
                  required
                  disabled={isLoading}
                />
              </div>
            </div>

            {/* Celular */}
            <div>
              <Label htmlFor="celular">
                Celular <span className="text-red-500">*</span>
              </Label>
              <div className="mt-1 relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="celular"
                  name="celular"
                  type="tel"
                  value={formData.celular}
                  onChange={handleChange}
                  placeholder="+598 99 123 456"
                  className="pl-10"
                  required
                  disabled={isLoading}
                />
              </div>
              <p className="mt-1 text-xs text-gray-500">
                Formato: +598 99 123 456
              </p>
            </div>

            {/* Fecha de Nacimiento */}
            <div>
              <Label htmlFor="fechaNacimiento">
                Fecha de Nacimiento <span className="text-red-500">*</span>
              </Label>
              <div className="mt-1 relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="fechaNacimiento"
                  name="fechaNacimiento"
                  type="date"
                  value={formData.fechaNacimiento}
                  onChange={handleChange}
                  max={new Date(Date.now() - 13 * 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}
                  className="pl-10"
                  required
                  disabled={isLoading}
                />
              </div>
              <p className="mt-1 text-xs text-gray-500">
                Debes tener al menos 13 años
              </p>
            </div>

            {/* Error */}
            {error && (
              <Alert variant="destructive">
                <XCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Botón de enviar */}
            <Button
              type="submit"
              disabled={isLoading}
              className="w-full bg-green-600 hover:bg-green-700"
              size="lg"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creando cuenta...
                </>
              ) : (
                'Completar registro'
              )}
            </Button>

            {/* Info adicional */}
            <div className="bg-green-50 rounded-lg p-4 space-y-2">
              <p className="text-xs font-medium text-green-800">
                🎯 Siguiente paso: Configurar tu perfil de jugador
              </p>
              <ul className="text-xs text-green-700 space-y-1">
                <li>• Posición favorita</li>
                <li>• Altura y peso</li>
                <li>• Foto de perfil</li>
              </ul>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
