import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { useRef } from 'react'
import { useClickOutside } from '@/hooks/useClickOutside'

// Test component that uses the hook
function TestComponent({
  onClickOutside,
  enabled = true,
}: {
  onClickOutside: () => void
  enabled?: boolean
}) {
  const ref = useRef<HTMLDivElement>(null)
  useClickOutside(ref, onClickOutside, enabled)

  return (
    <div>
      <div ref={ref} data-testid="inside">Inside Element</div>
      <div data-testid="outside">Outside Element</div>
    </div>
  )
}

describe('useClickOutside', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should call handler when clicking outside the element', () => {
    const handleClickOutside = vi.fn()
    render(<TestComponent onClickOutside={handleClickOutside} />)

    const outsideElement = screen.getByTestId('outside')
    fireEvent.mouseDown(outsideElement)

    expect(handleClickOutside).toHaveBeenCalledTimes(1)
  })

  it('should not call handler when clicking inside the element', () => {
    const handleClickOutside = vi.fn()
    render(<TestComponent onClickOutside={handleClickOutside} />)

    const insideElement = screen.getByTestId('inside')
    fireEvent.mouseDown(insideElement)

    expect(handleClickOutside).not.toHaveBeenCalled()
  })

  it('should not call handler when disabled', () => {
    const handleClickOutside = vi.fn()
    render(<TestComponent onClickOutside={handleClickOutside} enabled={false} />)

    const outsideElement = screen.getByTestId('outside')
    fireEvent.mouseDown(outsideElement)

    expect(handleClickOutside).not.toHaveBeenCalled()
  })

  it('should call handler multiple times for multiple outside clicks', () => {
    const handleClickOutside = vi.fn()
    render(<TestComponent onClickOutside={handleClickOutside} />)

    const outsideElement = screen.getByTestId('outside')
    fireEvent.mouseDown(outsideElement)
    fireEvent.mouseDown(outsideElement)
    fireEvent.mouseDown(outsideElement)

    expect(handleClickOutside).toHaveBeenCalledTimes(3)
  })

  it('should handle clicking on document body', () => {
    const handleClickOutside = vi.fn()
    render(<TestComponent onClickOutside={handleClickOutside} />)

    fireEvent.mouseDown(document.body)

    expect(handleClickOutside).toHaveBeenCalledTimes(1)
  })

  it('should cleanup event listener on unmount', () => {
    const handleClickOutside = vi.fn()
    const removeEventListenerSpy = vi.spyOn(document, 'removeEventListener')

    const { unmount } = render(<TestComponent onClickOutside={handleClickOutside} />)
    unmount()

    expect(removeEventListenerSpy).toHaveBeenCalledWith('mousedown', expect.any(Function))
    removeEventListenerSpy.mockRestore()
  })

  it('should not add listener when initially disabled', () => {
    const handleClickOutside = vi.fn()
    const addEventListenerSpy = vi.spyOn(document, 'addEventListener')

    render(<TestComponent onClickOutside={handleClickOutside} enabled={false} />)

    // Should not have added mousedown listener for click outside
    const mousedownCalls = addEventListenerSpy.mock.calls.filter(
      (call) => call[0] === 'mousedown'
    )
    expect(mousedownCalls.length).toBe(0)

    addEventListenerSpy.mockRestore()
  })
})
