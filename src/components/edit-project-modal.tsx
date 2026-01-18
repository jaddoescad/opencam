'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Project } from '@/types/database'

interface EditProjectModalProps {
  project: Project | null
  isOpen: boolean
  onClose: () => void
  onSave: () => void
}

const COUNTRIES = [
  'Canada',
  'United States',
  'United Kingdom',
  'Australia',
  'Other',
]

export function EditProjectModal({ project, isOpen, onClose, onSave }: EditProjectModalProps) {
  const [name, setName] = useState('')
  const [addressLine1, setAddressLine1] = useState('')
  const [addressLine2, setAddressLine2] = useState('')
  const [city, setCity] = useState('')
  const [state, setState] = useState('')
  const [postalCode, setPostalCode] = useState('')
  const [country, setCountry] = useState('Canada')
  const [proposalAmount, setProposalAmount] = useState('')
  const [invoiceAmount, setInvoiceAmount] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  // Populate form when project changes
  useEffect(() => {
    if (project) {
      setName(project.name || '')
      setAddressLine1(project.address_line1 || '')
      setAddressLine2(project.address_line2 || '')
      setCity(project.city || '')
      setState(project.state || '')
      setPostalCode(project.postal_code || '')
      setCountry(project.country || 'Canada')
      setProposalAmount(project.proposal_amount?.toString() || '')
      setInvoiceAmount(project.invoice_amount?.toString() || '')
    }
  }, [project])

  if (!isOpen || !project) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    // Build full address string for display
    const addressParts = [addressLine1, addressLine2, city, state, postalCode].filter(Boolean)
    const fullAddress = addressParts.join(', ')

    const { error: updateError } = await supabase
      .from('projects')
      .update({
        name,
        address: fullAddress || null,
        address_line1: addressLine1 || null,
        address_line2: addressLine2 || null,
        city: city || null,
        state: state || null,
        postal_code: postalCode || null,
        country: country || null,
        proposal_amount: proposalAmount ? parseFloat(proposalAmount) : null,
        invoice_amount: invoiceAmount ? parseFloat(invoiceAmount) : null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', project.id)

    if (updateError) {
      setError(updateError.message)
      setLoading(false)
      return
    }

    setLoading(false)
    onSave()
    onClose()
  }

  const handleClose = () => {
    setError(null)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="fixed inset-0 bg-black/50" onClick={handleClose} />
        <div className="relative bg-white rounded-xl shadow-xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
          <h2 className="text-xl font-bold text-gray-900 mb-6">Edit Project</h2>

          <form onSubmit={handleSubmit}>
            {error && (
              <div className="mb-4 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md text-sm">
                {error}
              </div>
            )}

            <div className="space-y-4">
              {/* Project Name */}
              <div>
                <label htmlFor="edit-name" className="block text-sm font-semibold text-gray-800 mb-1">
                  Project Name
                </label>
                <input
                  id="edit-name"
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="block w-full px-4 py-3 border border-gray-200 rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-700 placeholder-gray-400"
                  placeholder="Project Name"
                />
              </div>

              {/* Project Address 1 */}
              <div>
                <label htmlFor="edit-addressLine1" className="block text-sm font-semibold text-gray-800 mb-1">
                  Project Address 1
                </label>
                <input
                  id="edit-addressLine1"
                  type="text"
                  value={addressLine1}
                  onChange={(e) => setAddressLine1(e.target.value)}
                  className="block w-full px-4 py-3 border border-gray-200 rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-700 placeholder-gray-400"
                  placeholder="Project Address 1"
                />
              </div>

              {/* Project Address 2 */}
              <div>
                <label htmlFor="edit-addressLine2" className="block text-sm font-semibold text-gray-800 mb-1">
                  Project Address 2
                </label>
                <input
                  id="edit-addressLine2"
                  type="text"
                  value={addressLine2}
                  onChange={(e) => setAddressLine2(e.target.value)}
                  className="block w-full px-4 py-3 border border-gray-200 rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-700 placeholder-gray-400"
                  placeholder="Project Address 2"
                />
              </div>

              {/* City */}
              <div>
                <label htmlFor="edit-city" className="block text-sm font-semibold text-gray-800 mb-1">
                  City
                </label>
                <input
                  id="edit-city"
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="block w-full px-4 py-3 border border-gray-200 rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-700 placeholder-gray-400"
                  placeholder="City"
                />
              </div>

              {/* State and Postal Code - Side by Side */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="edit-state" className="block text-sm font-semibold text-gray-800 mb-1">
                    State
                  </label>
                  <input
                    id="edit-state"
                    type="text"
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    className="block w-full px-4 py-3 border border-gray-200 rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-700 placeholder-gray-400"
                    placeholder="State"
                  />
                </div>
                <div>
                  <label htmlFor="edit-postalCode" className="block text-sm font-semibold text-gray-800 mb-1">
                    Postal Code
                  </label>
                  <input
                    id="edit-postalCode"
                    type="text"
                    value={postalCode}
                    onChange={(e) => setPostalCode(e.target.value)}
                    className="block w-full px-4 py-3 border border-gray-200 rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-700 placeholder-gray-400"
                    placeholder="Postal Code"
                  />
                </div>
              </div>

              {/* Country */}
              <div>
                <label htmlFor="edit-country" className="block text-sm font-semibold text-gray-800 mb-1">
                  Country
                </label>
                <div className="relative">
                  <select
                    id="edit-country"
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    className="block w-full px-4 py-3 border border-gray-200 rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-700 appearance-none cursor-pointer"
                  >
                    {COUNTRIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-gray-400">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
              </div>

              {/* Proposal Amount and Invoice Amount - Side by Side */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="edit-proposalAmount" className="block text-sm font-semibold text-gray-800 mb-1">
                    Proposal Amount
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                    <input
                      id="edit-proposalAmount"
                      type="number"
                      step="0.01"
                      min="0"
                      value={proposalAmount}
                      onChange={(e) => setProposalAmount(e.target.value)}
                      className="block w-full pl-8 pr-4 py-3 border border-gray-200 rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-700 placeholder-gray-400"
                      placeholder="0.00"
                    />
                  </div>
                </div>
                <div>
                  <label htmlFor="edit-invoiceAmount" className="block text-sm font-semibold text-gray-800 mb-1">
                    Invoice Amount
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                    <input
                      id="edit-invoiceAmount"
                      type="number"
                      step="0.01"
                      min="0"
                      value={invoiceAmount}
                      onChange={(e) => setInvoiceAmount(e.target.value)}
                      className="block w-full pl-8 pr-4 py-3 border border-gray-200 rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-700 placeholder-gray-400"
                      placeholder="0.00"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Buttons */}
            <div className="mt-8 space-y-3">
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 text-base font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? 'Saving...' : 'Save Changes'}
              </button>
              <button
                type="button"
                onClick={handleClose}
                className="w-full py-3 px-4 text-base font-semibold text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
