declare global {
  interface Window {
    google: {
      maps: {
        Map: any
        Marker: any
        InfoWindow: any
        SymbolPath: any
        event: {
          clearInstanceListeners: (instance: any) => void
        }
        places: {
          Autocomplete: any
          PlacesService: any
        }
      }
    }
  }
}

export {}
