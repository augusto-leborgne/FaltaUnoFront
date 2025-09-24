// src/types/partido.ts
export type Nivel = 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';
export type EstadoPartido = 'PENDIENTE' | 'CONFIRMADO' | 'CANCELADO' | 'FINALIZADO';

export interface Ubicacion {
  nombreUbicacion: string;
  direccionUbicacion?: string;
  latitud?: number | null;
  longitud?: number | null;
}

export interface UsuarioMin {
  id: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  rating?: number | null;
  // agrega campos que uses en UI
}

export interface PartidoFront {
  id?: string;
  tipoPartido: 'F5' | 'F7' | 'F8' | 'F9' | 'F11' | string;
  genero?: 'Mixto' | 'Hombres' | 'Mujeres' | string;
  fecha: string;               // yyyy-MM-dd
  hora: string;                // HH:mm:ss
  duracionMinutos: number;
  ubicacion: Ubicacion;        // object convenience for UI
  precioTotal: number;
  cantidadJugadores: number;
  jugadoresActuales?: number;
  estado?: EstadoPartido;
  organizadorId?: string;      // enviar al crear
  organizador?: UsuarioMin;    // cuando el backend devuelve objeto
  jugadores?: UsuarioMin[];
  descripcion?: string;
  createdAt?: string;
  // campo raw si necesitás
  _raw?: any;
}
