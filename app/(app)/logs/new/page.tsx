import { Suspense } from 'react'
import NewLogClient from './NewLogClient'

export default function NewLogPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">New Spray Log</h1>
      <Suspense fallback={<div className="text-sm text-gray-400">Loading form...</div>}>
        <NewLogClient />
      </Suspense>
    </div>
  )
}
