import { useRef, useState, useEffect, type ReactNode } from 'react'

interface VirtualListProps<T> {
  items: T[]
  itemHeight: number
  overscan?: number
  renderItem: (item: T, index: number) => ReactNode
  className?: string
  maxHeight?: number
}

/**
 * Simple virtual list for performance with large datasets.
 * Only renders visible items + overscan buffer.
 * Use when list has 50+ items.
 */
export function VirtualList<T>({ items, itemHeight, overscan = 5, renderItem, className = '', maxHeight = 600 }: VirtualListProps<T>) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [scrollTop, setScrollTop] = useState(0)

  // If list is small enough, just render normally
  if (items.length < 30) {
    return (
      <div className={className}>
        {items.map((item, i) => renderItem(item, i))}
      </div>
    )
  }

  const totalHeight = items.length * itemHeight
  const visibleCount = Math.ceil(maxHeight / itemHeight)
  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan)
  const endIndex = Math.min(items.length, startIndex + visibleCount + overscan * 2)

  const visibleItems = items.slice(startIndex, endIndex)
  const offsetY = startIndex * itemHeight

  return (
    <div
      ref={containerRef}
      onScroll={(e) => setScrollTop(e.currentTarget.scrollTop)}
      className={`overflow-y-auto ${className}`}
      style={{ maxHeight }}
    >
      <div style={{ height: totalHeight, position: 'relative' }}>
        <div style={{ position: 'absolute', top: offsetY, left: 0, right: 0 }}>
          {visibleItems.map((item, i) => renderItem(item, startIndex + i))}
        </div>
      </div>
    </div>
  )
}
