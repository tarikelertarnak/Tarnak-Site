import type { Metadata } from 'next'
import { AuthForm } from '@/components/auth/auth-form'

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

export const dynamic = 'force-static'

export default function LoginPage() {
  return (
    <div className="min-h-screen w-full relative">
      <main
        id="main"
        className="flex min-h-[70svh] w-full flex-col items-center justify-center px-4 pt-16 pb-8"
      >
        <AuthForm mode="login" />
      </main>
    </div>
  )
}
