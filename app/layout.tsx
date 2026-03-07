import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Spray Log Tracker',
  description: 'Aerial application mission recordkeeping tool',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      {/*
        suppressHydrationWarning is needed because dark mode adds/removes the "dark"
        class on <html> via client-side JS, which differs from the initial server render.
      */}
      <body className="bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100 antialiased">
        {children}
      </body>
    </html>
  )
}
