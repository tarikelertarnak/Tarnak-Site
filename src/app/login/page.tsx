import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { AuthForm } from '@/components/auth/auth-form'
import { Navigation } from '@/components/navigation'
import { getLocalizedContent } from '@/lib/i18n-server'
import { getSessionUser } from '@/lib/supabase/session'

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'Giriş | TARIK ELER - TARNAK',
    // 2026-10-04: Bu sayfa metadata'da SADECE title tasidi; `robots` alani
    // tanimli olmadigi icin layout'tan `index: true, follow: true` MIRAS
    // aliyordu. Yani giris formu Google'a "indekslenmeye uygun sayfa"
    // sinyali gonderiyordu. Ayni seyin /sign, /admin, /puck icin de gecerli
    // oldugu icelendi: hepsi noindex.
    robots: { index: false, follow: false },
  }
}

export const dynamic = 'force-dynamic'

export default async function LoginPage() {
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
        <AuthForm mode="login" />
      </main>
    </div>
  )
}
