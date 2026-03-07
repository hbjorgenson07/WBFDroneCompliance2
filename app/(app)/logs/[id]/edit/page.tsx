'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import SprayLogForm from '@/components/SprayLogForm'
import Button from '@/components/ui/Button'
import { SprayLog } from '@/lib/types'

export default function EditLogPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()

  const [log, setLog]     = useState<SprayLog | null>(null)
  const [loading, setLoading] = useState(true)

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

  if (loading) {
    return <div className="text-sm text-gray-400 py-12 text-center">Loading...</div>
  }

  if (!log) return null

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Link href={`/logs/${id}`}>
          <Button variant="ghost" size="sm">← Cancel</Button>
        </Link>
        <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">
          Edit Log — {log.job_id}
        </h1>
      </div>

      <SprayLogForm logId={id} initialData={log} />
    </div>
  )
}
