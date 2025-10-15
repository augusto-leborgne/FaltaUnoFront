// components/google-maps/address-autocomplete.tsx
"use client";

import React, { useEffect, useRef, useState } from "react";

type Props = {
  value?: string;
  onChange: (address: string, placeDetails?: any | null) => void;
  placeholder?: string;
  required?: boolean;
};

/**
 * AddressAutocomplete ligero que:
 * - carga el script de Google Maps Places si no está presente
 * - muestra predicciones y al seleccionar obtiene place details
 *
 * Nota: no redeclaramos `window.google` para no chocar con los tipos globales.
 */
const loadGoogleMaps = (apiKey: string) => {
  if (!apiKey) return Promise.reject(new Error("Missing Google Maps API key"));
  if (typeof window === "undefined") return Promise.reject(new Error("Not in browser"));
  if ((window as any).google && (window as any).google.maps) return Promise.resolve();

  const id = "google-maps-js";
  if (document.getElementById(id)) {
    return new Promise<void>((res) => {
      const check = setInterval(() => {
        if ((window as any).google && (window as any).google.maps) {
          clearInterval(check);
          res();
        }
      }, 100);
    });
  }

  return new Promise<void>((resolve, reject) => {
    const s = document.createElement("script");
    s.id = id;
    s.async = true;
    s.defer = true;
    s.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
    s.onload = () => resolve();
    s.onerror = (e) => reject(e);
    document.head.appendChild(s);
  });
};

export function AddressAutocomplete({ value = "", onChange, placeholder = "Ubicación", required = false }: Props) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  const [query, setQuery] = useState(value);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const svcRef = useRef<any | null>(null);
  const placesServiceRef = useRef<any | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const debounceRef = useRef<number | null>(null);

  useEffect(() => { setQuery(value); }, [value]);

  useEffect(() => {
    let mounted = true;
    if (!apiKey) {
      console.warn("AddressAutocomplete: NEXT_PUBLIC_GOOGLE_MAPS_API_KEY not set");
      return;
    }
    loadGoogleMaps(apiKey).then(() => {
      if (!mounted) return;
      svcRef.current = (window as any).google.maps.places.AutocompleteService();
      // PlacesService necesita un elemento DOM para instanciarse
      placesServiceRef.current = new (window as any).google.maps.places.PlacesService(document.createElement("div"));
    }).catch(err => {
      console.error("Error loading Google Maps:", err);
    });
    return () => { mounted = false; if (debounceRef.current) window.clearTimeout(debounceRef.current); };
  }, [apiKey]);

  const fetchPredictions = (input: string) => {
    if (!svcRef.current || !input) {
      setSuggestions([]);
      return;
    }
    svcRef.current.getPlacePredictions({ input, componentRestrictions: { country: "uy" } }, (preds: any) => {
      setSuggestions(preds || []);
    });
  };

  // debounce simple
  const onInputChange = (v: string) => {
    setQuery(v);
    onChange(v, null);
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(() => {
      if (v.length >= 2) fetchPredictions(v);
      else setSuggestions([]);
    }, 250);
  };

  const selectPrediction = (pred: any) => {
    setQuery(pred.description);
    setSuggestions([]);
    if (!placesServiceRef.current) {
      onChange(pred.description, null);
      return;
    }
    placesServiceRef.current.getDetails({ placeId: pred.place_id }, (place: any, status: any) => {
      if (status === (window as any).google.maps.places.PlacesServiceStatus.OK) {
        onChange(pred.description, place);
      } else {
        onChange(pred.description, null);
      }
    });
  };

  return (
    <div className="relative">
      <input
        ref={inputRef}
        className="w-full py-3 px-4 rounded-xl border border-gray-300 bg-white"
        placeholder={placeholder}
        value={query}
        required={required}
        onChange={(e) => onInputChange(e.target.value)}
        onBlur={() => setTimeout(()=> setSuggestions([]), 150)}
      />
      {suggestions.length > 0 && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-gray-300 rounded-xl max-h-56 overflow-auto">
          {suggestions.map(s => (
            <div key={s.place_id} onMouseDown={(e)=>e.preventDefault()} onClick={() => selectPrediction(s)} className="p-3 hover:bg-gray-100 cursor-pointer">
              {s.description}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default AddressAutocomplete;