// Server component wrapper — prevents Next.js from trying to prerender this page
// at build time. /login must be server-rendered at request time so auth state
// can be checked properly.
export const dynamic = 'force-dynamic'

import LoginForm from './LoginForm'

export default function LoginPage() {
  return <LoginForm />
}
