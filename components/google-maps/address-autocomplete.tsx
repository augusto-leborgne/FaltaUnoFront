/// <reference types="google.maps" />
"use client";

import React, { useEffect, useRef, useState } from "react";
import { googleMapsLoader } from "@/lib/google-maps-loader";
import { X, MapPin } from "lucide-react";
import { LoadingSpinner } from "@/components/ui/loading-spinner";

type Props = {
  value?: string;
  onChange: (
    address: string, 
    placeDetails?: google.maps.places.PlaceResult | null
  ) => void;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
};

export function AddressAutocomplete({
  value = "",
  onChange,
  placeholder = "Ubicación",
  required = false,
  disabled = false,
}: Props) {
  const [query, setQuery] = useState(value);
  const [suggestions, setSuggestions] = useState<google.maps.places.AutocompletePrediction[]>([]);
  const [isLoadingMaps, setIsLoadingMaps] = useState(true);
  const [mapsError, setMapsError] = useState<string | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSelectedAddress, setHasSelectedAddress] = useState(false);
  
  // ✅ MODERNO: Usar AutocompleteSuggestion en lugar de AutocompleteService
  const placesServiceRef = useRef<google.maps.places.PlacesService | null>(null);
  const sessionTokenRef = useRef<google.maps.places.AutocompleteSessionToken | null>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

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
        console.log("[AddressAutocomplete] 🔄 Iniciando carga de Google Maps...");
        
        // ✅ Explícitamente solicitar Places API con timeout generoso
        await googleMapsLoader.load({ 
          libraries: ["places"],
          forceRetry: false 
        });
        
        if (!mounted) return;

        console.log("[AddressAutocomplete] ✅ Google Maps loader completado");

        // ✅ Verificar que Places esté disponible
        if (window.google?.maps?.places) {
          console.log("[AddressAutocomplete] ✅ Places API detectada, inicializando servicios...");
          
          // ✅ MODERNO: Solo PlacesService (AutocompleteSuggestion no necesita inicialización)
          const dummyDiv = document.createElement("div");
          placesServiceRef.current = new window.google.maps.places.PlacesService(dummyDiv);
          
          // Crear session token para optimizar requests
          sessionTokenRef.current = new window.google.maps.places.AutocompleteSessionToken();
          
          console.log("✅ [AddressAutocomplete] Servicios de Google Maps inicializados correctamente");
          setIsLoadingMaps(false);
        } else {
          // ❌ Places API no está disponible después de esperar
          console.error("❌ [AddressAutocomplete] Places API NO disponible después de cargar");
          console.error("Verificar:");
          console.error("- API key en NEXT_PUBLIC_GOOGLE_MAPS_API_KEY");
          console.error("- Places API habilitada en Google Cloud Console");
          console.error("- Restricciones de API key permiten el dominio");
          
          setMapsError("Places API no disponible. Verifica la configuración de la API key.");
          setIsLoadingMaps(false);
        }
      } catch (error) {
        console.error("❌ [AddressAutocomplete] Error cargando Google Maps:", error);
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
        locationRestriction: {
          country: 'uy', // Restringir a Uruguay
        },
        sessionToken: sessionTokenRef.current || undefined,
      };

      // ✅ NUEVA API: fetchAutocompleteSuggestions (retorna Promise)
      const response: any = 
        await (window.google.maps.places.AutocompleteSuggestion as any).fetchAutocompleteSuggestions(request);

      const autocompleteSuggestions = response.suggestions || [];

      // Convertir AutocompleteSuggestion[] a AutocompletePrediction[] para compatibilidad
      const predictions: any[] = autocompleteSuggestions.map((suggestion: any) => ({
        description: suggestion.placePrediction?.text?.text || '',
        place_id: suggestion.placePrediction?.placeId || '',
        matched_substrings: suggestion.placePrediction?.text?.matches || [],
        structured_formatting: {
          main_text: suggestion.placePrediction?.structuredFormat?.mainText?.text || '',
          main_text_matched_substrings: suggestion.placePrediction?.structuredFormat?.mainText?.matches || [],
          secondary_text: suggestion.placePrediction?.structuredFormat?.secondaryText?.text || '',
        },
        terms: [],
        types: suggestion.placePrediction?.types || [],
        reference: '', // Campo requerido por el tipo legacy
      }));

      setSuggestions(predictions);
      setIsSearching(false);
    } catch (error) {
      console.warn("[AddressAutocomplete] Error en predicciones:", error);
      setSuggestions([]);
      setIsSearching(false);
    }
  };

  // Manejar cambio de input
  const handleInputChange = (newValue: string) => {
    setQuery(newValue);
    setHasSelectedAddress(false); // Usuario está escribiendo manualmente
    onChange(newValue, null);

    // Limpiar timer anterior
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Debounce de 300ms
    if (newValue.trim().length >= 2) {
      debounceTimerRef.current = setTimeout(() => {
        fetchPredictions(newValue);
      }, 300);
    } else {
      setSuggestions([]);
      setIsSearching(false);
    }
  };

  // Validar al perder el foco
  const handleBlur = () => {
    // Si hay texto pero no se seleccionó de la lista, advertir
    if (query && !hasSelectedAddress) {
      console.warn("[AddressAutocomplete] Dirección no seleccionada de la lista");
      // Mostrar mensaje de advertencia después de un pequeño delay para que el clic en sugerencia funcione
      setTimeout(() => {
        if (query && !hasSelectedAddress) {
          alert("Por favor selecciona una dirección de las sugerencias para asegurar la ubicación exacta");
          setQuery("");
          onChange("", null);
        }
      }, 200);
    }
  };

  // Validar que la dirección sea específica (no solo ciudad/país/zona)
  const isAddressSpecific = (place: google.maps.places.PlaceResult): boolean => {
    const addressComponents = place.address_components || [];
    
    // Verificar si tiene número de calle (street_number)
    const hasStreetNumber = addressComponents.some(
      component => component.types.includes('street_number')
    );
    
    // O si es un lugar específico con nombre (establecimiento, complejo, etc.)
    const isNamedPlace = !!(place.name && place.name !== place.formatted_address);
    
    // La dirección es válida si tiene número de calle O es un lugar con nombre
    return hasStreetNumber || isNamedPlace;
  };

  // Seleccionar una predicción
  const selectPrediction = (prediction: google.maps.places.AutocompletePrediction) => {
    setQuery(prediction.description);
    setSuggestions([]);
    setIsSearching(false);
    setHasSelectedAddress(true); // Usuario ha seleccionado una dirección válida

    if (!placesServiceRef.current) {
      onChange(prediction.description, null);
      return;
    }

    // Obtener detalles del lugar
    const request: google.maps.places.PlaceDetailsRequest = {
      placeId: prediction.place_id,
      fields: ['geometry', 'formatted_address', 'name', 'address_components', 'types'],
      sessionToken: sessionTokenRef.current || undefined,
    };

    placesServiceRef.current.getDetails(request, (place, status) => {
      if (status === window.google.maps.places.PlacesServiceStatus.OK && place) {
        // Validar que sea una dirección específica
        if (!isAddressSpecific(place)) {
          console.warn("[AddressAutocomplete] Dirección no específica, rechazando");
          alert("Por favor selecciona una dirección exacta con número de calle o un lugar específico (no solo ciudad/barrio/zona)");
          setQuery("");
          setHasSelectedAddress(false);
          onChange("", null);
          return;
        }
        
        onChange(prediction.description, place);
        
        // Renovar session token después de obtener detalles
        if (window.google?.maps?.places) {
          sessionTokenRef.current = new window.google.maps.places.AutocompleteSessionToken();
        }
      } else {
        console.warn("[AddressAutocomplete] Error obteniendo detalles:", status);
        onChange(prediction.description, null);
      }
    });
  };

  // Limpiar búsqueda
  const handleClear = () => {
    setQuery("");
    setSuggestions([]);
    setHasSelectedAddress(false); // Resetear estado de selección
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
          hasSelectedAddress ? 'text-green-600' : 'text-gray-400'
        }`} />
        
        <input
          className={`w-full py-3 pl-10 pr-10 rounded-xl border bg-white focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed ${
            hasSelectedAddress 
              ? 'border-green-500 bg-green-50' 
              : 'border-gray-300'
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

      {/* Sugerencias */}
      {suggestions.length > 0 && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-gray-300 rounded-xl shadow-lg max-h-56 overflow-auto">
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
      {query.length >= 2 && suggestions.length === 0 && !isSearching && !hasSelectedAddress && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-gray-300 rounded-xl shadow-lg p-3">
          <p className="text-sm text-gray-500 text-center">
            No se encontraron ubicaciones
          </p>
        </div>
      )}
    </div>
  );
}

export default AddressAutocomplete;