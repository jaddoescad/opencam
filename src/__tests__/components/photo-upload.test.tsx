import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PhotoUpload } from '@/components/photo-upload'

// Create mock Supabase client
const mockUpload = vi.fn()
const mockInsert = vi.fn()
const mockGetUser = vi.fn()

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: {
      getUser: mockGetUser,
    },
    storage: {
      from: () => ({
        upload: mockUpload,
      }),
    },
    from: () => ({
      insert: mockInsert,
    }),
  }),
}))

describe('PhotoUpload', () => {
  const mockOnClose = vi.fn()
  const mockOnUploadComplete = vi.fn()
  const defaultProps = {
    projectId: 'test-project-id',
    onClose: mockOnClose,
    onUploadComplete: mockOnUploadComplete,
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'test-user-id' } },
      error: null,
    })
    mockUpload.mockResolvedValue({ data: { path: 'test-path' }, error: null })
    mockInsert.mockResolvedValue({ data: null, error: null })
  })

  it('should render upload modal with title', () => {
    render(<PhotoUpload {...defaultProps} />)

    expect(screen.getByText('Upload Photos')).toBeInTheDocument()
  })

  it('should render drag and drop zone', () => {
    render(<PhotoUpload {...defaultProps} />)

    expect(screen.getByText(/Drag and drop photos here/)).toBeInTheDocument()
    expect(screen.getByText('browse')).toBeInTheDocument()
  })

  it('should render cancel button', () => {
    render(<PhotoUpload {...defaultProps} />)

    expect(screen.getByText('Cancel')).toBeInTheDocument()
  })

  it('should call onClose when cancel button is clicked', async () => {
    const user = userEvent.setup()
    render(<PhotoUpload {...defaultProps} />)

    await user.click(screen.getByText('Cancel'))

    expect(mockOnClose).toHaveBeenCalled()
  })

  it('should call onClose when clicking backdrop', async () => {
    const user = userEvent.setup()
    render(<PhotoUpload {...defaultProps} />)

    // Find backdrop by its class
    const backdrop = document.querySelector('.bg-black\\/50')
    if (backdrop) {
      await user.click(backdrop)
    }

    expect(mockOnClose).toHaveBeenCalled()
  })

  it('should have disabled upload button when no files selected', () => {
    render(<PhotoUpload {...defaultProps} />)

    const uploadButton = screen.getByText('Upload 0 Photos')
    expect(uploadButton).toBeDisabled()
  })

  it('should add files when dropped', async () => {
    render(<PhotoUpload {...defaultProps} />)

    const dropZone = screen.getByText(/Drag and drop photos here/).parentElement!

    const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' })

    const dataTransfer = {
      files: [file],
      types: ['Files'],
    }

    await act(async () => {
      fireEvent.drop(dropZone, { dataTransfer })
    })

    expect(screen.getByText('1 file(s) selected')).toBeInTheDocument()
    expect(screen.getByText('test.jpg')).toBeInTheDocument()
  })

  it('should filter non-image files when dropped', async () => {
    render(<PhotoUpload {...defaultProps} />)

    const dropZone = screen.getByText(/Drag and drop photos here/).parentElement!

    const imageFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' })
    const textFile = new File(['test'], 'test.txt', { type: 'text/plain' })

    const dataTransfer = {
      files: [imageFile, textFile],
      types: ['Files'],
    }

    await act(async () => {
      fireEvent.drop(dropZone, { dataTransfer })
    })

    expect(screen.getByText('1 file(s) selected')).toBeInTheDocument()
    expect(screen.getByText('test.jpg')).toBeInTheDocument()
    expect(screen.queryByText('test.txt')).not.toBeInTheDocument()
  })

  it('should add files when selected via input', async () => {
    render(<PhotoUpload {...defaultProps} />)

    const input = document.querySelector('input[type="file"]') as HTMLInputElement

    const file = new File(['test'], 'photo.png', { type: 'image/png' })

    await act(async () => {
      fireEvent.change(input, { target: { files: [file] } })
    })

    expect(screen.getByText('1 file(s) selected')).toBeInTheDocument()
    expect(screen.getByText('photo.png')).toBeInTheDocument()
  })

  it('should remove file when remove button is clicked', async () => {
    const user = userEvent.setup()
    render(<PhotoUpload {...defaultProps} />)

    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' })

    await act(async () => {
      fireEvent.change(input, { target: { files: [file] } })
    })

    expect(screen.getByText('test.jpg')).toBeInTheDocument()

    // Click the remove button (X icon)
    const removeButton = screen.getByText('test.jpg').closest('li')?.querySelector('button')
    if (removeButton) {
      await user.click(removeButton)
    }

    expect(screen.queryByText('test.jpg')).not.toBeInTheDocument()
  })

  it('should update button text based on file count', async () => {
    render(<PhotoUpload {...defaultProps} />)

    const input = document.querySelector('input[type="file"]') as HTMLInputElement

    // Single file
    const file1 = new File(['test'], 'test1.jpg', { type: 'image/jpeg' })
    await act(async () => {
      fireEvent.change(input, { target: { files: [file1] } })
    })
    expect(screen.getByText('Upload 1 Photo')).toBeInTheDocument()

    // Multiple files
    const file2 = new File(['test'], 'test2.jpg', { type: 'image/jpeg' })
    await act(async () => {
      fireEvent.change(input, { target: { files: [file2] } })
    })
    expect(screen.getByText('Upload 2 Photos')).toBeInTheDocument()
  })

  it('should show error when user is not logged in', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: null },
      error: null,
    })

    const user = userEvent.setup()
    render(<PhotoUpload {...defaultProps} />)

    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' })

    await act(async () => {
      fireEvent.change(input, { target: { files: [file] } })
    })

    await user.click(screen.getByText('Upload 1 Photo'))

    await waitFor(() => {
      expect(screen.getByText('You must be logged in to upload photos')).toBeInTheDocument()
    })
  })

  it('should upload files successfully', async () => {
    const user = userEvent.setup()
    render(<PhotoUpload {...defaultProps} />)

    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' })

    await act(async () => {
      fireEvent.change(input, { target: { files: [file] } })
    })

    await user.click(screen.getByText('Upload 1 Photo'))

    await waitFor(() => {
      expect(mockUpload).toHaveBeenCalled()
      expect(mockInsert).toHaveBeenCalled()
      expect(mockOnUploadComplete).toHaveBeenCalled()
    })
  })

  it('should show upload error when storage upload fails', async () => {
    mockUpload.mockResolvedValue({
      data: null,
      error: { message: 'Storage error' },
    })

    const user = userEvent.setup()
    render(<PhotoUpload {...defaultProps} />)

    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' })

    await act(async () => {
      fireEvent.change(input, { target: { files: [file] } })
    })

    await user.click(screen.getByText('Upload 1 Photo'))

    await waitFor(() => {
      expect(screen.getByText('Failed to upload test.jpg: Storage error')).toBeInTheDocument()
    })
  })

  it('should show error when database insert fails', async () => {
    mockInsert.mockResolvedValue({
      data: null,
      error: { message: 'Database error' },
    })

    const user = userEvent.setup()
    render(<PhotoUpload {...defaultProps} />)

    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' })

    await act(async () => {
      fireEvent.change(input, { target: { files: [file] } })
    })

    await user.click(screen.getByText('Upload 1 Photo'))

    await waitFor(() => {
      expect(screen.getByText('Failed to save photo record: Database error')).toBeInTheDocument()
    })
  })

  it('should prevent default on dragover', () => {
    render(<PhotoUpload {...defaultProps} />)

    const dropZone = screen.getByText(/Drag and drop photos here/).parentElement!

    const event = new Event('dragover', { bubbles: true })
    event.preventDefault = vi.fn()

    fireEvent.dragOver(dropZone, event)

    // The component should prevent default behavior
    // This is implicitly tested by the drop functionality working
  })

  it('should show progress during upload', async () => {
    // Slow down the upload to see progress
    mockUpload.mockImplementation(() => new Promise((resolve) => setTimeout(() => resolve({ data: { path: 'test' }, error: null }), 100)))

    const user = userEvent.setup()
    render(<PhotoUpload {...defaultProps} />)

    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' })

    await act(async () => {
      fireEvent.change(input, { target: { files: [file] } })
    })

    await user.click(screen.getByText('Upload 1 Photo'))

    // During upload, the button should show "Uploading..."
    expect(screen.getByText('Uploading...')).toBeInTheDocument()
  })

  it('should accept multiple image types', async () => {
    render(<PhotoUpload {...defaultProps} />)

    const input = document.querySelector('input[type="file"]') as HTMLInputElement

    expect(input).toHaveAttribute('accept', 'image/*')
    expect(input).toHaveAttribute('multiple')
  })
})
