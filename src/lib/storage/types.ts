export interface UploadOptions {
  contentType?: string
  cacheControl?: string
  upsert?: boolean
}

export interface UploadResult {
  path: string
  error: StorageError | null
}

export interface StorageError {
  message: string
  statusCode?: number
}

export interface RemoveResult {
  error: StorageError | null
}

export interface StorageProvider {
  /**
   * Upload a file to storage
   */
  upload(bucket: string, path: string, file: File, options?: UploadOptions): Promise<UploadResult>

  /**
   * Remove files from storage
   */
  remove(bucket: string, paths: string[]): Promise<RemoveResult>

  /**
   * Get the public URL for a file
   */
  getPublicUrl(bucket: string, path: string): string

  /**
   * Generate a unique storage path for a file
   */
  generatePath(prefix: string, fileName: string): string
}
