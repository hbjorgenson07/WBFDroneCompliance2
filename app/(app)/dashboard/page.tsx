import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import StatsCards from '@/components/StatsCards'
import LogCard from '@/components/LogCard'
import Button from '@/components/ui/Button'
import { SprayLog } from '@/lib/types'

// Dashboard is a Server Component — data is fetched directly from Supabase server-side
export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Fetch all logs for stat calculations
  const { data: allLogs } = await supabase
    .from('spray_logs')
    .select('*')
    .eq('user_id', user!.id)
    .order('date', { ascending: false })

  const logs: SprayLog[] = allLogs ?? []

  // Calculate stats
  const now = new Date()
  const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

  const completedThisMonth = logs.filter(
    l => l.mission_status === 'completed' && l.date?.startsWith(thisMonth)
  ).length

  const acresThisMonth = logs
    .filter(l => l.mission_status === 'completed' && l.date?.startsWith(thisMonth))
    .reduce((sum, l) => sum + (l.acreage_treated ?? 0), 0)

  const pendingJobs = logs.filter(l => l.mission_status === 'planned').length

  // Most recent 5 logs for the dashboard list
  const recentLogs = logs.slice(0, 5)

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-gray-900 dark:text-gray-100">Dashboard</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Overview of your spray operations</p>
        </div>
        <Link href="/logs/new">
          <Button variant="primary" size="lg">+ New Log</Button>
        </Link>
      </div>

      {/* Stats */}
      <StatsCards
        totalJobs={logs.length}
        completedThisMonth={completedThisMonth}
        acresThisMonth={acresThisMonth}
        pendingJobs={pendingJobs}
      />

      {/* Recent logs */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
            Recent Logs
          </h2>
          <Link href="/logs" className="text-sm text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300 transition-colors duration-200">
            View all
          </Link>
        </div>

        {recentLogs.length === 0 ? (
          <div className="bg-white dark:bg-[#141414] rounded-2xl border border-gray-200/80 dark:border-white/5 p-8 text-center">
            <p className="text-gray-400 dark:text-gray-500 text-sm mb-4">No spray logs yet.</p>
            <Link href="/logs/new">
              <Button variant="primary">Create your first log</Button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {recentLogs.map(log => (
              <LogCard key={log.id} log={log} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
