import { redirect } from 'next/navigation'

// Root path redirects to dashboard (middleware will redirect to /login if not authenticated)
export default function Home() {
  redirect('/dashboard')
}
