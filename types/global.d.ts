/// <reference types="google.maps" />

// Optional: extend window if you want explicit typing for window.google
declare global {
  interface Window {
    google: typeof google;
  }
}

export {}
