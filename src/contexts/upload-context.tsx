'use client'

import { createContext, useContext, useState, ReactNode } from 'react'

interface UploadContextType {
  projectId: string | null
  setProjectId: (id: string | null) => void
  showUpload: boolean
  setShowUpload: (show: boolean) => void
}

const UploadContext = createContext<UploadContextType | null>(null)

export function UploadProvider({ children }: { children: ReactNode }) {
  const [projectId, setProjectId] = useState<string | null>(null)
  const [showUpload, setShowUpload] = useState(false)

  return (
    <UploadContext.Provider value={{ projectId, setProjectId, showUpload, setShowUpload }}>
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
