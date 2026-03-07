'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import LogDetail from '@/components/LogDetail'
import ConfirmModal from '@/components/ui/ConfirmModal'
import Button from '@/components/ui/Button'
import { SprayLog } from '@/lib/types'

export default function LogDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()

  const [log, setLog]               = useState<SprayLog | null>(null)
  const [loading, setLoading]       = useState(true)
  const [showDelete, setShowDelete] = useState(false)
  const [deleting, setDeleting]     = useState(false)

  useEffect(() => {
    fetch(`/api/logs/${id}`)
      .then(r => {
        if (!r.ok) throw new Error('Not found')
        return r.json()
      })
      .then(setLog)
      .catch(() => router.push('/logs'))
      .finally(() => setLoading(false))
  }, [id, router])

  async function handleDelete() {
    setDeleting(true)
    const res = await fetch(`/api/logs/${id}`, { method: 'DELETE' })
    if (res.ok) {
      router.push('/logs')
    } else {
      setDeleting(false)
      setShowDelete(false)
      alert('Failed to delete log. Please try again.')
    }
  }

  if (loading) {
    return <div className="text-sm text-gray-400 py-12 text-center">Loading...</div>
  }

  if (!log) return null

  return (
    <div className="space-y-4">
      {/* Action bar — hidden when printing */}
      <div className="flex flex-wrap items-center gap-2 no-print">
        <Link href="/logs">
          <Button variant="ghost" size="sm">← Back to Logs</Button>
        </Link>
        <div className="flex-1" />
        <Link href={`/logs/new?duplicate=${log.id}`}>
          <Button variant="secondary" size="sm">Duplicate</Button>
        </Link>
        <button
          onClick={() => window.print()}
          className="px-3 py-1.5 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 border border-gray-300 dark:border-gray-600 rounded-lg transition-colors"
        >
          Print
        </button>
        <Link href={`/api/export?search=${log.job_id}`}>
          <Button variant="secondary" size="sm">Export CSV</Button>
        </Link>
        <Link href={`/logs/${id}/edit`}>
          <Button variant="primary" size="sm">Edit</Button>
        </Link>
        <Button variant="danger" size="sm" onClick={() => setShowDelete(true)}>
          Delete
        </Button>
      </div>

      {/* Log detail */}
      <LogDetail log={log} />

      {/* Delete confirmation modal */}
      <ConfirmModal
        open={showDelete}
        title="Delete this log?"
        message={`This will permanently delete job ${log.job_id}. This cannot be undone.`}
        confirmLabel="Yes, delete it"
        onConfirm={handleDelete}
        onCancel={() => setShowDelete(false)}
        loading={deleting}
      />
    </div>
  )
}
