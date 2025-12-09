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
      className="bg-white rounded-xl xs:rounded-2xl border-2 border-gray-100 p-3 xs:p-4 sm:p-5 hover:shadow-lg hover:border-green-200 transition-all cursor-pointer touch-manipulation active:scale-[0.98]"
      onClick={() => match.id && onViewDetails(match.id)}
    >
      {/* Header */}
      <div className="flex justify-between items-start mb-2.5 xs:mb-3 gap-2">
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-base xs:text-lg sm:text-xl truncate">{match.nombreUbicacion || match.nombre_ubicacion}</h3>
          <p className="text-xs xs:text-sm text-gray-600 flex items-center gap-1 mt-1 truncate">
            <MapPin className="w-3 xs:w-3.5 h-3 xs:h-3.5 flex-shrink-0" />
            <span className="truncate">{match.direccionUbicacion || match.direccion_ubicacion || "Ubicación sin especificar"}</span>
          </p>
        </div>
        
        {/* Cupos Badge */}
        <Badge className={`${getCuposColor()} text-white text-xs xs:text-sm font-bold whitespace-nowrap flex-shrink-0`}>
          {getDisponibilidadText()}
        </Badge>
      </div>

      {/* Info Row */}
      <div className="flex flex-wrap gap-2 xs:gap-2.5 mb-2.5 xs:mb-3 text-xs xs:text-sm text-gray-600">
        <div className="flex items-center gap-1 xs:gap-1.5">
          <Calendar className="w-3.5 xs:w-4 h-3.5 xs:h-4 flex-shrink-0" />
          <span className="font-medium">{fechaFormateada}</span>
        </div>
        <div className="flex items-center gap-1 xs:gap-1.5">
          <Clock className="w-3.5 xs:w-4 h-3.5 xs:h-4 flex-shrink-0" />
          <span className="font-medium">{match.hora}</span>
        </div>
        <div className="flex items-center gap-1 xs:gap-1.5">
          <Users className="w-3.5 xs:w-4 h-3.5 xs:h-4 flex-shrink-0" />
          <span className="font-medium">{tipoFormateado}</span>
        </div>
      </div>

      {/* Tags */}
      <div className="flex flex-wrap gap-1.5 xs:gap-2 mb-3 xs:mb-3.5">
        <Badge variant="outline" className="text-xs xs:text-sm font-semibold">{match.nivel || "Intermedio"}</Badge>
        <Badge variant="outline" className="text-xs xs:text-sm font-semibold">{match.genero || "Mixto"}</Badge>
        {(match.precioTotal || match.precio_total) && cantidadJugadores > 0 && (
          <Badge variant="outline" className="text-xs xs:text-sm font-semibold">
            ${(((match.precioTotal || match.precio_total || 0) / cantidadJugadores).toFixed(0))} p/p
          </Badge>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-2 xs:gap-2.5" onClick={(e) => e.stopPropagation()}>
        {estaInscrito ? (
          <>
            <Button size="sm" variant="outline" className="flex-1 min-h-[44px] text-xs xs:text-sm font-semibold" disabled>
              ✓ Inscrito
            </Button>
            {onCancel && match.id && (
              <Button
                size="sm"
                variant="destructive"
                className="min-h-[44px] text-xs xs:text-sm font-semibold"
                onClick={() => onCancel(match.id!)}
              >
                Cancelar
              </Button>
            )}
          </>
        ) : tieneSolicitud ? (
          <Button size="sm" variant="outline" className="flex-1 min-h-[44px] text-xs xs:text-sm font-semibold" disabled>
            Solicitud Pendiente
          </Button>
        ) : estaLleno ? (
          <Button size="sm" variant="outline" className="flex-1 min-h-[44px] text-xs xs:text-sm font-semibold" disabled>
            Completo
          </Button>
        ) : (
          onJoin && match.id && (
            <Button
              size="sm"
              className="flex-1 min-h-[44px] text-xs xs:text-sm font-semibold"
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
            className="min-h-[44px] min-w-[64px] text-xs xs:text-sm font-semibold"
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
