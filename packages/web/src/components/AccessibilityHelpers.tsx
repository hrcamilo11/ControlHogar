/**
 * Skip to main content link — visible only on focus (keyboard navigation)
 */
export function SkipToContent() {
  return (
    <a
      href="#main-content"
      className="fixed top-0 left-0 z-[100] -translate-y-full bg-primary-600 px-4 py-2 text-sm font-medium text-white transition-transform focus:translate-y-0"
    >
      Ir al contenido principal
    </a>
  )
}

/**
 * Visually hidden text for screen readers
 */
export function ScreenReaderOnly({ children }: { children: React.ReactNode }) {
  return (
    <span className="sr-only">{children}</span>
  )
}

/**
 * Announce dynamic content changes to screen readers
 */
export function LiveRegion({ message }: { message: string }) {
  return (
    <div aria-live="polite" aria-atomic="true" className="sr-only">
      {message}
    </div>
  )
}
