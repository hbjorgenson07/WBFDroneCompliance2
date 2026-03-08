interface StatCardProps {
  label: string
  value: string | number
  sub?: string
}

function StatCard({ label, value, sub }: StatCardProps) {
  return (
    <div className="bg-white dark:bg-[#141414] rounded-2xl border border-gray-200/80 dark:border-white/5 p-5 hover:shadow-[var(--shadow-1)] transition-all duration-200 ease-out">
      <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider font-semibold">{label}</p>
      <p className="text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-100 mt-1">{value}</p>
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
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
      <StatCard label="Total Jobs"            value={totalJobs} />
      <StatCard label="Completed This Month"  value={completedThisMonth} />
      <StatCard label="Acres This Month"      value={acresThisMonth.toFixed(1)} sub="acres treated" />
      <StatCard label="Planned / Pending"     value={pendingJobs} />
    </div>
  )
}
