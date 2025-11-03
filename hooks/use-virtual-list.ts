/**
 * Virtual List Hook - Only render visible items for better performance
 * 
 * Benefits:
 * - Handles 1000+ items smoothly
 * - Reduces DOM nodes from 1000 to ~20
 * - Improves scroll performance
 * - Reduces memory usage
 */

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'

interface UseVirtualListOptions {
  /** Height of each item in pixels */
  itemHeight: number
  /** Number of items to render above/below viewport (default: 5) */
  overscan?: number
  /** Container height in pixels (default: window.innerHeight) */
  containerHeight?: number
}

interface VirtualListResult<T> {
  /** Items to actually render */
  virtualItems: Array<{
    index: number
    data: T
    style: React.CSSProperties
  }>
  /** Total height of the scrollable container */
  totalHeight: number
  /** Scroll handler to attach to container */
  onScroll: (e: React.UIEvent<HTMLDivElement>) => void
  /** Container ref */
  containerRef: React.RefObject<HTMLDivElement>
  /** Scroll to specific index */
  scrollToIndex: (index: number) => void
}

export function useVirtualList<T>(
  items: T[],
  options: UseVirtualListOptions
): VirtualListResult<T> {
  const {
    itemHeight,
    overscan = 5,
    containerHeight = typeof window !== 'undefined' ? window.innerHeight : 800,
  } = options

  const containerRef = useRef<HTMLDivElement>(null)
  const [scrollTop, setScrollTop] = useState(0)

  // Calculate visible range
  const { startIndex, endIndex, visibleItems } = useMemo(() => {
    const start = Math.floor(scrollTop / itemHeight)
    const end = Math.ceil((scrollTop + containerHeight) / itemHeight)
    
    const startWithOverscan = Math.max(0, start - overscan)
    const endWithOverscan = Math.min(items.length, end + overscan)

    const visible = items.slice(startWithOverscan, endWithOverscan).map((data, i) => ({
      index: startWithOverscan + i,
      data,
      style: {
        position: 'absolute' as const,
        top: 0,
        left: 0,
        width: '100%',
        height: `${itemHeight}px`,
        transform: `translateY(${(startWithOverscan + i) * itemHeight}px)`,
      },
    }))

    return {
      startIndex: startWithOverscan,
      endIndex: endWithOverscan,
      visibleItems: visible,
    }
  }, [items, scrollTop, itemHeight, containerHeight, overscan])

  // Handle scroll
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget
    setScrollTop(target.scrollTop)
  }, [])

  // Scroll to index
  const scrollToIndex = useCallback((index: number) => {
    if (!containerRef.current) return
    
    const offset = index * itemHeight
    containerRef.current.scrollTop = offset
    setScrollTop(offset)
  }, [itemHeight])

  // Total height for scrolling
  const totalHeight = items.length * itemHeight

  return {
    virtualItems: visibleItems,
    totalHeight,
    onScroll: handleScroll,
    containerRef,
    scrollToIndex,
  }
}

/**
 * Simple infinite scroll hook
 */
interface UseInfiniteScrollOptions {
  /** Callback when reaching bottom */
  onLoadMore: () => void | Promise<void>
  /** Distance from bottom to trigger (default: 300px) */
  threshold?: number
  /** Is currently loading */
  loading?: boolean
  /** Has more items to load */
  hasMore?: boolean
}

export function useInfiniteScroll(options: UseInfiniteScrollOptions) {
  const {
    onLoadMore,
    threshold = 300,
    loading = false,
    hasMore = true,
  } = options

  const observerRef = useRef<IntersectionObserver | null>(null)
  const sentinelRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!hasMore || loading) return

    observerRef.current = new IntersectionObserver(
      entries => {
        const first = entries[0]
        if (first.isIntersecting) {
          onLoadMore()
        }
      },
      { rootMargin: `${threshold}px` }
    )

    if (sentinelRef.current) {
      observerRef.current.observe(sentinelRef.current)
    }

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect()
      }
    }
  }, [hasMore, loading, onLoadMore, threshold])

  return sentinelRef
}

/**
 * Pagination hook
 */
interface UsePaginationOptions {
  /** Total number of items */
  totalItems: number
  /** Items per page (default: 20) */
  pageSize?: number
  /** Initial page (default: 1) */
  initialPage?: number
}

export function usePagination(options: UsePaginationOptions) {
  const {
    totalItems,
    pageSize = 20,
    initialPage = 1,
  } = options

  const [currentPage, setCurrentPage] = useState(initialPage)

  const totalPages = Math.ceil(totalItems / pageSize)
  const startIndex = (currentPage - 1) * pageSize
  const endIndex = Math.min(startIndex + pageSize, totalItems)

  const goToPage = useCallback((page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)))
  }, [totalPages])

  const nextPage = useCallback(() => {
    if (currentPage < totalPages) {
      setCurrentPage(p => p + 1)
    }
  }, [currentPage, totalPages])

  const prevPage = useCallback(() => {
    if (currentPage > 1) {
      setCurrentPage(p => p - 1)
    }
  }, [currentPage])

  const hasNext = currentPage < totalPages
  const hasPrev = currentPage > 1

  return {
    currentPage,
    totalPages,
    startIndex,
    endIndex,
    pageSize,
    goToPage,
    nextPage,
    prevPage,
    hasNext,
    hasPrev,
    isFirstPage: currentPage === 1,
    isLastPage: currentPage === totalPages,
  }
}
