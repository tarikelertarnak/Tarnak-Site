import { AboutSection } from '@/components/sections/about-section'
import { getCvs } from '@/lib/cv'
import { getStaticLocalizedContent } from '@/lib/i18n-server'
import { parsePhase6 } from '@/lib/phase6'

/**
 * `/about` sayfası (2026-10-18).
 *
 * Kullanıcı talebi: "/about içi ana menüdeki ile aynı olsun, sadece 'Daha
 * Fazlası' butonu olmasın." → Sayfa artık HİÇ farklı içerik üretmiyor;
 * ana sayfadaki Hakkımda bölümünü (`AboutSection`) aynen render ediyor.
 * `hideMoreButton` ile yalnızca "/about'a git" butonu gizleniyor.
 *
 * Eskiden burada `AboutPageView` (Supabase `content->'aboutPage'` biyografi)
 * + phase6 zaman çizelgesi/sertifikalar vardı. Zaman çizelgesi ve sertifika
 * içerikleri BOŞ olduğu için (0 madde) kayıp yok; `aboutPage` verisi
 * Supabase'de duruyor ve admin panelinden düzenlenebilir.
 *
 * 2026-10-03: ISR kaldırıldı — `force-static` kalır (Workers Free 10 ms CPU).
 * Dil istemcide çözülür (`AboutSection` → `useLocale()`), bu yüzden sayfayı
 * dinamik yapmaya gerek yok.
 */
export const dynamic = 'force-static'

export async function generateMetadata() {
  /*
   * Başlık ve açıklama SAYFADA GÖSTERİLEN içerikten türetilir (uydurma unvan
   * yazılmaz): `content.about` — ana sayfa Hakkımda bölümüyle aynı kaynak.
   */
  const content = await getStaticLocalizedContent()
  const about = content.about
  const aciklama
    = about?.description?.trim().slice(0, 180)
      || 'TARIK ELER (TARNAK) — kişisel site: projeler, yazılar ve iletişim.'
  const baslik = about?.subtitle?.trim() || 'HAKKIMDA'

  return {
    title: `${baslik} — TARIK ELER - TARNAK`,
    description: aciklama,
    alternates: { canonical: '/about' },
    openGraph: {
      title: `${baslik} — TARIK ELER - TARNAK`,
      description: aciklama,
      url: '/about',
      type: 'profile',
    },
  }
}

export default async function AboutPage() {
  const content = await getStaticLocalizedContent()
  const cvs = await getCvs()
  // Ek bölüm verileri — hâlâ başka sayfalarda kullanılıyor, phase6 korunur.
  const phase6 = parsePhase6(
    (content as unknown as Record<string, unknown>).phase6,
  )

  return (
    <div className="relative min-h-screen w-full">
      <main id="main" className="w-full">
        <AboutSection
          content={content}
          cvs={cvs}
          vcard={phase6?.vcard}
          hideMoreButton
        />
      </main>
    </div>
  )
}
