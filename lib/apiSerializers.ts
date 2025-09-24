// src/lib/apiSerializers.ts
// Serializadores entre el modelo frontend (camelCase) y la API del backend (español snake_case).
// Ajustado al Match interface que tenés en lib/api.ts

export function matchToApi(front: any): Record<string, any> {
  const tipo = front.type ?? front.tipo_partido ?? front.tipo ?? front.matchType;
  const genero = front.level /* nota: front.level es nivel, no genero */ ? undefined : front.gender ?? front.genero;
  // En tu front, 'level' es dificultad. Backend espera 'level' también; 'genero' puede venir separado.
  const fecha = front.date ?? front.fecha;
  let hora = front.time ?? front.hora ?? '';
  if (hora && hora.split(':').length === 2) hora = `${hora}:00`;

  // location object expected by front
  const location = front.location ?? {};
  const nombreUbicacion = location.name ?? front.locationName ?? front.nombre_ubicacion ?? '';
  const direccionUbicacion = location.address ?? front.location?.address ?? front.direccion_ubicacion ?? '';
  const lat = location.latitude ?? location.lat ?? front.latitud ?? front.latitude ?? null;
  const lng = location.longitude ?? location.lng ?? front.longitud ?? front.longitude ?? null;

  // price / players
  const precio = front.price ?? front.precio ?? front.precio_total ?? 0;
  const maxPlayers = front.maxPlayers ?? front.cantidad_jugadores ?? front.max_jugadores ?? 10;
  const duracion = front.durationMinutes ?? front.duracion_minutos ?? front.duracion ?? 90;
  const descripcion = front.description ?? front.descripcion ?? front.title ?? '';

  // organizador: try several locations (front may have captain or current user)
  const organizadorId =
    front.organizador_id ??
    front.organizadorId ??
    front.captain?.id ??
    front.captainId ??
    front.creatorId ??
    front.userId ??
    null;

  return {
    tipo_partido: tipo,
    genero: front.gender ?? front.genero ?? undefined,
    level: front.level ?? undefined,              // si usás level
    fecha,
    hora,
    duracion_minutos: Number(duracion),
    nombre_ubicacion: nombreUbicacion,
    direccion_ubicacion: direccionUbicacion,
    latitud: lat !== null ? Number(lat) : null,
    longitud: lng !== null ? Number(lng) : null,
    cantidad_jugadores: Number(maxPlayers),
    precio_total: Number(precio),
    descripcion,
    organizador_id: organizadorId
  };
}

export function matchFromApi(api: any): any {
  if (!api) return api;

  const location = {
    name: api.nombre_ubicacion ?? api.location_name ?? (api.location && api.location.name) ?? '',
    address: api.direccion_ubicacion ?? api.location_address ?? (api.location && api.location.address) ?? '',
    latitude: api.latitud ?? api.location_latitude ?? (api.location && api.location.latitude) ?? null,
    longitude: api.longitud ?? api.location_longitude ?? (api.location && api.location.longitude) ?? null
  };

  const hora = api.hora ?? api.time ?? '';

  const frontend = {
    id: api.id,
    title: api.descripcion ?? api.title ?? '',
    description: api.descripcion ?? api.description ?? '',
    date: api.fecha ?? api.date,
    time: hora,
    type: api.tipo_partido ?? api.type ?? api.match_type,
    level: api.level ?? api.nivel ?? undefined,
    price: api.precio_total ?? api.price ?? 0,
    maxPlayers: api.cantidad_jugadores ?? api.maxPlayers ?? 0,
    currentPlayers: api.jugadores_actuales ?? api.currentPlayers ?? api.current_players ?? 0,
    status: api.estado ?? api.status,
    location,
    captain: api.organizador ?? (api.captain ? api.captain : undefined),
    players: (api.players ?? api.jugadores ?? api.inscripciones ?? [])
      .map((p: any) => {
        if (p.usuario) {
          return {
            id: p.usuario.id,
            firstName: p.usuario.nombre ?? p.usuario.firstName ?? '',
            lastName: p.usuario.apellido ?? p.usuario.lastName ?? '',
            email: p.usuario.email ?? ''
          };
        }
        // if it's already a user object
        return {
          id: p.id ?? p.usuario_id ?? p.userId,
          firstName: p.firstName ?? p.nombre ?? '',
          lastName: p.lastName ?? p.apellido ?? '',
          email: p.email ?? ''
        };
      }),
    organizador_id: api.organizador_id ?? (api.organizador && api.organizador.id) ?? null,
    // preserve raw api for debugging if needed
    _raw: api
  };

  return frontend;
}