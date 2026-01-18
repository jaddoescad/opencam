'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { formatRelativeTime } from '@/lib/utils'
import { useCurrentUser, useUsers } from '@/hooks'
import { InviteUserModal } from '@/components/invite-user-modal'

export default function UsersPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [showInviteModal, setShowInviteModal] = useState(false)
  const router = useRouter()
  const { role, loading: userLoading } = useCurrentUser()
  const { users, loading, refetch } = useUsers()

  // Derived authorization state
  const authorized = !userLoading && role !== null && role !== 'Restricted'

  // Check if user has permission to view this page
  useEffect(() => {
    if (!userLoading && role === 'Restricted') {
      router.push('/dashboard')
    }
  }, [role, userLoading, router])

  const getInitials = (name: string | null, email: string | null): string => {
    if (name) {
      return name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    }
    return email?.charAt(0)?.toUpperCase() || '?'
  }

  const filteredUsers = users.filter((user) =>
    user.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.email?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // Don't render until we confirm authorization
  if (userLoading || !authorized) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading...</div>
      </div>
    )
  }

  return (
    <div className="p-4 sm:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Users</h1>
          <div className="relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Find a user..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 w-full sm:w-64"
            />
          </div>
        </div>
        <button
          onClick={() => setShowInviteModal(true)}
          className="flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 font-medium w-full sm:w-auto"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Invite Users
        </button>
      </div>

      {/* Users Table - Desktop */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <div className="hidden md:grid grid-cols-12 gap-4 px-6 py-3 border-b border-gray-200 text-sm font-medium text-gray-500">
          <div className="col-span-5">Name</div>
          <div className="col-span-2">Role</div>
          <div className="col-span-3">Info</div>
          <div className="col-span-2">Latest Activity</div>
        </div>

        {loading ? (
          <div className="px-6 py-12 text-center text-gray-500">Loading users...</div>
        ) : filteredUsers.length === 0 ? (
          <div className="px-6 py-12 text-center text-gray-500">No users found</div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filteredUsers.map((user) => (
              <div key={user.id} className="px-4 sm:px-6 py-4 hover:bg-gray-50">
                {/* Mobile Layout */}
                <div className="md:hidden flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 font-medium shrink-0">
                    {getInitials(user.full_name, user.email)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className={`font-medium ${user.is_active ? 'text-gray-900' : 'text-gray-400'}`}>
                        {user.full_name || 'Invited User'}
                      </span>
                      <span className={`text-xs font-medium px-2 py-1 rounded ${user.role === 'Admin' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>
                        {user.role}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 truncate">{user.email}</p>
                    <p className="text-xs text-gray-400 mt-1">{formatRelativeTime(user.created_at)}</p>
                  </div>
                </div>
                {/* Desktop Layout */}
                <div className="hidden md:grid grid-cols-12 gap-4 items-center">
                  <div className="col-span-5 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 font-medium">
                      {getInitials(user.full_name, user.email)}
                    </div>
                    <span className={`font-medium ${user.is_active ? 'text-gray-900' : 'text-gray-400'}`}>
                      {user.full_name || 'Invited User'}
                    </span>
                  </div>
                  <div className="col-span-2">
                    <span className={`text-sm font-medium ${user.role === 'Admin' ? 'text-gray-900' : 'text-gray-500'}`}>
                      {user.role}
                    </span>
                  </div>
                  <div className="col-span-3">
                    <p className="text-sm text-gray-600">{user.email}</p>
                  </div>
                  <div className="col-span-2 flex items-center justify-between">
                    <div className="flex items-center gap-1 text-sm text-gray-500">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span>{formatRelativeTime(user.created_at)}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <InviteUserModal
        isOpen={showInviteModal}
        onClose={() => setShowInviteModal(false)}
        onInvited={refetch}
      />
    </div>
  )
}
