'use client'

import { useEffect } from 'react'

interface KeyboardHandlers {
  onEscape?: () => void
  onArrowLeft?: () => void
  onArrowRight?: () => void
  onArrowUp?: () => void
  onArrowDown?: () => void
  onEnter?: () => void
}

export function useKeyboardNavigation(
  handlers: KeyboardHandlers,
  enabled: boolean = true
): void {
  useEffect(() => {
    if (!enabled) return

    const handleKeyDown = (event: KeyboardEvent) => {
      switch (event.key) {
        case 'Escape':
          handlers.onEscape?.()
          break
        case 'ArrowLeft':
          handlers.onArrowLeft?.()
          break
        case 'ArrowRight':
          handlers.onArrowRight?.()
          break
        case 'ArrowUp':
          handlers.onArrowUp?.()
          break
        case 'ArrowDown':
          handlers.onArrowDown?.()
          break
        case 'Enter':
          handlers.onEnter?.()
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [handlers, enabled])
}
