'use client'

import { createContext, useContext, useState, useCallback, ReactNode } from 'react'

interface UploadContextType {
  triggerUpload: () => void
  uploadTriggered: boolean
  resetUploadTrigger: () => void
  setUploadHandler: (handler: (() => void) | null) => void
}

const UploadContext = createContext<UploadContextType | null>(null)

export function UploadProvider({ children }: { children: ReactNode }) {
  const [uploadTriggered, setUploadTriggered] = useState(false)
  const [uploadHandler, setUploadHandlerState] = useState<(() => void) | null>(null)

  const triggerUpload = useCallback(() => {
    if (uploadHandler) {
      uploadHandler()
    }
    setUploadTriggered(true)
  }, [uploadHandler])

  const resetUploadTrigger = useCallback(() => {
    setUploadTriggered(false)
  }, [])

  const setUploadHandler = useCallback((handler: (() => void) | null) => {
    setUploadHandlerState(() => handler)
  }, [])

  return (
    <UploadContext.Provider value={{ triggerUpload, uploadTriggered, resetUploadTrigger, setUploadHandler }}>
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
