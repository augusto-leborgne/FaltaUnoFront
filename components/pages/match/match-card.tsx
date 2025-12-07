/**
 * ✅ OPTIMIZACIÓN: Match Card component con React.memo
 * 
 * Este componente solo se re-renderiza cuando las props relevantes cambian:
 * - match.id
 * - match.estado
 * - inscripcionEstado
 * 
 * Reduce renders innecesarios en listas largas de partidos.
 */

import React from 'react';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin, Calendar, Clock, Users } from "lucide-react";
import { PartidoDTO, InscripcionEstado } from "@/lib/api";
import { formatDateRegional, formatMatchType } from "@/lib/utils";

interface MatchCardProps {
  match: PartidoDTO;
  inscripcionEstado?: InscripcionEstado | null;
  onViewDetails: (matchId: string) => void;
  onJoin?: (matchId: string) => void;
  onCancel?: (matchId: string) => void;
}

/**
 * Internal component (not memoized) for rendering
 */
function MatchCardComponent({
  match,
  inscripcionEstado,
  onViewDetails,
  onJoin,
  onCancel,
}: MatchCardProps) {
  // Usar propiedades camelCase o snake_case dependiendo de lo que devuelva el backend
  const cantidadJugadores = match.cantidadJugadores || match.cantidad_jugadores || 0;
  const jugadoresActuales = match.jugadoresActuales || match.jugadores_actuales || 0;
  const cuposDisponibles = cantidadJugadores - jugadoresActuales;
  const estaLleno = cuposDisponibles <= 0;
  const estaInscrito = inscripcionEstado === InscripcionEstado.ACEPTADO;
  const tieneSolicitud = inscripcionEstado === InscripcionEstado.PENDIENTE;

  // Calcular color del badge de cupos
  const getCuposColor = () => {
    if (estaLleno) return "bg-red-500";
    if (cuposDisponibles <= 2) return "bg-yellow-500";
    return "bg-green-500";
  };

  // Formatear texto de disponibilidad: "Falta 1" o "Faltan n"
  const getDisponibilidadText = () => {
    if (estaLleno) return "Completo";
    if (cuposDisponibles === 1) return "Falta 1";
    return `Faltan ${cuposDisponibles}`;
  };

  // Formatear fecha y hora
  const fechaFormateada = formatDateRegional(match.fecha);
  const tipoFormateado = formatMatchType(match.tipoPartido || match.tipo_partido || "");

  return (
    <div
      className="bg-white rounded-lg border p-4 hover:shadow-md transition-all cursor-pointer"
      onClick={() => match.id && onViewDetails(match.id)}
    >
      {/* Header */}
      <div className="flex justify-between items-start mb-3">
        <div className="flex-1">
          <h3 className="font-bold text-lg">{match.nombreUbicacion || match.nombre_ubicacion}</h3>
          <p className="text-sm text-gray-600 flex items-center gap-1 mt-1">
            <MapPin className="w-3 h-3" />
            {match.direccionUbicacion || match.direccion_ubicacion || "Ubicación sin especificar"}
          </p>
        </div>
        
        {/* Cupos Badge */}
        <Badge className={`${getCuposColor()} text-white`}>
          {getDisponibilidadText()}
        </Badge>
      </div>

      {/* Info Row */}
      <div className="flex flex-wrap gap-2 mb-3 text-sm text-gray-600">
        <div className="flex items-center gap-1">
          <Calendar className="w-4 h-4" />
          <span>{fechaFormateada}</span>
        </div>
        <div className="flex items-center gap-1">
          <Clock className="w-4 h-4" />
          <span>{match.hora}</span>
        </div>
        <div className="flex items-center gap-1">
          <Users className="w-4 h-4" />
          <span>{tipoFormateado}</span>
        </div>
      </div>

      {/* Tags */}
      <div className="flex flex-wrap gap-2 mb-3">
        <Badge variant="outline">{match.nivel || "Intermedio"}</Badge>
        <Badge variant="outline">{match.genero || "Mixto"}</Badge>
        {(match.precioTotal || match.precio_total) && cantidadJugadores > 0 && (
          <Badge variant="outline">
            ${(((match.precioTotal || match.precio_total || 0) / cantidadJugadores).toFixed(0))} p/p
          </Badge>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
        {estaInscrito ? (
          <>
            <Button size="sm" variant="outline" className="flex-1" disabled>
              ✓ Inscrito
            </Button>
            {onCancel && match.id && (
              <Button
                size="sm"
                variant="destructive"
                onClick={() => onCancel(match.id!)}
              >
                Cancelar
              </Button>
            )}
          </>
        ) : tieneSolicitud ? (
          <Button size="sm" variant="outline" className="flex-1" disabled>
            Solicitud Pendiente
          </Button>
        ) : estaLleno ? (
          <Button size="sm" variant="outline" className="flex-1" disabled>
            Completo
          </Button>
        ) : (
          onJoin && match.id && (
            <Button
              size="sm"
              className="flex-1"
              onClick={() => onJoin(match.id!)}
            >
              Unirse
            </Button>
          )
        )}
        {match.id && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => onViewDetails(match.id!)}
          >
            Ver
          </Button>
        )}
      </div>
    </div>
  );
}

/**
 * ✅ OPTIMIZED: Memoized MatchCard
 * Only re-renders when relevant props change
 */
export const MatchCard = React.memo(MatchCardComponent, (prevProps, nextProps) => {
  // Custom comparison: only re-render if these props changed
  const prevJugadores = prevProps.match.jugadoresActuales || prevProps.match.jugadores_actuales || 0;
  const nextJugadores = nextProps.match.jugadoresActuales || nextProps.match.jugadores_actuales || 0;
  
  return (
    prevProps.match.id === nextProps.match.id &&
    prevProps.match.estado === nextProps.match.estado &&
    prevJugadores === nextJugadores &&
    prevProps.inscripcionEstado === nextProps.inscripcionEstado
  );
});

MatchCard.displayName = 'MatchCard';
