'use client'

import { useState, useEffect } from 'react'
import { Input } from './ui/Input'
import Button from './ui/Button'
import { UserProfileFormData } from '@/lib/types'

export default function SettingsForm() {
  const [form, setForm] = useState<UserProfileFormData>({
    operator_name: null,
    aircraft_tail_number: null,
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    fetch('/api/profile')
      .then(r => r.json())
      .then(data => {
        setForm({
          operator_name: data.operator_name ?? null,
          aircraft_tail_number: data.aircraft_tail_number ?? null,
        })
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  async function handleSave() {
    setSaving(true)
    setMessage('')
    try {
      const res = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (!res.ok) throw new Error('Save failed')
      setMessage('Profile saved.')
    } catch {
      setMessage('Error saving profile.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="text-sm text-gray-400 animate-pulse">Loading...</div>

  return (
    <div className="max-w-md space-y-4">
      <Input
        label="Remote Pilot"
        value={form.operator_name ?? ''}
        onChange={e => setForm(f => ({ ...f, operator_name: e.target.value || null }))}
        placeholder="e.g. John Smith"
      />
      <Input
        label="Drone Registration / Serial #"
        value={form.aircraft_tail_number ?? ''}
        onChange={e => setForm(f => ({ ...f, aircraft_tail_number: e.target.value || null }))}
        placeholder="e.g. FA3xxxxxx"
      />
      <div className="flex items-center gap-3">
        <Button variant="primary" onClick={handleSave} loading={saving}>
          Save Profile
        </Button>
        {message && (
          <span className={`text-sm ${message.includes('Error') ? 'text-red-500' : 'text-green-600 dark:text-green-400'}`}>
            {message}
          </span>
        )}
      </div>
    </div>
  )
}
