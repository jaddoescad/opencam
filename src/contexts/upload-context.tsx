'use client'

import { createContext, useContext, useState, useCallback, ReactNode } from 'react'

interface UploadContextType {
  projectId: string | null
  setProjectId: (id: string | null) => void
  onPhotoTaken: ((files: FileList) => void) | null
  setOnPhotoTaken: (handler: ((files: FileList) => void) | null) => void
}

const UploadContext = createContext<UploadContextType | null>(null)

export function UploadProvider({ children }: { children: ReactNode }) {
  const [projectId, setProjectId] = useState<string | null>(null)
  const [onPhotoTaken, setOnPhotoTakenState] = useState<((files: FileList) => void) | null>(null)

  const setOnPhotoTaken = useCallback((handler: ((files: FileList) => void) | null) => {
    setOnPhotoTakenState(() => handler)
  }, [])

  return (
    <UploadContext.Provider value={{ projectId, setProjectId, onPhotoTaken, setOnPhotoTaken }}>
      {children}
    </UploadContext.Provider>
  )
}

export function useUpload() {
  const context = useContext(UploadContext)
  if (!context) {
    throw new Error('useUpload must be used within an UploadProvider')
  }
  return context
}
