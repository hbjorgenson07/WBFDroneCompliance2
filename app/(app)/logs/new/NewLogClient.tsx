'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import SprayLogForm from '@/components/SprayLogForm'
import { SprayLog, SprayLogFormData } from '@/lib/types'
import { generateJobId } from '@/lib/utils'

// This client component handles the optional "duplicate" query param.
// When ?duplicate=[id] is in the URL, it fetches that log and pre-fills the form.
export default function NewLogClient() {
  const searchParams = useSearchParams()
  const duplicateId = searchParams.get('duplicate')

  const [initialData, setInitialData] = useState<Partial<SprayLogFormData> | undefined>()
  const [loading, setLoading] = useState(!!duplicateId)

  useEffect(() => {
    if (!duplicateId) return

    // Fetch the source log and strip out the ID fields so it creates a new record
    fetch(`/api/logs/${duplicateId}`)
      .then(r => r.json())
      .then((log: SprayLog) => {
        const { id: _id, user_id: _uid, created_at: _ca, updated_at: _ua, ...rest } = log
        // Give the duplicate a fresh job_id and today's date
        setInitialData({
          ...rest,
          job_id: generateJobId(),
          date: new Date().toISOString().slice(0, 10),
          mission_status: 'planned',
        })
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [duplicateId])

  if (loading) {
    return <div className="text-sm text-gray-400">Loading duplicate log...</div>
  }

  return <SprayLogForm initialData={initialData} />
}
