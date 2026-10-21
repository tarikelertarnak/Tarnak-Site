import type { Metadata } from 'next'
import { AuthForm } from '@/components/auth/auth-form'

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'Kayıt Ol | TARIK ELER - TARNAK',
    // 2026-10-04: layout'tan `index: true` miras aliyordu — kayit formu
    // indeksleniyordu. noindex (bkz. login/page.tsx).
    robots: { index: false, follow: false },
  }
}

export const dynamic = 'force-static'

export default function SignupPage() {
  return (
    <div className="min-h-screen w-full relative">
      <main
        id="main"
        className="flex min-h-[70svh] w-full flex-col items-center justify-center px-4 pt-16 pb-8"
      >
        <AuthForm mode="signup" />
      </main>
    </div>
  )
}
