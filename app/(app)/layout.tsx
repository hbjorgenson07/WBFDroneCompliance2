import Navbar from '@/components/Navbar'

// Tell Next.js not to prerender any page in the (app) group at build time.
// These pages require authentication and live Supabase data, so they must be
// rendered dynamically on each request, not ahead of time.
export const dynamic = 'force-dynamic'

// This layout wraps all authenticated app pages.
// The proxy (proxy.ts) redirects unauthenticated users before they reach here.
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-6">
        {children}
      </main>
      {/* Footer disclaimer */}
      <footer className="border-t border-gray-200 dark:border-gray-800 py-4 px-4 text-center">
        <p className="text-xs text-gray-400 dark:text-gray-500 max-w-2xl mx-auto">
          This tool is for personal recordkeeping and operational organization only.
          Regulatory requirements for aerial application records vary by state and operation type.
          The operator is responsible for reviewing current FAA and applicable state regulations.
        </p>
      </footer>
    </div>
  )
}
