import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, fireEvent } from '@testing-library/react'
import { useKeyboardNavigation } from '@/hooks/useKeyboardNavigation'

// Test component that uses the hook
function TestComponent({
  handlers,
  enabled = true,
}: {
  handlers: Parameters<typeof useKeyboardNavigation>[0]
  enabled?: boolean
}) {
  useKeyboardNavigation(handlers, enabled)
  return <div data-testid="test-component">Test Component</div>
}

describe('useKeyboardNavigation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should call onEscape when Escape key is pressed', () => {
    const onEscape = vi.fn()
    render(<TestComponent handlers={{ onEscape }} />)

    fireEvent.keyDown(window, { key: 'Escape' })

    expect(onEscape).toHaveBeenCalledTimes(1)
  })

  it('should call onArrowLeft when ArrowLeft key is pressed', () => {
    const onArrowLeft = vi.fn()
    render(<TestComponent handlers={{ onArrowLeft }} />)

    fireEvent.keyDown(window, { key: 'ArrowLeft' })

    expect(onArrowLeft).toHaveBeenCalledTimes(1)
  })

  it('should call onArrowRight when ArrowRight key is pressed', () => {
    const onArrowRight = vi.fn()
    render(<TestComponent handlers={{ onArrowRight }} />)

    fireEvent.keyDown(window, { key: 'ArrowRight' })

    expect(onArrowRight).toHaveBeenCalledTimes(1)
  })

  it('should call onArrowUp when ArrowUp key is pressed', () => {
    const onArrowUp = vi.fn()
    render(<TestComponent handlers={{ onArrowUp }} />)

    fireEvent.keyDown(window, { key: 'ArrowUp' })

    expect(onArrowUp).toHaveBeenCalledTimes(1)
  })

  it('should call onArrowDown when ArrowDown key is pressed', () => {
    const onArrowDown = vi.fn()
    render(<TestComponent handlers={{ onArrowDown }} />)

    fireEvent.keyDown(window, { key: 'ArrowDown' })

    expect(onArrowDown).toHaveBeenCalledTimes(1)
  })

  it('should call onEnter when Enter key is pressed', () => {
    const onEnter = vi.fn()
    render(<TestComponent handlers={{ onEnter }} />)

    fireEvent.keyDown(window, { key: 'Enter' })

    expect(onEnter).toHaveBeenCalledTimes(1)
  })

  it('should not call handlers when disabled', () => {
    const onEscape = vi.fn()
    const onArrowLeft = vi.fn()
    const onEnter = vi.fn()

    render(
      <TestComponent
        handlers={{ onEscape, onArrowLeft, onEnter }}
        enabled={false}
      />
    )

    fireEvent.keyDown(window, { key: 'Escape' })
    fireEvent.keyDown(window, { key: 'ArrowLeft' })
    fireEvent.keyDown(window, { key: 'Enter' })

    expect(onEscape).not.toHaveBeenCalled()
    expect(onArrowLeft).not.toHaveBeenCalled()
    expect(onEnter).not.toHaveBeenCalled()
  })

  it('should handle multiple key presses', () => {
    const onEscape = vi.fn()
    const onArrowLeft = vi.fn()
    const onArrowRight = vi.fn()

    render(
      <TestComponent
        handlers={{ onEscape, onArrowLeft, onArrowRight }}
      />
    )

    fireEvent.keyDown(window, { key: 'ArrowLeft' })
    fireEvent.keyDown(window, { key: 'ArrowRight' })
    fireEvent.keyDown(window, { key: 'Escape' })

    expect(onArrowLeft).toHaveBeenCalledTimes(1)
    expect(onArrowRight).toHaveBeenCalledTimes(1)
    expect(onEscape).toHaveBeenCalledTimes(1)
  })

  it('should not throw when handler is not provided', () => {
    render(<TestComponent handlers={{}} />)

    // These should not throw
    expect(() => {
      fireEvent.keyDown(window, { key: 'Escape' })
      fireEvent.keyDown(window, { key: 'ArrowLeft' })
      fireEvent.keyDown(window, { key: 'Enter' })
    }).not.toThrow()
  })

  it('should ignore unhandled keys', () => {
    const onEscape = vi.fn()
    render(<TestComponent handlers={{ onEscape }} />)

    fireEvent.keyDown(window, { key: 'a' })
    fireEvent.keyDown(window, { key: 'Tab' })
    fireEvent.keyDown(window, { key: 'Space' })

    expect(onEscape).not.toHaveBeenCalled()
  })

  it('should cleanup event listener on unmount', () => {
    const onEscape = vi.fn()
    const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener')

    const { unmount } = render(<TestComponent handlers={{ onEscape }} />)
    unmount()

    expect(removeEventListenerSpy).toHaveBeenCalledWith('keydown', expect.any(Function))
    removeEventListenerSpy.mockRestore()
  })
})
