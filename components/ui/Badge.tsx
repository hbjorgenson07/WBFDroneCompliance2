import { MissionStatus } from '@/lib/types'

interface BadgeProps {
  status: MissionStatus
}

const statusConfig: Record<MissionStatus, { label: string; className: string }> = {
  planned:   { label: 'Planned',   className: 'bg-blue-50 text-blue-700 ring-blue-600/20 dark:bg-blue-500/10 dark:text-blue-400 dark:ring-blue-500/20' },
  completed: { label: 'Completed', className: 'bg-green-50 text-green-700 ring-green-600/20 dark:bg-green-500/10 dark:text-green-400 dark:ring-green-500/20' },
  canceled:  { label: 'Canceled',  className: 'bg-gray-50 text-gray-600 ring-gray-500/20 dark:bg-white/5 dark:text-gray-400 dark:ring-white/10' },
}

export default function Badge({ status }: BadgeProps) {
  const config = statusConfig[status] ?? statusConfig.planned
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-lg text-xs font-medium ring-1 ring-inset ${config.className}`}>
      {config.label}
    </span>
  )
}
