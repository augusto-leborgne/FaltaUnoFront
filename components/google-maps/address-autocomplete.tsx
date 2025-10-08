"use client";

import React, { useEffect, useRef } from "react";
import type { google } from "google-maps";

interface AddressAutocompleteProps {
  value: string;
  onChange: (address: string, placeDetails?: google.maps.places.PlaceResult) => void;
  placeholder?: string;
  className?: string;
  required?: boolean;
}

export const AddressAutocomplete: React.FC<AddressAutocompleteProps> = ({
  value,
  onChange,
  placeholder,
  className,
  required,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!window.google || !inputRef.current) return;

    const autocomplete = new window.google.maps.places.Autocomplete(inputRef.current, {
      types: ["address"],
    });

    autocompleteRef.current = autocomplete;

    const listener = () => {
      const place = autocomplete.getPlace();
      if (place?.formatted_address) {
        onChange(place.formatted_address, place);
      }
    };

    autocomplete.addListener("place_changed", listener);

    return () => {
      google.maps.event.clearInstanceListeners(autocomplete);
    };
  }, [onChange]);

  return (
    <input
      ref={inputRef}
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder ?? "Ingresa tu dirección"}
      className={className}
      required={required}
    />
  );
};