import { createClient } from '@/lib/supabase/client'
import type { StorageProvider, UploadOptions, UploadResult, RemoveResult } from './types'

export class SupabaseStorageProvider implements StorageProvider {
  private supabase = createClient()

  async upload(
    bucket: string,
    path: string,
    file: File,
    options?: UploadOptions
  ): Promise<UploadResult> {
    const { error } = await this.supabase.storage.from(bucket).upload(path, file, {
      contentType: options?.contentType,
      cacheControl: options?.cacheControl || '3600',
      upsert: options?.upsert || false,
    })

    if (error) {
      return {
        path: '',
        error: {
          message: error.message,
          statusCode: typeof error === 'object' && 'statusCode' in error
            ? (error as { statusCode: number }).statusCode
            : undefined,
        },
      }
    }

    return { path, error: null }
  }

  async remove(bucket: string, paths: string[]): Promise<RemoveResult> {
    const { error } = await this.supabase.storage.from(bucket).remove(paths)

    if (error) {
      return {
        error: {
          message: error.message,
          statusCode: typeof error === 'object' && 'statusCode' in error
            ? (error as { statusCode: number }).statusCode
            : undefined,
        },
      }
    }

    return { error: null }
  }

  getPublicUrl(bucket: string, path: string): string {
    return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${bucket}/${path}`
  }

  generatePath(prefix: string, fileName: string): string {
    const fileExt = fileName.split('.').pop()
    const uniqueId = `${Date.now()}-${Math.random().toString(36).substring(7)}`
    return `${prefix}/${uniqueId}.${fileExt}`
  }
}
