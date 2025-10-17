/// <reference types="google.maps" />
"use client";

import React, { useEffect, useRef, useState } from "react";
import { googleMapsLoader } from "@/lib/google-maps-loader";
import { X, MapPin, Loader2 } from "lucide-react";

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
  
  const autocompleteServiceRef = useRef<google.maps.places.AutocompleteService | null>(null);
  const placesServiceRef = useRef<google.maps.places.PlacesService | null>(null);
  const sessionTokenRef = useRef<google.maps.places.AutocompleteSessionToken | null>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Sincronizar valor externo
  useEffect(() => {
    setQuery(value);
  }, [value]);

  // Cargar Google Maps
  useEffect(() => {
    let mounted = true;

    googleMapsLoader
      .load()
      .then(() => {
        if (!mounted) return;

        try {
          // Inicializar servicios
          if (window.google?.maps?.places) {
            autocompleteServiceRef.current = new window.google.maps.places.AutocompleteService();
            
            // Para PlacesService necesitamos un elemento del DOM
            // Usamos un div oculto
            const dummyDiv = document.createElement("div");
            placesServiceRef.current = new window.google.maps.places.PlacesService(dummyDiv);
            
            // Crear session token para optimizar requests
            sessionTokenRef.current = new window.google.maps.places.AutocompleteSessionToken();
            
            console.log("✅ [AddressAutocomplete] Servicios de Google Maps inicializados");
            setIsLoadingMaps(false);
          } else {
            throw new Error("Google Maps Places API no disponible");
          }
        } catch (error) {
          console.error("❌ [AddressAutocomplete] Error inicializando servicios:", error);
          setMapsError("Error al inicializar Google Maps");
          setIsLoadingMaps(false);
        }
      })
      .catch((error) => {
        console.error("❌ [AddressAutocomplete] Error cargando Google Maps:", error);
        if (mounted) {
          setMapsError(error.message || "Error al cargar Google Maps");
          setIsLoadingMaps(false);
        }
      });

    return () => {
      mounted = false;
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  // Buscar predicciones
  const fetchPredictions = (input: string) => {
    if (!autocompleteServiceRef.current || !input.trim()) {
      setSuggestions([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);

    const request: google.maps.places.AutocompletionRequest = {
      input: input.trim(),
      componentRestrictions: { country: "uy" },
      sessionToken: sessionTokenRef.current || undefined,
    };

    autocompleteServiceRef.current.getPlacePredictions(
      request,
      (predictions, status) => {
        setIsSearching(false);

        if (status === window.google.maps.places.PlacesServiceStatus.OK && predictions) {
          setSuggestions(predictions);
        } else if (status === window.google.maps.places.PlacesServiceStatus.ZERO_RESULTS) {
          setSuggestions([]);
        } else {
          console.warn("[AddressAutocomplete] Error en predicciones:", status);
          setSuggestions([]);
        }
      }
    );
  };

  // Manejar cambio de input
  const handleInputChange = (newValue: string) => {
    setQuery(newValue);
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

  // Seleccionar una predicción
  const selectPrediction = (prediction: google.maps.places.AutocompletePrediction) => {
    setQuery(prediction.description);
    setSuggestions([]);
    setIsSearching(false);

    if (!placesServiceRef.current) {
      onChange(prediction.description, null);
      return;
    }

    // Obtener detalles del lugar
    const request: google.maps.places.PlaceDetailsRequest = {
      placeId: prediction.place_id,
      fields: ['geometry', 'formatted_address', 'name', 'address_components'],
      sessionToken: sessionTokenRef.current || undefined,
    };

    placesServiceRef.current.getDetails(request, (place, status) => {
      if (status === window.google.maps.places.PlacesServiceStatus.OK && place) {
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
          <Loader2 className="w-4 h-4 mr-2 animate-spin text-gray-400" />
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
        <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
        
        <input
          className="w-full py-3 pl-10 pr-10 rounded-xl border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
          placeholder={placeholder}
          value={query}
          required={required}
          disabled={disabled}
          onChange={(e) => handleInputChange(e.target.value)}
          autoComplete="off"
        />

        {/* Indicador de búsqueda o botón limpiar */}
        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
          {isSearching ? (
            <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
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
      {query.length >= 2 && suggestions.length === 0 && !isSearching && (
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