import type { StorageProvider } from './types'
import { SupabaseStorageProvider } from './supabase-storage'

let storageInstance: StorageProvider | null = null

/**
 * Get the storage provider instance.
 * Currently uses Supabase, but can be swapped to another provider
 * (e.g., R2, S3) by changing this factory function.
 */
export function getStorage(): StorageProvider {
  if (!storageInstance) {
    storageInstance = new SupabaseStorageProvider()
  }
  return storageInstance
}

/**
 * Reset the storage instance (useful for testing)
 */
export function resetStorage(): void {
  storageInstance = null
}

/**
 * Set a custom storage provider (useful for testing or custom implementations)
 */
export function setStorage(provider: StorageProvider): void {
  storageInstance = provider
}
