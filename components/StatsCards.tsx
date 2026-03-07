interface StatCardProps {
  label: string
  value: string | number
  sub?: string
}

function StatCard({ label, value, sub }: StatCardProps) {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
      <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide font-medium">{label}</p>
      <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-1">{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  )
}

interface StatsCardsProps {
  totalJobs: number
  completedThisMonth: number
  acresThisMonth: number
  pendingJobs: number
}

export default function StatsCards({ totalJobs, completedThisMonth, acresThisMonth, pendingJobs }: StatsCardsProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      <StatCard label="Total Jobs"            value={totalJobs} />
      <StatCard label="Completed This Month"  value={completedThisMonth} />
      <StatCard label="Acres This Month"      value={acresThisMonth.toFixed(1)} sub="acres treated" />
      <StatCard label="Planned / Pending"     value={pendingJobs} />
    </div>
  )
}
