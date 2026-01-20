import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getStorage, resetStorage, setStorage } from '@/lib/storage'
import type { StorageProvider } from '@/lib/storage'

// Mock the supabase client
vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    storage: {
      from: () => ({
        upload: vi.fn().mockResolvedValue({ error: null }),
        remove: vi.fn().mockResolvedValue({ error: null }),
        getPublicUrl: vi.fn().mockReturnValue({ data: { publicUrl: 'https://example.com/photo.jpg' } }),
      }),
    },
  }),
}))

describe('Storage Client', () => {
  beforeEach(() => {
    resetStorage()
  })

  it('should return a storage provider instance', () => {
    const storage = getStorage()
    expect(storage).toBeDefined()
    expect(storage.upload).toBeDefined()
    expect(storage.remove).toBeDefined()
    expect(storage.getPublicUrl).toBeDefined()
    expect(storage.generatePath).toBeDefined()
  })

  it('should return the same instance on subsequent calls', () => {
    const storage1 = getStorage()
    const storage2 = getStorage()
    expect(storage1).toBe(storage2)
  })

  it('should return a new instance after reset', () => {
    const storage1 = getStorage()
    resetStorage()
    const storage2 = getStorage()
    expect(storage1).not.toBe(storage2)
  })

  it('should allow setting a custom storage provider', () => {
    const mockProvider: StorageProvider = {
      upload: vi.fn(),
      remove: vi.fn(),
      getPublicUrl: vi.fn(),
      generatePath: vi.fn(),
    }

    setStorage(mockProvider)
    const storage = getStorage()
    expect(storage).toBe(mockProvider)
  })
})

describe('SupabaseStorageProvider', () => {
  beforeEach(() => {
    resetStorage()
  })

  describe('generatePath', () => {
    it('should generate a unique path with the correct format', () => {
      const storage = getStorage()
      const path = storage.generatePath('project-123', 'photo.jpg')

      expect(path).toMatch(/^project-123\/\d+-[a-z0-9]+\.jpg$/)
    })

    it('should preserve file extension', () => {
      const storage = getStorage()

      const jpgPath = storage.generatePath('prefix', 'image.jpg')
      expect(jpgPath).toMatch(/\.jpg$/)

      const pngPath = storage.generatePath('prefix', 'image.png')
      expect(pngPath).toMatch(/\.png$/)

      const heicPath = storage.generatePath('prefix', 'image.heic')
      expect(heicPath).toMatch(/\.heic$/)
    })

    it('should generate different paths for successive calls', () => {
      const storage = getStorage()
      const path1 = storage.generatePath('prefix', 'photo.jpg')
      const path2 = storage.generatePath('prefix', 'photo.jpg')

      expect(path1).not.toBe(path2)
    })
  })

  describe('getPublicUrl', () => {
    it('should return a properly formatted public URL', () => {
      const storage = getStorage()
      const url = storage.getPublicUrl('photos', 'project-123/image.jpg')

      expect(url).toContain('/storage/v1/object/public/photos/project-123/image.jpg')
    })
  })
})
