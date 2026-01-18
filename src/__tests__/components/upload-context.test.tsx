import { describe, it, expect, vi } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import { UploadProvider, useUpload } from '@/contexts/upload-context'

// Test component to access context values
function TestConsumer() {
  const { projectId, setProjectId, onPhotosUploaded, setOnPhotosUploaded } = useUpload()

  return (
    <div>
      <span data-testid="project-id">{projectId || 'null'}</span>
      <span data-testid="has-handler">{onPhotosUploaded ? 'true' : 'false'}</span>
      <button onClick={() => setProjectId('test-id')}>Set Project ID</button>
      <button onClick={() => setProjectId(null)}>Clear Project ID</button>
      <button onClick={() => setOnPhotosUploaded(() => {})}>Set Handler</button>
      <button onClick={() => setOnPhotosUploaded(null)}>Clear Handler</button>
      <button onClick={() => onPhotosUploaded?.()}>Call Handler</button>
    </div>
  )
}

describe('UploadContext', () => {
  describe('UploadProvider', () => {
    it('should provide initial null values', () => {
      render(
        <UploadProvider>
          <TestConsumer />
        </UploadProvider>
      )

      expect(screen.getByTestId('project-id')).toHaveTextContent('null')
      expect(screen.getByTestId('has-handler')).toHaveTextContent('false')
    })

    it('should allow setting project ID', () => {
      render(
        <UploadProvider>
          <TestConsumer />
        </UploadProvider>
      )

      act(() => {
        screen.getByText('Set Project ID').click()
      })

      expect(screen.getByTestId('project-id')).toHaveTextContent('test-id')
    })

    it('should allow clearing project ID', () => {
      render(
        <UploadProvider>
          <TestConsumer />
        </UploadProvider>
      )

      act(() => {
        screen.getByText('Set Project ID').click()
      })
      expect(screen.getByTestId('project-id')).toHaveTextContent('test-id')

      act(() => {
        screen.getByText('Clear Project ID').click()
      })
      expect(screen.getByTestId('project-id')).toHaveTextContent('null')
    })

    it('should allow setting photo upload handler', () => {
      render(
        <UploadProvider>
          <TestConsumer />
        </UploadProvider>
      )

      act(() => {
        screen.getByText('Set Handler').click()
      })

      expect(screen.getByTestId('has-handler')).toHaveTextContent('true')
    })

    it('should allow clearing photo upload handler', () => {
      render(
        <UploadProvider>
          <TestConsumer />
        </UploadProvider>
      )

      act(() => {
        screen.getByText('Set Handler').click()
      })
      expect(screen.getByTestId('has-handler')).toHaveTextContent('true')

      act(() => {
        screen.getByText('Clear Handler').click()
      })
      expect(screen.getByTestId('has-handler')).toHaveTextContent('false')
    })

    it('should call photo upload handler when invoked', () => {
      const mockHandler = vi.fn()

      function TestWithHandler() {
        const { setOnPhotosUploaded, onPhotosUploaded } = useUpload()

        return (
          <div>
            <button onClick={() => setOnPhotosUploaded(mockHandler)}>Set Handler</button>
            <button onClick={() => onPhotosUploaded?.()}>Call Handler</button>
          </div>
        )
      }

      render(
        <UploadProvider>
          <TestWithHandler />
        </UploadProvider>
      )

      act(() => {
        screen.getByText('Set Handler').click()
      })

      act(() => {
        screen.getByText('Call Handler').click()
      })

      expect(mockHandler).toHaveBeenCalledTimes(1)
    })

    it('should render children', () => {
      render(
        <UploadProvider>
          <div data-testid="child">Child Content</div>
        </UploadProvider>
      )

      expect(screen.getByTestId('child')).toHaveTextContent('Child Content')
    })
  })

  describe('useUpload', () => {
    it('should throw error when used outside provider', () => {
      // Suppress console.error for this test
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      function BadConsumer() {
        useUpload()
        return null
      }

      expect(() => render(<BadConsumer />)).toThrow(
        'useUpload must be used within an UploadProvider'
      )

      consoleSpy.mockRestore()
    })
  })
})
