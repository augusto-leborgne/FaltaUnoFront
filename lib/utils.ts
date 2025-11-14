import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Calcula la edad a partir de una fecha de nacimiento en formato yyyy-MM-dd
 * @param fechaNacimiento Fecha en formato yyyy-MM-dd (ej: "1990-05-15")
 * @returns Edad en años o null si la fecha es inválida
 */
export function calcularEdad(fechaNacimiento?: string | null): number | null {
  if (!fechaNacimiento) return null;
  
  try {
    const fecha = new Date(fechaNacimiento);
    if (isNaN(fecha.getTime())) return null;
    
    const hoy = new Date();
    let edad = hoy.getFullYear() - fecha.getFullYear();
    const mes = hoy.getMonth() - fecha.getMonth();
    
    if (mes < 0 || (mes === 0 && hoy.getDate() < fecha.getDate())) {
      edad--;
    }
    
    return edad >= 0 ? edad : null;
  } catch {
    return null;
  }
}

/**
 * Formatea una fecha de nacimiento a un string legible
 * @param fechaNacimiento Fecha en formato yyyy-MM-dd
 * @returns String formateado (ej: "15 de mayo de 1990")
 */
export function formatearFechaNacimiento(fechaNacimiento?: string | null): string {
  if (!fechaNacimiento) return '';
  
  try {
    const fecha = new Date(fechaNacimiento);
    if (isNaN(fecha.getTime())) return fechaNacimiento;
    
    return fecha.toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  } catch {
    return fechaNacimiento;
  }
}

/**
 * Formatea el tipo de partido a un string legible
 * @param type Tipo de partido (ej: "FUTBOL_5", "FUTBOL5")
 * @returns String formateado (ej: "Fútbol 5")
 */
export function formatMatchType(type?: string): string {
  if (!type) return "Fútbol";
  
  // Manejar tanto snake_case como formatos normales
  const normalizedType = type.toUpperCase().replace(/-/g, '_');
  
  const typeMap: Record<string, string> = {
    'FUTBOL_5': 'Fútbol 5',
    'FUTBOL5': 'Fútbol 5',
    'FUTBOL_7': 'Fútbol 7',
    'FUTBOL7': 'Fútbol 7',
    'FUTBOL_8': 'Fútbol 8',
    'FUTBOL8': 'Fútbol 8',
    'FUTBOL_9': 'Fútbol 9',
    'FUTBOL9': 'Fútbol 9',
    'FUTBOL_11': 'Fútbol 11',
    'FUTBOL11': 'Fútbol 11',
  };
  
  return typeMap[normalizedType] || type;
}

/**
 * Formatea el nivel de un partido a un string legible
 * @param level Nivel del partido (ej: "PRINCIPIANTE", "INTERMEDIO")
 * @returns String formateado (ej: "Principiante")
 */
export function formatLevel(level?: string): string {
  if (!level) return "Intermedio";
  
  const normalizedLevel = level.toUpperCase();
  
  const levelMap: Record<string, string> = {
    'PRINCIPIANTE': 'Principiante',
    'INTERMEDIO': 'Intermedio',
    'AVANZADO': 'Avanzado',
    'PROFESIONAL': 'Profesional'
  };
  
  return levelMap[normalizedLevel] || level;
}

/**
 * Formatea una fecha a un string legible
 * @param dateString Fecha en formato ISO o yyyy-MM-dd
 * @returns String formateado (ej: "lunes, 15 de mayo")
 */
export function formatDate(dateString: string): string {
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    
    return date.toLocaleDateString("es-ES", {
      weekday: "long",
      day: "numeric",
      month: "long",
    });
  } catch {
    return dateString;
  }
}

/**
 * Formatea una fecha en formato dd/mm/yyyy (formato regional para Uruguay/América Latina)
 * @param dateString Fecha en formato ISO, yyyy-MM-dd, o Date object
 * @returns String formateado (ej: "15/05/1990")
 */
export function formatDateRegional(dateString: string | Date | null | undefined): string {
  if (!dateString) return '';
  
  try {
    const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
    if (isNaN(date.getTime())) return '';
    
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    
    return `${day}/${month}/${year}`;
  } catch {
    return '';
  }
}

/**
 * Formatea una fecha en formato dd/mm (sin año) para tarjetas y vistas compactas
 * @param dateString Fecha en formato ISO, yyyy-MM-dd, o Date object
 * @returns String formateado (ej: "15/05")
 */
export function formatDateShort(dateString: string | Date | null | undefined): string {
  if (!dateString) return '';
  
  try {
    const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
    if (isNaN(date.getTime())) return '';
    
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    
    return `${day}/${month}`;
  } catch {
    return '';
  }
}

/**
 * Formatea una fecha y hora en formato dd/mm/yyyy HH:mm
 * @param dateString Fecha en formato ISO o Date object
 * @returns String formateado (ej: "15/05/2024 14:30")
 */
export function formatDateTimeRegional(dateString: string | Date | null | undefined): string {
  if (!dateString) return '';
  
  try {
    const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
    if (isNaN(date.getTime())) return '';
    
    const datePart = formatDateRegional(date);
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    
    return `${datePart} ${hours}:${minutes}`;
  } catch {
    return '';
  }
}

/**
 * Determina el color del badge según los espacios restantes
 * @param spotsLeft Espacios restantes
 * @returns Clases CSS para el badge
 */
export function getSpotsLeftColor(spotsLeft: number): string {
  if (spotsLeft === 0) return "bg-red-100 text-red-800";
  if (spotsLeft <= 3) return "bg-yellow-100 text-yellow-800";
  return "bg-green-100 text-green-800";
}