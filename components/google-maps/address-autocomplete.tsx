/// <reference types="google.maps" />
"use client";

import React, { useEffect, useRef, useState } from "react";
import { googleMapsLoader } from "@/lib/google-maps-loader";
import { X, MapPin } from "lucide-react";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { logger } from "@/lib/logger";

type Props = {
  value?: string;
  onChange: (
    address: string, 
    placeDetails?: google.maps.places.PlaceResult | null
  ) => void;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  hasError?: boolean;
};

export function AddressAutocomplete({
  value = "",
  onChange,
  placeholder = "Ubicación",
  required = false,
  disabled = false,
  hasError = false,
}: Props) {
  const [query, setQuery] = useState(value);
  const [suggestions, setSuggestions] = useState<google.maps.places.AutocompletePrediction[]>([]);
  const [isLoadingMaps, setIsLoadingMaps] = useState(true);
  const [mapsError, setMapsError] = useState<string | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSelectedAddress, setHasSelectedAddress] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  
  // ✅ MODERNO: Solo necesitamos sessionToken (no más PlacesService)
  const sessionTokenRef = useRef<google.maps.places.AutocompleteSessionToken | null>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const isSelectingRef = useRef(false); // Prevenir handleBlur durante selección

  // Sincronizar valor externo
  useEffect(() => {
    setQuery(value);
    // Si el valor externo cambia y tiene contenido, marcar como seleccionado
    if (value && value.length > 0) {
      setHasSelectedAddress(true);
    }
  }, [value]);

  // Cargar Google Maps
  useEffect(() => {
    let mounted = true;

    const loadMaps = async () => {
      try {
        logger.log("[AddressAutocomplete] 🔄 Iniciando carga de Google Maps...");
        
        // ✅ Explícitamente solicitar Places API con timeout generoso
        await googleMapsLoader.load({ 
          libraries: ["places"],
          forceRetry: false 
        });
        
        if (!mounted) return;

        logger.log("[AddressAutocomplete] ✅ Google Maps loader completado");

        // ✅ Verificar que Places esté disponible
        if (window.google?.maps?.places) {
          logger.log("[AddressAutocomplete] ✅ Places API detectada, inicializando servicios...");
          
          // ✅ MODERNO: Solo crear session token (no necesitamos PlacesService)
          sessionTokenRef.current = new window.google.maps.places.AutocompleteSessionToken();
          
          logger.log("✅ [AddressAutocomplete] Servicios de Google Maps inicializados correctamente");
          setIsLoadingMaps(false);
        } else {
          // ❌ Places API no está disponible después de esperar
          logger.error("❌ [AddressAutocomplete] Places API NO disponible después de cargar");
          logger.error("Verificar:");
          logger.error("- API key en NEXT_PUBLIC_GOOGLE_MAPS_API_KEY");
          logger.error("- Places API habilitada en Google Cloud Console");
          logger.error("- Restricciones de API key permiten el dominio");
          
          setMapsError("Places API no disponible. Verifica la configuración de la API key.");
          setIsLoadingMaps(false);
        }
      } catch (error) {
        logger.error("❌ [AddressAutocomplete] Error cargando Google Maps:", error);
        if (mounted) {
          const errorMsg = error instanceof Error ? error.message : "Error desconocido";
          setMapsError(`Error al cargar Google Maps: ${errorMsg}`);
          setIsLoadingMaps(false);
        }
      }
    };

    loadMaps();

    return () => {
      mounted = false;
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  // ✅ MODERNO: Buscar predicciones con AutocompleteSuggestion
  const fetchPredictions = async (input: string) => {
    if (!window.google?.maps?.places?.AutocompleteSuggestion || !input.trim()) {
      setSuggestions([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);

    try {
      const request: any = {
        input: input.trim(),
        includedPrimaryTypes: ['street_address', 'premise', 'subpremise', 'establishment'], // Direcciones y lugares específicos
        // ✅ SIMPLE: Solo usar includedRegionCodes (suficiente para filtrar por país)
        includedRegionCodes: ['UY'], // ISO 3166-1 alpha-2 code para Uruguay
        language: 'es', // Idioma español
        region: 'uy', // Región Uruguay
        sessionToken: sessionTokenRef.current || undefined,
      };

      // ✅ NUEVA API: fetchAutocompleteSuggestions (retorna Promise)
      const response: any = 
        await (window.google.maps.places.AutocompleteSuggestion as any).fetchAutocompleteSuggestions(request);

      const autocompleteSuggestions = response.suggestions || [];

      logger.log("[AddressAutocomplete] 🔍 Suggestions raw:", autocompleteSuggestions);

      // Convertir AutocompleteSuggestion[] a AutocompletePrediction[] para compatibilidad
      const predictions: any[] = autocompleteSuggestions.map((suggestion: any) => {
        const placePred = suggestion.placePrediction;
        const mainText = placePred?.structuredFormat?.mainText?.text || placePred?.text?.text || '';
        const secondaryText = placePred?.structuredFormat?.secondaryText?.text || '';
        
        logger.log("[AddressAutocomplete] 📍", {
          mainText,
          secondaryText,
          placeId: placePred?.placeId,
          fullText: placePred?.text?.text,
        });

        return {
          description: placePred?.text?.text || '',
          place_id: placePred?.placeId || '',
          matched_substrings: placePred?.text?.matches || [],
          structured_formatting: {
            main_text: mainText,
            main_text_matched_substrings: placePred?.structuredFormat?.mainText?.matches || [],
            secondary_text: secondaryText,
          },
          terms: [],
          types: placePred?.types || [],
          reference: '',
        };
      });

      logger.log("[AddressAutocomplete] ✅ Predictions procesadas:", predictions);

      setSuggestions(predictions);
      setIsSearching(false);
    } catch (error) {
      logger.warn("[AddressAutocomplete] Error en predicciones:", error);
      setSuggestions([]);
      setIsSearching(false);
    }
  };

  // Manejar cambio de input
  const handleInputChange = (newValue: string) => {
    setQuery(newValue);
    setHasSelectedAddress(false); // Usuario está escribiendo manualmente
    setValidationError(null); // Limpiar error al escribir
    // ❌ NO llamar onChange aquí - solo cuando se seleccione una sugerencia

    // Limpiar timer anterior
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Debounce de 300ms
    if (newValue.trim().length >= 1) {
      debounceTimerRef.current = setTimeout(() => {
        fetchPredictions(newValue);
      }, 300);
    } else {
      setSuggestions([]);
      setIsSearching(false);
    }
  };

  // ⚠️ VALIDACIÓN ESTRICTA: Solo direcciones de la lista
  const handleBlur = () => {
    // Delay para permitir que el click en sugerencia se procese primero
    setTimeout(() => {
      // Si está en proceso de selección, no validar
      if (isSelectingRef.current) {
        return;
      }
      
      if (query && !hasSelectedAddress) {
        setValidationError("Debes seleccionar una dirección de las sugerencias");
        setQuery("");
        onChange("", null);
      }
    }, 200);
  };

  // ✅ VALIDACIÓN MUY ESTRICTA: Solo direcciones completas o lugares con nombre
  const isAddressSpecific = (place: any): boolean => {
    const addressComponents = place.address_components || [];
    
    logger.log("[AddressAutocomplete] 🔍 Validando dirección:", {
      name: place.name,
      formatted_address: place.formatted_address,
      types: place.types,
      components: addressComponents.map((c: any) => ({ types: c.types, name: c.long_name })),
    });
    
    // ✅ REGLA 1: Verificar si tiene número de calle (street_number)
    const hasStreetNumber = addressComponents.some(
      (component: any) => component.types.includes('street_number')
    );
    
    // ✅ REGLA 2: Verificar si es un lugar específico con nombre
    // Debe tener tipo de establecimiento Y un nombre diferente a la dirección formateada
    const hasEstablishmentType = place.types?.some((type: string) => 
      ['establishment', 'point_of_interest', 'premise', 'subpremise', 'store', 'restaurant', 'cafe', 'school', 'hospital'].includes(type)
    );
    
    const hasDisplayName = !!(place.name && place.name !== place.formatted_address);
    const isNamedPlace = hasEstablishmentType && hasDisplayName;
    
    // ❌ REGLA 3: Rechazar explícitamente ciertos tipos
    // route = solo nombre de calle sin número
    // locality = ciudad
    // administrative_area = departamento/estado/país
    // neighborhood = barrio
    const hasInvalidType = place.types?.some((type: string) => 
      ['route', 'locality', 'administrative_area_level_1', 'administrative_area_level_2', 'country', 'neighborhood', 'political'].includes(type)
    );
    
    // Si TODOS los types son inválidos, rechazar
    const allTypesInvalid = place.types?.length > 0 && place.types.every((type: string) => 
      ['route', 'locality', 'administrative_area_level_1', 'administrative_area_level_2', 'country', 'neighborhood', 'political'].includes(type)
    );
    
    logger.log("[AddressAutocomplete] ✅ Validación:", {
      hasStreetNumber,
      isNamedPlace,
      hasEstablishmentType,
      hasDisplayName,
      hasInvalidType,
      allTypesInvalid,
    });
    
    if (allTypesInvalid) {
      logger.warn("[AddressAutocomplete] ❌ RECHAZADO: Todos los tipos son inválidos (calle/barrio/ciudad)");
      return false;
    }
    
    // ✅ ACEPTAR SOLO SI:
    // 1. Tiene número de calle (dirección completa), O
    // 2. Es un lugar con nombre (establecimiento, punto de interés)
    const isValid = hasStreetNumber || isNamedPlace;
    
    if (!isValid) {
      logger.warn("[AddressAutocomplete] ❌ RECHAZADO: No tiene número de calle ni es lugar con nombre");
    }
    
    return isValid;
  };

  // ✅ MODERNO: Seleccionar una predicción y obtener detalles con Place.fetchFields()
  const selectPrediction = async (prediction: google.maps.places.AutocompletePrediction) => {
    isSelectingRef.current = true; // Marcar que estamos seleccionando
    
    setQuery(prediction.description);
    setSuggestions([]);
    setIsSearching(false);
    setHasSelectedAddress(true); // Usuario ha seleccionado una dirección válida
    setValidationError(null); // Limpiar error al seleccionar

    try {
      // ✅ NUEVA API: Place.fetchFields() en vez de PlacesService.getDetails()
      const { Place } = await window.google.maps.importLibrary("places") as any;
      
      const place = new Place({
        id: prediction.place_id,
      });

      // Fetch los campos que necesitamos
      await place.fetchFields({
        fields: ['location', 'formattedAddress', 'displayName', 'addressComponents', 'types'],
      });

      // Convertir a formato compatible con PlaceResult
      const placeResult: any = {
        place_id: prediction.place_id,
        formatted_address: place.formattedAddress,
        name: place.displayName,
        geometry: {
          location: place.location,
        },
        address_components: place.addressComponents?.map((comp: any) => ({
          long_name: comp.longText,
          short_name: comp.shortText,
          types: comp.types,
        })) || [],
        types: place.types || [],
      };

      // Validar que sea una dirección específica
      if (!isAddressSpecific(placeResult)) {
        logger.warn("[AddressAutocomplete] ❌ Dirección rechazada - no es específica");
        setValidationError("Debes seleccionar una dirección completa con número de calle o un lugar específico de Google Maps");
        setQuery("");
        setHasSelectedAddress(false);
        onChange("", null);
        isSelectingRef.current = false; // Limpiar flag
        return;
      }
      
      onChange(prediction.description, placeResult);
      
      // Renovar session token después de obtener detalles
      if (window.google?.maps?.places) {
        sessionTokenRef.current = new window.google.maps.places.AutocompleteSessionToken();
      }
    } catch (error) {
      logger.warn("[AddressAutocomplete] Error obteniendo detalles:", error);
      onChange(prediction.description, null);
    } finally {
      isSelectingRef.current = false; // Siempre limpiar el flag
    }
  };

  // Limpiar búsqueda
  const handleClear = () => {
    setQuery("");
    setSuggestions([]);
    setHasSelectedAddress(false); // Resetear estado de selección
    setValidationError(null); // Limpiar error
    onChange("", null);
  };

  // Cerrar sugerencias al hacer clic afuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setSuggestions([]);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Render de estado de carga
  if (isLoadingMaps) {
    return (
      <div className="relative">
        <div className="w-full py-3 px-4 rounded-xl border border-gray-300 bg-gray-50 flex items-center">
          <LoadingSpinner size="sm" variant="gray" className="mr-2" />
          <span className="text-gray-500 text-sm">Cargando mapa...</span>
        </div>
      </div>
    );
  }

  // Render de error
  if (mapsError) {
    return (
      <div className="relative">
        <div className="w-full py-3 px-4 rounded-xl border border-red-300 bg-red-50">
          <p className="text-red-600 text-sm">{mapsError}</p>
          <p className="text-red-500 text-xs mt-1">
            Verifica que NEXT_PUBLIC_GOOGLE_MAPS_API_KEY esté configurada
          </p>
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative">
      {/* Input */}
      <div className="relative">
        <MapPin className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 pointer-events-none ${
          hasSelectedAddress 
            ? 'text-green-600' 
            : hasError || (required && query && !hasSelectedAddress)
            ? 'text-red-500'
            : 'text-gray-400'
        }`} />
        
        <input
          className={`w-full py-3 pl-10 pr-10 rounded-xl border bg-white focus:outline-none focus:ring-2 disabled:bg-gray-100 disabled:cursor-not-allowed ${
            hasSelectedAddress 
              ? 'border-green-500 bg-green-50 focus:ring-green-500 focus:border-transparent' 
              : hasError || (required && query && !hasSelectedAddress)
              ? 'border-red-500 focus:ring-red-500 focus:border-transparent'
              : 'border-gray-300 focus:ring-green-500 focus:border-transparent'
          }`}
          placeholder={placeholder}
          value={query}
          required={required}
          disabled={disabled}
          onChange={(e) => handleInputChange(e.target.value)}
          onBlur={handleBlur}
          autoComplete="off"
        />

        {/* Indicador de búsqueda o botón limpiar */}
        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
          {isSearching ? (
            <LoadingSpinner size="sm" variant="gray" />
          ) : query ? (
            <button
              type="button"
              onClick={handleClear}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          ) : null}
        </div>
      </div>

      {/* Mensaje de error de validación */}
      {validationError && (
        <div className="mt-2 text-xs text-red-600">
          {validationError}
        </div>
      )}

      {/* Sugerencias */}
      {suggestions.length > 0 && (
        <div className="absolute z-50 bottom-full mb-1 w-full bg-white border border-gray-300 rounded-xl shadow-lg max-h-56 overflow-auto">
          {suggestions.map((suggestion) => (
            <button
              key={suggestion.place_id}
              type="button"
              onClick={() => selectPrediction(suggestion)}
              className="w-full p-3 hover:bg-gray-50 text-left transition-colors flex items-start space-x-2"
            >
              <MapPin className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-900 truncate">
                  {suggestion.structured_formatting.main_text}
                </p>
                <p className="text-xs text-gray-500 truncate">
                  {suggestion.structured_formatting.secondary_text}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Mensaje de no resultados */}
      {query.length >= 1 && suggestions.length === 0 && !isSearching && !hasSelectedAddress && (
        <div className="absolute z-50 bottom-full mb-1 w-full bg-white border border-gray-300 rounded-xl shadow-lg p-3">
          <p className="text-sm text-gray-500 text-center">
            No se encontraron ubicaciones
          </p>
        </div>
      )}
    </div>
  );
}

export default AddressAutocomplete;