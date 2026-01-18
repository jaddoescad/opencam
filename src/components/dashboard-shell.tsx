'use client'

import { useState, useRef } from 'react'
import { usePathname } from 'next/navigation'
import { Sidebar } from './sidebar'
import { UploadProvider, useUpload } from '@/contexts/upload-context'
import { createClient } from '@/lib/supabase/client'
import type { Profile } from '@/types/database'

interface DashboardShellProps {
  user: Profile | null
  children: React.ReactNode
}

function CameraButton() {
  const { projectId, onPhotosUploaded } = useUpload()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const supabase = createClient()

  const handleClick = () => {
    if (projectId) {
      fileInputRef.current?.click()
    }
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0 || !projectId) return

    setUploading(true)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setUploading(false)
      return
    }

    // Same upload logic as PhotoUpload component
    for (const file of Array.from(files)) {
      const fileExt = file.name.split('.').pop()
      const fileName = `${projectId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`

      const { error: uploadError } = await supabase.storage
        .from('photos')
        .upload(fileName, file)

      if (!uploadError) {
        await supabase.from('photos').insert({
          project_id: projectId,
          uploaded_by: user.id,
          storage_path: fileName,
        })
      }
    }

    setUploading(false)

    // Refresh photos list
    if (onPhotosUploaded) {
      onPhotosUploaded()
    }

    // Reset input so the same file can be selected again
    e.target.value = ''
  }

  // Only show the button if we're on a project page
  if (!projectId) return null

  return (
    <div className="lg:hidden fixed bottom-6 left-1/2 -translate-x-1/2 z-40">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileChange}
        className="hidden"
      />
      <button
        onClick={handleClick}
        disabled={uploading}
        className="w-16 h-16 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:bg-blue-400 rounded-full shadow-lg flex items-center justify-center transition-colors"
        aria-label="Take photo"
      >
        {uploading ? (
          <svg className="animate-spin h-8 w-8 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        ) : (
          <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
            <circle cx="12" cy="13" r="3" strokeWidth={2} />
          </svg>
        )}
      </button>
    </div>
  )
}

export function DashboardShell({ user, children }: DashboardShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const pathname = usePathname()

  // Only show mobile header on main dashboard pages (home, users, templates)
  const showMobileHeader = pathname === '/dashboard' ||
    pathname === '/dashboard/users' ||
    pathname === '/dashboard/templates' ||
    pathname.startsWith('/dashboard/templates/')

  return (
    <UploadProvider>
      <div className="flex h-screen bg-gray-100 overflow-hidden">
        <Sidebar user={user} isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        {/* Main content */}
        <div className="flex-1 flex flex-col min-h-0 min-w-0">
          {/* Mobile header - only on main pages */}
          {showMobileHeader && (
            <div className="lg:hidden flex items-center justify-between h-16 px-4 bg-white border-b border-gray-200 flex-shrink-0">
              <button
                onClick={() => setSidebarOpen(true)}
                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  </svg>
                </div>
                <span className="font-semibold text-gray-900">OpenCam</span>
              </div>
              <div className="w-10" /> {/* Spacer for centering */}
            </div>
          )}

          {/* Page content */}
          <main className="flex-1 overflow-auto pb-24 sm:pb-0">
            {children}
          </main>

          {/* Mobile bottom camera button */}
          <CameraButton />
        </div>
      </div>
    </UploadProvider>
  )
}
