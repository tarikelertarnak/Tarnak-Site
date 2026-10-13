import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { AuthForm } from '@/components/auth/auth-form'
import { Navigation } from '@/components/navigation'
import { safeNext } from '@/lib/safe-next'
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

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>
}) {
  // Kullanici istegi (2026-10-11): giris/kayit sonrasi "?next=/chat" degerine
  // don. safeNext() acik yonlendirmeyi (open redirect) engeller.
  const next = safeNext((await searchParams)?.next, '/')
  /*
   * 2026-10-13 ÖLÇÜM: bu blok ŞU AN ETKİSİZ (inert).
   *
   * Kök layout `dynamic = 'force-static'` olduğu için Next 16 alt segmentlerde
   * `cookies()`'ı BOŞ döndürüyor → `getSessionUser()` burada daima null.
   * Kanıt (geçerli admin_session cookie'siyle, aynı sunucu): /api/admin/session
   * 200 (oturum okunuyor), /login 200 (form gösteriliyor — /admin'e
   * yönlendirmiyor). Yani "giriş yapmışsa formu gösterme" niyeti çalışmıyor;
   * zararsız, çünkü kullanıcı formu doldurup giriş yapabiliyor.
   *
   * Blok SİLİNMEDİ: kök layout'tan force-static kalkarsa (ya da Next bunu
   * düzeltirse) kendiliğinden yeniden çalışır. Bu yüzden /admin'de yapıldığı
   * gibi istemci kapısına çevrilmesi GEREKMEDİ — orada kilitli kalma vardı
   * (panel hiç açılamıyordu), burada yalnızca bir kolaylık kaybı var.
   */
  const user = await getSessionUser()
  if (user) {
    // `next` varsa ona don; yoksa eski davranis (admin -> /admin).
    redirect(next !== '/' ? next : (user.role === 'admin' ? '/admin' : '/'))
  }

  return (
    <div className="min-h-screen w-full relative">
      <Navigation />
      <main
        id="main"
        className="flex min-h-[70svh] w-full flex-col items-center justify-center px-4 pt-16 pb-8"
      >
        <AuthForm mode="login" />
      </main>
    </div>
  )
}
