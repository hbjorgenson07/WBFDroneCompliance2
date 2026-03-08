import { createClient } from '@/lib/supabase/server'
import { SprayLog } from '@/lib/types'

// Simple stats page — Server Component
export default async function StatsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data } = await supabase
    .from('spray_logs')
    .select('*')
    .eq('user_id', user!.id)

  const logs: SprayLog[] = data ?? []

  // Total acreage
  const totalAcres = logs.reduce((sum, l) => sum + (l.acreage_treated ?? 0), 0)

  // Jobs by status
  const byStatus = {
    completed: logs.filter(l => l.mission_status === 'completed').length,
    planned:   logs.filter(l => l.mission_status === 'planned').length,
    canceled:  logs.filter(l => l.mission_status === 'canceled').length,
  }

  // Jobs by crop type (top 10)
  const cropCounts: Record<string, number> = {}
  logs.forEach(l => {
    if (l.crop_type) cropCounts[l.crop_type] = (cropCounts[l.crop_type] ?? 0) + 1
  })
  const topCrops = Object.entries(cropCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)

  // Jobs by aircraft
  const aircraftCounts: Record<string, number> = {}
  logs.forEach(l => {
    if (l.aircraft_tail_number) {
      aircraftCounts[l.aircraft_tail_number] = (aircraftCounts[l.aircraft_tail_number] ?? 0) + 1
    }
  })
  const byAircraft = Object.entries(aircraftCounts).sort((a, b) => b[1] - a[1])

  // Restricted use pesticide count
  const rupCount = logs.filter(l => l.restricted_use_pesticide).length

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold tracking-tight text-gray-900 dark:text-gray-100">Statistics</h1>

      {/* Summary numbers */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatTile label="Total Jobs"    value={logs.length} />
        <StatTile label="Total Acres"   value={totalAcres.toFixed(1)} />
        <StatTile label="Completed"     value={byStatus.completed} />
        <StatTile label="RUP Jobs"      value={rupCount} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Status breakdown */}
        <Section title="Jobs by Status">
          <BarRow label="Completed" count={byStatus.completed} total={logs.length} color="bg-green-500" />
          <BarRow label="Planned"   count={byStatus.planned}   total={logs.length} color="bg-blue-500" />
          <BarRow label="Canceled"  count={byStatus.canceled}  total={logs.length} color="bg-gray-400" />
        </Section>

        {/* Aircraft breakdown */}
        {byAircraft.length > 0 && (
          <Section title="Jobs by Aircraft">
            {byAircraft.map(([tail, count]) => (
              <BarRow key={tail} label={tail} count={count} total={logs.length} color="bg-green-600" />
            ))}
          </Section>
        )}

        {/* Crop breakdown */}
        {topCrops.length > 0 && (
          <Section title="Jobs by Crop Type">
            {topCrops.map(([crop, count]) => (
              <BarRow key={crop} label={crop} count={count} total={logs.length} color="bg-green-600" />
            ))}
          </Section>
        )}
      </div>

      {logs.length === 0 && (
        <p className="text-center text-gray-400 dark:text-gray-500 text-sm py-12">
          No data yet. Create some spray logs to see stats here.
        </p>
      )}
    </div>
  )
}

function StatTile({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-white dark:bg-[#141414] rounded-2xl border border-gray-200/80 dark:border-white/5 p-5 hover:shadow-[var(--shadow-1)] transition-all duration-200 ease-out">
      <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider font-semibold">{label}</p>
      <p className="text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-100 mt-1">{value}</p>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white dark:bg-[#141414] rounded-2xl border border-gray-200/80 dark:border-white/5 p-5 space-y-3">
      <h2 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{title}</h2>
      {children}
    </div>
  )
}

function BarRow({ label, count, total, color }: {
  label: string; count: number; total: number; color: string
}) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="text-gray-700 dark:text-gray-300">{label}</span>
        <span className="text-gray-500 dark:text-gray-400">{count} ({pct}%)</span>
      </div>
      <div className="h-2 bg-gray-100 dark:bg-white/5 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}
