'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getInitials, formatRelativeTime } from '@/lib/utils'
import { useCurrentUser } from '@/hooks'
import type { Profile, ProjectMember } from '@/types/database'

interface MemberListProps {
  members: (ProjectMember & { profile: Profile })[]
  projectId: string
  onMembersChange: () => void
}

export function MemberList({ members, projectId, onMembersChange }: MemberListProps) {
  const [showAddModal, setShowAddModal] = useState(false)
  const [allUsers, setAllUsers] = useState<Profile[]>([])
  const [selectedUsers, setSelectedUsers] = useState<string[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [fetchingUsers, setFetchingUsers] = useState(false)
  const supabase = createClient()
  const { user, role: currentUserRole } = useCurrentUser()

  // Current user ID from hook
  const currentUserId = user?.id ?? null

  // Check if current user can see emails (Admin or Standard only)
  const canSeeEmails = currentUserRole === 'Admin' || currentUserRole === 'Standard'

  useEffect(() => {
    if (showAddModal) {
      fetchAllUsers()
    }
  }, [showAddModal])

  const fetchAllUsers = async () => {
    setFetchingUsers(true)

    const { data } = await supabase
      .from('profiles')
      .select('*')
      .order('full_name', { ascending: true })

    if (data) {
      setAllUsers(data)
    }
    setFetchingUsers(false)
  }

  // Filter out users who are already members and the current user
  const existingMemberIds = members.map((m) => m.user_id)
  const availableUsers = allUsers.filter((user) =>
    !existingMemberIds.includes(user.id) && user.id !== currentUserId
  )

  // Filter by search query
  const filteredUsers = availableUsers.filter((user) =>
    user.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.email?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const toggleUserSelection = (userId: string) => {
    setSelectedUsers((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId]
    )
  }

  const handleAddMembers = async () => {
    if (selectedUsers.length === 0) return

    setLoading(true)

    // Add all selected users as members
    const insertData = selectedUsers.map((userId) => ({
      project_id: projectId,
      user_id: userId,
      role: 'member',
    }))

    const { error } = await supabase
      .from('project_members')
      .insert(insertData)

    if (!error) {
      setSelectedUsers([])
      setSearchQuery('')
      setShowAddModal(false)
      onMembersChange()
    }

    setLoading(false)
  }

  const handleCloseModal = () => {
    setShowAddModal(false)
    setSelectedUsers([])
    setSearchQuery('')
  }

  const handleRemoveMember = async (memberId: string) => {
    if (!confirm('Are you sure you want to remove this member?')) return

    const { error } = await supabase
      .from('project_members')
      .delete()
      .eq('id', memberId)

    if (!error) {
      onMembersChange()
    }
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-medium text-gray-900">Project Members</h3>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 text-sm"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Member
        </button>
      </div>

      {members.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 text-gray-500">
          <svg className="w-16 h-16 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
          <p className="text-lg font-medium">No members yet</p>
          <p className="mt-1">Add team members to collaborate on this project</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm divide-y">
          {members.map((member) => (
            <div key={member.id} className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 font-medium">
                  {getInitials(member.profile?.full_name)}
                </div>
                <div>
                  <p className="font-medium text-gray-900">
                    {member.profile?.full_name || 'Unknown'}
                  </p>
                  {canSeeEmails && (
                    <p className="text-sm text-gray-500">{member.profile?.email}</p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-xs text-gray-400">
                  Added {formatRelativeTime(member.added_at)}
                </span>
                <button
                  onClick={() => handleRemoveMember(member.id)}
                  className="text-gray-400 hover:text-red-500"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Member Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/50" onClick={handleCloseModal} />
            <div className="relative bg-white rounded-lg shadow-xl max-w-lg w-full">
              {/* Modal Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-gray-900">Add Members</h2>
                <button onClick={handleCloseModal} className="text-gray-400 hover:text-gray-600">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Search */}
              <div className="px-6 py-4 border-b border-gray-200">
                <div className="relative">
                  <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search users..."
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* User List */}
              <div className="max-h-80 overflow-y-auto">
                {fetchingUsers ? (
                  <div className="px-6 py-8 text-center text-gray-500">Loading users...</div>
                ) : filteredUsers.length === 0 ? (
                  <div className="px-6 py-8 text-center text-gray-500">
                    {availableUsers.length === 0
                      ? 'All users are already members of this project'
                      : 'No users found matching your search'
                    }
                  </div>
                ) : (
                  <div className="divide-y divide-gray-100">
                    {filteredUsers.map((user) => {
                      const isSelected = selectedUsers.includes(user.id)
                      return (
                        <div
                          key={user.id}
                          onClick={() => toggleUserSelection(user.id)}
                          className={`flex items-center gap-3 px-6 py-3 cursor-pointer transition-colors ${
                            isSelected ? 'bg-blue-50' : 'hover:bg-gray-50'
                          }`}
                        >
                          <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                            isSelected
                              ? 'bg-blue-600 border-blue-600'
                              : 'border-gray-300'
                          }`}>
                            {isSelected && (
                              <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                          </div>
                          <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 font-medium">
                            {getInitials(user.full_name)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-gray-900 truncate">
                              {user.full_name || 'Unnamed User'}
                            </p>
                            {canSeeEmails && (
                              <p className="text-sm text-gray-500 truncate">{user.email}</p>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 bg-gray-50 rounded-b-lg">
                <p className="text-sm text-gray-500">
                  {selectedUsers.length > 0
                    ? `${selectedUsers.length} user${selectedUsers.length !== 1 ? 's' : ''} selected`
                    : 'Select users to add'
                  }
                </p>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleAddMembers}
                    disabled={loading || selectedUsers.length === 0}
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? 'Adding...' : `Add ${selectedUsers.length > 0 ? selectedUsers.length : ''} Member${selectedUsers.length !== 1 ? 's' : ''}`}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
