// src/types/partido.ts

/* ===========================
   ENUMS Y TIPOS BASE
=========================== */
export type Nivel = 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';
export type EstadoPartido = 'DISPONIBLE' | 'CONFIRMADO' | 'CANCELADO' | 'FINALIZADO';
export type TipoPartido = 'F5' | 'F7' | 'F8' | 'F9' | 'F11';
export type Genero = 'Mixto' | 'Hombres' | 'Mujeres';

/* ===========================
   USUARIO MINIMO (para UI)
=========================== */
export interface UsuarioMin {
  id: string;
  nombre?: string;
  apellido?: string;
  email?: string;
  _raw?: any; // opcional si necesitás el objeto completo del backend
}

/* ===========================
   ENTIDAD PARTIDO
=========================== */
export interface Partido {
  id?: string;

  tipo_partido: TipoPartido;
  genero?: Genero;

  fecha: string;               // yyyy-MM-dd
  hora: string;                // HH:mm:ss
  duracion: number;            // minutos

  nombre_ubicacion: string;
  direccion_ubicacion?: string;
  latitud?: number | null;
  longitud?: number | null;

  precio_total: number;
  cantidad_jugadores: number;
  jugadores_actuales?: number;

  estado?: EstadoPartido;

  organizador_id?: string;
  organizador?: UsuarioMin;    // cuando el backend devuelve objeto
  jugadores?: UsuarioMin[];    // lista de jugadores inscriptos

  descripcion?: string;
  created_at?: string;

  _raw?: any;                  // opcional, para guardar datos crudos si necesitás
}