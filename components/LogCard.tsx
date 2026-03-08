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
      className="block bg-white dark:bg-[#141414] border border-gray-200/80 dark:border-white/5 rounded-2xl p-5 hover:-translate-y-0.5 hover:shadow-[var(--shadow-2)] transition-all duration-200 ease-out"
    >
      {/* Top row: Job ID + Status badge */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <span className="text-xs font-mono text-gray-500 dark:text-gray-400">{log.job_id}</span>
        <Badge status={log.mission_status} />
      </div>

      {/* Customer and field */}
      <p className="font-semibold text-gray-900 dark:text-gray-100 text-sm leading-snug">
        {log.customer_name ?? '\u2014'} &middot; {log.field_name ?? '\u2014'}
      </p>

      {/* Date and aircraft */}
      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
        {formatDate(log.date)}
        {log.aircraft_tail_number && <span className="ml-2 text-gray-400">&middot; {log.aircraft_tail_number}</span>}
      </p>

      {/* Product and acreage */}
      <div className="flex items-center gap-3 mt-2 text-xs text-gray-600 dark:text-gray-400">
        {(() => {
          const productCount = log.products?.length ?? 0
          const displayName = productCount > 0 ? log.products[0]?.product_name : log.product_name
          const extra = productCount > 1 ? ` +${productCount - 1} more` : ''
          return displayName ? <span>{truncate(displayName, 30)}{extra && <span className="text-gray-400 dark:text-gray-500">{extra}</span>}</span> : null
        })()}
        {log.acreage_treated != null && (
          <span className="ml-auto font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap">
            {log.acreage_treated} ac
          </span>
        )}
      </div>
    </Link>
  )
}
