'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { formatRelativeTime } from '@/lib/utils'
import type { Profile } from '@/types/database'

interface UserWithRole extends Profile {
  is_active?: boolean
}

export default function UsersPage() {
  const [users, setUsers] = useState<UserWithRole[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [showInviteModal, setShowInviteModal] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    fetchUsers()
  }, [])

  const fetchUsers = async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false })

    if (!error && data) {
      const usersWithRoles = data.map((user, index) => ({
        ...user,
        role: (index === 0 ? 'Admin' : 'Standard') as Profile['role'],
        is_active: true,
      }))
      setUsers(usersWithRoles)
    }
    setLoading(false)
  }

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
                  <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 font-medium flex-shrink-0">
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

      {showInviteModal && (
        <InviteUserModal onClose={() => setShowInviteModal(false)} onInvited={fetchUsers} />
      )}
    </div>
  )
}

interface InviteUserModalProps {
  onClose: () => void
  onInvited: () => void
}

interface InviteEntry {
  email: string
  role: string
}

function InviteUserModal({ onClose, onInvited }: InviteUserModalProps) {
  const [step, setStep] = useState(1)
  const [invites, setInvites] = useState<InviteEntry[]>([{ email: '', role: 'Restricted' }])
  const [loading, setLoading] = useState(false)
  const [inviteLinks, setInviteLinks] = useState<string[]>([])
  const supabase = createClient()

  const updateInvite = (index: number, field: 'email' | 'role', value: string) => {
    const newInvites = [...invites]
    newInvites[index][field] = value
    setInvites(newInvites)
  }

  const addInvite = () => {
    setInvites([...invites, { email: '', role: 'Restricted' }])
  }

  const removeInvite = (index: number) => {
    if (invites.length > 1) {
      setInvites(invites.filter((_, i) => i !== index))
    }
  }

  const validInvites = invites.filter((inv) => inv.email.includes('@'))

  const handleNextStep = () => {
    if (step === 1 && validInvites.length > 0) {
      setStep(2)
    }
  }

  const handleSendInvites = async () => {
    setLoading(true)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setLoading(false)
      return
    }

    // Get the inviter's profile for the email
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', user.id)
      .single()

    const inviterName = profile?.full_name || 'A team member'
    const links: string[] = []

    for (const invite of validInvites) {
      const { data, error } = await supabase
        .from('invitations')
        .insert({
          email: invite.email,
          role: invite.role,
          invited_by: user.id,
        })
        .select()
        .single()

      if (!error && data) {
        const link = `${window.location.origin}/invite/${data.token}`
        links.push(link)

        // Send invitation email
        try {
          await fetch('/api/send-invite', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: invite.email,
              inviterName,
              inviteLink: link,
              role: invite.role,
            }),
          })
        } catch (emailError) {
          console.error('Failed to send email:', emailError)
        }
      }
    }

    setInviteLinks(links)
    setLoading(false)
    setStep(3)
  }

  const handleDone = () => {
    onInvited()
    onClose()
  }

  const copyAllLinks = () => {
    navigator.clipboard.writeText(inviteLinks.join('\n'))
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-white">
      <div className="min-h-full">
        {/* Header */}
        <div className="border-b border-gray-200 px-6 py-4">
          <button onClick={onClose} className="flex items-center gap-2 text-gray-600 hover:text-gray-900">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            <span>Users</span>
          </button>
        </div>

        {/* Content */}
        <div className="max-w-3xl mx-auto px-6 py-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-6">
            {step === 1 && 'Invite Users'}
            {step === 2 && 'Set Roles and Send'}
            {step === 3 && 'Invitations Created!'}
          </h1>

          {/* Stepper */}
          <div className="flex items-center gap-2 mb-8">
            <div className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${step > 1 ? 'bg-blue-600 text-white' : step === 1 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-500'}`}>
                {step > 1 ? (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : '1'}
              </div>
              <span className={`text-sm font-medium ${step >= 1 ? 'text-gray-900' : 'text-gray-400'}`}>Add Emails</span>
            </div>
            <div className="w-12 h-px bg-gray-300" />
            <div className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${step > 2 ? 'bg-blue-600 text-white' : step === 2 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-500'}`}>
                {step > 2 ? (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : '2'}
              </div>
              <span className={`text-sm font-medium ${step >= 2 ? 'text-gray-900' : 'text-gray-400'}`}>Review Invites</span>
            </div>
            <div className="w-12 h-px bg-gray-300" />
            <div className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${step === 3 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-500'}`}>
                {step === 3 ? (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : '3'}
              </div>
              <span className={`text-sm font-medium ${step === 3 ? 'text-gray-900' : 'text-gray-400'}`}>Done!</span>
            </div>
          </div>

          {/* Step 1: Add Emails */}
          {step === 1 && (
            <div>
              <p className="text-gray-600 mb-6">Enter the email addresses of the people you want to invite.</p>
              <div className="space-y-3">
                {invites.map((invite, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <div className="flex-1 relative">
                      <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                      <input
                        type="email"
                        value={invite.email}
                        onChange={(e) => updateInvite(index, 'email', e.target.value)}
                        placeholder="email@example.com"
                        className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    {invites.length > 1 && (
                      <button onClick={() => removeInvite(index)} className="p-2 text-gray-400 hover:text-gray-600">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <button onClick={addInvite} className="mt-4 flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add Another Email
              </button>
              <div className="mt-8 flex justify-end">
                <button
                  onClick={handleNextStep}
                  disabled={validInvites.length === 0}
                  className="px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Review Invites */}
          {step === 2 && (
            <div>
              <p className="text-gray-600 mb-6">
                Set each user&apos;s role. <em className="text-gray-500">Don&apos;t worry, this can be changed later.</em>
              </p>
              <div className="grid grid-cols-12 gap-4 mb-2">
                <div className="col-span-7 text-sm font-medium text-gray-500">Email</div>
                <div className="col-span-4 text-sm font-medium text-gray-500">Role</div>
                <div className="col-span-1"></div>
              </div>
              <div className="space-y-3">
                {validInvites.map((invite, index) => (
                  <div key={index} className="grid grid-cols-12 gap-4 items-center">
                    <div className="col-span-7">
                      <div className="flex items-center gap-3 px-4 py-3 border border-gray-300 rounded-lg bg-white">
                        <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                        <span className="text-gray-900">{invite.email}</span>
                      </div>
                    </div>
                    <div className="col-span-4">
                      <div className="relative">
                        <select
                          value={invite.role}
                          onChange={(e) => {
                            const newInvites = [...invites]
                            const originalIndex = invites.findIndex((inv) => inv.email === invite.email)
                            if (originalIndex !== -1) {
                              newInvites[originalIndex].role = e.target.value
                              setInvites(newInvites)
                            }
                          }}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-white text-gray-900 appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="Restricted">Restricted</option>
                          <option value="Standard">Standard</option>
                          <option value="Admin">Admin</option>
                        </select>
                        <svg className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </div>
                    <div className="col-span-1 flex justify-center">
                      <button
                        onClick={() => {
                          const originalIndex = invites.findIndex((inv) => inv.email === invite.email)
                          if (originalIndex !== -1) removeInvite(originalIndex)
                        }}
                        className="p-2 text-gray-300 hover:text-gray-500 rounded-full hover:bg-gray-100"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-6 flex items-center justify-between">
                <button
                  onClick={() => { addInvite(); setStep(1) }}
                  className="flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Invite Another User
                </button>
                <button
                  onClick={handleSendInvites}
                  disabled={loading || validInvites.length === 0}
                  className="px-8 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Creating...' : `Send ${validInvites.length} Invite${validInvites.length !== 1 ? 's' : ''}`}
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Done */}
          {step === 3 && (
            <div>
              <div className="text-center mb-8">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <p className="text-xl text-gray-900 font-medium">
                  {inviteLinks.length} invitation{inviteLinks.length !== 1 ? 's' : ''} sent!
                </p>
                <p className="text-gray-500 mt-2">
                  We&apos;ve sent email invitations to your team members.
                </p>
              </div>

              <div className="bg-gray-50 rounded-lg p-6 mb-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-medium text-gray-900">Invitation Links</h3>
                  <button onClick={copyAllLinks} className="text-blue-600 hover:text-blue-700 text-sm font-medium">
                    Copy All
                  </button>
                </div>
                <p className="text-sm text-gray-500 mb-4">
                  Emails have been sent. You can also share these links directly if needed.
                </p>
                <div className="space-y-2">
                  {inviteLinks.map((link, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <input
                        type="text"
                        value={link}
                        readOnly
                        className="flex-1 px-3 py-2 bg-white border border-gray-200 rounded text-sm text-gray-600"
                      />
                      <button
                        onClick={() => navigator.clipboard.writeText(link)}
                        className="px-3 py-2 text-blue-600 hover:text-blue-700 text-sm font-medium"
                      >
                        Copy
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="text-center">
                <button onClick={handleDone} className="px-8 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700">
                  Done
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
