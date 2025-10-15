"use client";

import { useAuth } from "@/hooks/use-auth";
import { AuthService } from "@/lib/auth";

/**
 * Componente de depuración para verificar el estado de autenticación.
 * SOLO PARA DESARROLLO - Eliminar en producción
 */
export function AuthDebug() {
  const { user, loading, isAuthenticated } = useAuth();
  const token = typeof window !== 'undefined' ? AuthService.getToken() : null;
  const localUser = typeof window !== 'undefined' ? AuthService.getUser() : null;

  if (process.env.NODE_ENV === 'production') {
    return null;
  }

  return (
    <div className="fixed bottom-20 right-4 bg-black/90 text-white p-4 rounded-lg text-xs max-w-xs z-50 font-mono">
      <div className="font-bold mb-2 text-green-400">🔍 Auth Debug</div>
      
      <div className="space-y-1">
        <div>
          <span className="text-gray-400">Loading:</span>{" "}
          <span className={loading ? "text-yellow-400" : "text-green-400"}>
            {loading ? "YES" : "NO"}
          </span>
        </div>
        
        <div>
          <span className="text-gray-400">Authenticated:</span>{" "}
          <span className={isAuthenticated ? "text-green-400" : "text-red-400"}>
            {isAuthenticated ? "YES" : "NO"}
          </span>
        </div>
        
        <div>
          <span className="text-gray-400">Context User:</span>{" "}
          <span className={user ? "text-green-400" : "text-red-400"}>
            {user ? user.email : "NULL"}
          </span>
        </div>
        
        <div>
          <span className="text-gray-400">LocalStorage User:</span>{" "}
          <span className={localUser ? "text-green-400" : "text-red-400"}>
            {localUser ? localUser.email : "NULL"}
          </span>
        </div>
        
        <div>
          <span className="text-gray-400">Token:</span>{" "}
          <span className={token ? "text-green-400" : "text-red-400"}>
            {token ? `${token.substring(0, 20)}...` : "NULL"}
          </span>
        </div>
        
        {token && (
          <div>
            <span className="text-gray-400">Token Valid:</span>{" "}
            <span className={!AuthService.isTokenExpired(token) ? "text-green-400" : "text-red-400"}>
              {!AuthService.isTokenExpired(token) ? "YES" : "EXPIRED"}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}