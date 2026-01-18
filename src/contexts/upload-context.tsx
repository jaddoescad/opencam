'use client'

import { createContext, useContext, useState, ReactNode } from 'react'

interface UploadContextType {
  projectId: string | null
  setProjectId: (id: string | null) => void
  onPhotosUploaded: (() => void) | null
  setOnPhotosUploaded: (handler: (() => void) | null) => void
}

const UploadContext = createContext<UploadContextType | null>(null)

export function UploadProvider({ children }: { children: ReactNode }) {
  const [projectId, setProjectId] = useState<string | null>(null)
  const [onPhotosUploaded, setOnPhotosUploadedState] = useState<(() => void) | null>(null)

  const setOnPhotosUploaded = (handler: (() => void) | null) => {
    setOnPhotosUploadedState(() => handler)
  }

  return (
    <UploadContext.Provider value={{ projectId, setProjectId, onPhotosUploaded, setOnPhotosUploaded }}>
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
