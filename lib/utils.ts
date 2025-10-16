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