import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { AuthForm } from '@/components/auth/auth-form'
import { Navigation } from '@/components/navigation'
import { getLocalizedContent } from '@/lib/i18n-server'
import { getSessionUser } from '@/lib/supabase/session'

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'Kayıt Ol | TARIK ELER - TARNAK',
    // 2026-10-04: layout'tan `index: true` miras aliyordu — kayit formu
    // indeksleniyordu. noindex (bkz. login/page.tsx).
    robots: { index: false, follow: false },
  }
}

export const dynamic = 'force-dynamic'

export default async function SignupPage() {
  const user = await getSessionUser()
  if (user) {
    redirect(user.role === 'admin' ? '/admin' : '/')
  }
  const content = await getLocalizedContent()

  return (
    <div className="min-h-screen w-full relative">
      <Navigation content={content} />
      <main
        id="main"
        className="flex min-h-[70svh] w-full flex-col items-center justify-center px-4 pt-16 pb-8"
      >
        <AuthForm mode="signup" />
      </main>
    </div>
  )
}