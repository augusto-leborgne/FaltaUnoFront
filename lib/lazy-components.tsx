/**
 * Lazy Components - Carga diferida de componentes pesados
 * 
 * Esto mejora significativamente el tiempo de carga inicial
 * dividiendo el bundle en chunks más pequeños.
 */

import dynamic from 'next/dynamic'
import { LoadingSpinner } from '@/components/ui/loading-spinner'

// ============================================
// PÁGINAS PRINCIPALES
// ============================================

export const HomeScreen = dynamic(
  () => import('@/components/pages/home-screen').then(mod => ({ default: mod.HomeScreen })),
  {
    loading: () => <LoadingSpinner size="xl" variant="green" />,
    ssr: false, // Desactivar SSR para componentes que usan hooks de cliente
  }
)

export const MatchesListing = dynamic(
  () => import('@/components/pages/match/matches-listing').then(mod => ({ default: mod.MatchesListing })),
  {
    loading: () => <LoadingSpinner size="xl" variant="green" />,
    ssr: false,
  }
)

export const MyMatchesScreen = dynamic(
  () => import('@/components/pages/match/my-matches-screen').then(mod => ({ default: mod.MyMatchesScreen })),
  {
    loading: () => <LoadingSpinner size="xl" variant="green" />,
    ssr: false,
  }
)

export const ProfileScreen = dynamic(
  () => import('@/components/pages/user/profile-screen').then(mod => ({ default: mod.default })),
  {
    loading: () => <LoadingSpinner size="xl" variant="green" />,
    ssr: false,
  }
)

export const SettingsScreen = dynamic(
  () => import('@/components/pages/user/settings-screen').then(mod => ({ default: mod.SettingsScreen })),
  {
    loading: () => <LoadingSpinner size="xl" variant="green" />,
    ssr: false,
  }
)

export const SearchScreen = dynamic(
  () => import('@/components/pages/search-screen').then(mod => ({ default: mod.SearchScreen })),
  {
    loading: () => <LoadingSpinner size="xl" variant="green" />,
    ssr: false,
  }
)

// ============================================
// MODALES Y COMPONENTES PESADOS
// ============================================

export const MatchDetail = dynamic(
  () => import('@/components/pages/match/match-detail'),
  {
    loading: () => <LoadingSpinner size="lg" variant="green" />,
    ssr: false,
  }
)

export const PlayerProfile = dynamic(
  () => import('@/components/pages/user/player-profile'),
  {
    loading: () => <LoadingSpinner size="lg" variant="green" />,
    ssr: false,
  }
)

export const MatchChatScreen = dynamic(
  () => import('@/components/pages/match/match-chat-screen').then(mod => ({ default: mod.MatchChatScreen })),
  {
    loading: () => <LoadingSpinner size="lg" variant="green" />,
    ssr: false,
  }
)

// ============================================
// UTILIDADES
// ============================================

/**
 * Precargar un componente lazy
 * Útil para precargar componentes que probablemente el usuario necesitará pronto
 * 
 * @example
 * ```tsx
 * import { preloadMatchDetail } from '@/lib/lazy-components'
 * 
 * onMouseEnter={() => preloadMatchDetail()}
 * ```
 */
export const preloadMatchDetail = () => {
  // @ts-ignore - dynamic() doesn't type the preload function
  MatchDetail.preload?.()
}

export const preloadPlayerProfile = () => {
  // @ts-ignore - dynamic() doesn't type the preload function
  PlayerProfile.preload?.()
}
