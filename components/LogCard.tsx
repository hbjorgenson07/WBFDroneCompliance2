import Link from 'next/link'
import { SprayLog } from '@/lib/types'
import Badge from './ui/Badge'
import { formatDate, truncate } from '@/lib/utils'

interface LogCardProps {
  log: SprayLog
}

export default function LogCard({ log }: LogCardProps) {
  return (
    <Link
      href={`/logs/${log.id}`}
      className="block bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-4 hover:border-green-400 hover:shadow-sm transition-all"
    >
      {/* Top row: Job ID + Status badge */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <span className="text-xs font-mono text-gray-500 dark:text-gray-400">{log.job_id}</span>
        <Badge status={log.mission_status} />
      </div>

      {/* Customer and field */}
      <p className="font-semibold text-gray-900 dark:text-gray-100 text-sm leading-snug">
        {log.customer_name ?? '—'} &middot; {log.field_name ?? '—'}
      </p>

      {/* Date and aircraft */}
      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
        {formatDate(log.date)}
        {log.aircraft_tail_number && <span className="ml-2 text-gray-400">· {log.aircraft_tail_number}</span>}
      </p>

      {/* Product and acreage */}
      <div className="flex items-center gap-3 mt-2 text-xs text-gray-600 dark:text-gray-400">
        {log.product_name && <span>{truncate(log.product_name, 30)}</span>}
        {log.acreage_treated != null && (
          <span className="ml-auto font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap">
            {log.acreage_treated} ac
          </span>
        )}
      </div>
    </Link>
  )
}
