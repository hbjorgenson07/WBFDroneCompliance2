import { MissionStatus } from '@/lib/types'

interface BadgeProps {
  status: MissionStatus
}

const statusConfig: Record<MissionStatus, { label: string; className: string }> = {
  planned:   { label: 'Planned',   className: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300' },
  completed: { label: 'Completed', className: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' },
  canceled:  { label: 'Canceled',  className: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400' },
}

export default function Badge({ status }: BadgeProps) {
  const config = statusConfig[status] ?? statusConfig.planned
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.className}`}>
      {config.label}
    </span>
  )
}
