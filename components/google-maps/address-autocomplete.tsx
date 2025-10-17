/// <reference types="google.maps" />
"use client";

import React, { useEffect, useRef, useState } from "react";
import { googleMapsLoader } from "@/lib/google-maps-loader"; // ajustá la ruta si hace falta

type Props = {
  value?: string;
  onChange: (address: string, placeDetails?: google.maps.places.PlaceResult | null) => void;
  placeholder?: string;
  required?: boolean;
};

export function AddressAutocomplete({
  value = "",
  onChange,
  placeholder = "Ubicación",
  required = false,
}: Props) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  const [query, setQuery] = useState(value);
  const [suggestions, setSuggestions] = useState<google.maps.places.AutocompletePrediction[]>([]);
  const svcRef = useRef<google.maps.places.AutocompleteService | null>(null);
  const placesServiceRef = useRef<google.maps.places.PlacesService | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const debounceRef = useRef<number | null>(null);

  useEffect(() => {
    setQuery(value);
  }, [value]);

  useEffect(() => {
    let mounted = true;
    if (!apiKey) {
      console.warn("AddressAutocomplete: NEXT_PUBLIC_GOOGLE_MAPS_API_KEY not set");
      return;
    }

    googleMapsLoader
      .load()
      .then(() => {
        if (!mounted) return;
        // Instanciá correctamente las clases de Places
        svcRef.current = new google.maps.places.AutocompleteService();
        placesServiceRef.current = new google.maps.places.PlacesService(document.createElement("div"));
      })
      .catch((err) => {
        console.error("Error loading Google Maps:", err);
      });

    return () => {
      mounted = false;
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
  }, [apiKey]);

  const fetchPredictions = (input: string) => {
    if (!svcRef.current || !input) {
      setSuggestions([]);
      return;
    }
    svcRef.current.getPlacePredictions(
      { input, componentRestrictions: { country: "uy" } },
      (preds, status) => {
        // status check optional, pero útil en producción
        setSuggestions(preds || []);
      }
    );
  };

  const onInputChange = (v: string) => {
    setQuery(v);
    onChange(v, null);
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(() => {
      if (v.length >= 2) fetchPredictions(v);
      else setSuggestions([]);
    }, 250);
  };

  const selectPrediction = (pred: google.maps.places.AutocompletePrediction) => {
    setQuery(pred.description);
    setSuggestions([]);
    if (!placesServiceRef.current) {
      onChange(pred.description, null);
      return;
    }
    placesServiceRef.current.getDetails({ placeId: pred.place_id }, (place, status) => {
      if (status === google.maps.places.PlacesServiceStatus.OK) {
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
        onBlur={() => setTimeout(() => setSuggestions([]), 150)}
      />
      {suggestions.length > 0 && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-gray-300 rounded-xl max-h-56 overflow-auto">
          {suggestions.map((s) => (
            <div
              key={s.place_id}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => selectPrediction(s)}
              className="p-3 hover:bg-gray-100 cursor-pointer"
            >
              {s.description}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default AddressAutocomplete;