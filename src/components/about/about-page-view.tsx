'use client'

import type { AboutPage } from '@/lib/about-page'
import { useRouter } from 'next/navigation'
import { useCallback } from 'react'
import { useLocale, useT } from '@/components/locale-provider'
import { Button } from '@/components/ui/button'
import {
  ChevronRightIcon,
  ClockIcon,
  ErrorIcon,
  GithubIcon,
  SchoolIcon,
  UserIcon,
} from '@/components/ui/icons'
import { Section } from '@/components/ui/section'
import { paragraphs, pickLocalized } from '@/lib/about-page'

/**
 * `/about` sayfasının gövdesi (2026-10-17).
 *
 * İçerik veritabanından (`site_content.content->'aboutPage'`) gelir; bu
 * bileşen YALNIZCA gösterir. Kaynak kodda yedek/örnek metin YOKTUR:
 *
 *   · içerik varsa  → bölümler render edilir (seçili dilde),
 *   · içerik yoksa  → yerelleştirilmiş BOŞ DURUM,
 *   · okuma hatası  → HATA DURUMU (boş sonuçmuş gibi davranılmaz).
 *
 * Dil: sayfa `force-static` olduğu için sunucu her zaman taban dil (tr)
 * basar; istemci `useLocale()` ile cerezi okur ve gerekirse İngilizceye
 * çevirir. Bu, sitenin diğer istemci bölümleriyle (projects-grid,
 * github-repos) AYNI mekanizmadır — sayfayı dinamik yapıp Workers CPU
 * bütçesini yakmaz, hydration uyuşmazlığı da üretmez (ilk render sunucu
 * ile aynı, düzeltme effect sonrası).
 */
export function AboutPageView({
  aboutPage,
  readFailed,
  githubUrl,
}: {
  aboutPage: AboutPage | null
  /** Veritabanı okuması başarısız mı (içerik yokluğundan AYRI durum). */
  readFailed: boolean
  /** GitHub profil adresi — ayarlardan çözülür, bileşende sabitlenmez. */
  githubUrl: string
}) {
  const { t } = useT()
  const { locale } = useLocale()

  /*
   * İçerik yokken hero (büyük başlık + butonlar) BASILMAZ: tek bir durum
   * kartı gösterilir. Böylece aynı metin iki kez görünmez ve sayfa
   * erişilebilirlik açısından tek bir <h1> taşır.
   */
  const icerikVar = !readFailed && aboutPage !== null && hasContent(aboutPage)

  return (
    <main id="main" className="w-full">
      {icerikVar
        ? (
            <>
              <Hero
                title={pickLocalized(aboutPage.title, locale) || t('about.emptyTitle')}
                githubUrl={githubUrl}
              />
              <Content aboutPage={aboutPage} githubUrl={githubUrl} />
            </>
          )
        : (
            <StateCard
              title={readFailed ? t('about.errorTitle') : t('about.emptyTitle')}
              description={readFailed ? t('about.errorDesc') : t('about.emptyDesc')}
              retry={readFailed}
            />
          )}
    </main>
  )
}

/** İçerik "dolu" sayılır mı — boş kayıt boş durum göstermeli. */
function hasContent(page: AboutPage): boolean {
  const dolu = (v: { tr: string, en: string }) =>
    Boolean(v.tr.trim() || v.en.trim())
 return (
    dolu(page.intro)
    || dolu(page.closing)
    || page.areas.length > 0
    || page.journey.length > 0
    || page.values.length > 0
  )
}

function Hero({ title, githubUrl }: { title: string, githubUrl: string }) {
  const { t } = useT()

  return (
    <Section className="flex-col pt-28 sm:pt-32 pb-0" id="about">
      <div className="mx-auto w-full max-w-3xl text-center">
        <h1 className="inline-flex items-center gap-4 border-b-4 border-primary pb-3 text-3xl font-black uppercase tracking-tight text-primary sm:text-4xl lg:text-5xl">
          <UserIcon size={36} className="inline-block" />
          {title || t('about.emptyTitle')}
        </h1>

        <div aria-hidden className="h-[var(--section-gap)]" />

        <div className="flex w-full flex-wrap items-center justify-center gap-3">
          <Button
            color="primary"
            href={githubUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="h-10 shrink-0 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-primary-fg no-underline transition-colors hover:bg-primary/90"
            startContent={<GithubIcon size={15} className="shrink-0" />}
          >
            {
              /* Sunucu bileşeni değil ama etiketler site geneliyle aynı
                 kaynaktan gelsin diye t() kullanılıyor. */
            }
            {t('nav.github')}
          </Button>
          <Button
            color="primary"
            href="/contact/"
            className="h-10 shrink-0 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-primary-fg no-underline transition-colors hover:bg-primary/90"
            endContent={<ChevronRightIcon size={15} className="shrink-0" />}
          >
            {t('hero.feedback')}
          </Button>
        </div>
      </div>
    </Section>
  )
}

function Content({
  aboutPage,
  githubUrl,
}: {
  aboutPage: AboutPage
  githubUrl: string
}) {
  const { locale } = useLocale()
  const { t } = useT()
  const intro = paragraphs(pickLocalized(aboutPage.intro, locale))
  const closing = paragraphs(pickLocalized(aboutPage.closing, locale))

  return (
    <>
      {intro.length > 0 ? (
        <Section className="flex-col pb-12 sm:pb-16" framed>
          <div className="mx-auto w-full max-w-3xl">
            <div className="rounded-2xl border border-surface-border bg-background p-6 sm:p-8">
              <div className="space-y-4 text-sm leading-relaxed text-foreground/75 sm:text-base">
                {intro.map(p => (
                  <p key={p}>{p}</p>
                ))}
              </div>
            </div>
          </div>
        </Section>
      ) : null}

      <ItemGrid
        title={t('about.areasTitle')}
        items={aboutPage.areas}
        locale={locale}
      />

      {aboutPage.journey.length > 0 ? (
        <Section className="flex-col pb-12 sm:pb-16" framed>
          <div className="mx-auto w-full max-w-3xl">
            <h2 className="mb-8 text-center text-2xl font-bold text-foreground sm:text-3xl">
              {t('about.journeyTitle')}
            </h2>
            <ol className="relative space-y-8 border-l-2 border-foreground-200/10 pl-6 sm:pl-8">
              {aboutPage.journey.map(item => (
                <li key={item.key} className="relative">
                  <span className="absolute -left-[34px] top-0 flex h-7 w-7 items-center justify-center rounded-full border-2 border-foreground-200/15 bg-background text-primary sm:-left-[42px]">
                    <SchoolIcon size={14} />
                  </span>
                  {/* Dönem yalnızca DOLUYSA gösterilir — uydurma yıl yok. */}
                  {item.period.trim()
                    ? (
                        <p className="text-xs font-bold uppercase tracking-wider text-primary">
                          {item.period}
                        </p>
                      )
                    : null}
                  <h3 className="mt-1 text-lg font-semibold text-foreground">
                    {pickLocalized(item.title, locale)}
                  </h3>
                  <p className="mt-1 text-sm leading-relaxed text-foreground/65">
                    {pickLocalized(item.description, locale)}
                  </p>
                </li>
              ))}
            </ol>
          </div>
        </Section>
      ) : null}

      <ItemGrid
        title={t('about.valuesTitle')}
        items={aboutPage.values}
        locale={locale}
      />

      <Section className="flex-col pb-24 sm:pb-32" framed>
        <div className="mx-auto w-full max-w-2xl text-center">
          {closing.map(p => (
            <p key={p} className="mt-3 text-sm text-foreground/60 sm:text-base">
              {p}
            </p>
          ))}
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <Button
              color="primary"
              href={githubUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="h-10 shrink-0 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-primary-fg no-underline transition-colors hover:bg-primary/90"
              startContent={<GithubIcon size={15} className="shrink-0" />}
            >
              {t('nav.github')}
            </Button>
            <Button
              color="primary"
              href="/contact/"
              className="h-10 shrink-0 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-primary-fg no-underline transition-colors hover:bg-primary/90"
              endContent={<ChevronRightIcon size={15} className="shrink-0" />}
            >
              {t('hero.feedback')}
            </Button>
          </div>
        </div>
      </Section>
    </>
  )
}

/** Kart ızgarası — çalışma alanları ve değerler aynı düzeni paylaşır. */
function ItemGrid({
  title,
  items,
  locale,
}: {
  title: string
  items: AboutPage['areas']
  locale: ReturnType<typeof useLocale>['locale']
}) {
  if (items.length === 0)
    return null

  return (
    <Section className="flex-col pb-12 sm:pb-16" framed>
      <div className="mx-auto w-full max-w-5xl">
        <h2 className="mb-6 text-center text-2xl font-bold text-foreground sm:text-3xl">
          {title}
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {items.map(item => (
            <div
              key={item.key}
              className="rounded-2xl border border-surface-border bg-background p-5 transition-colors duration-300 hover:border-primary/30"
            >
              <h3 className="mb-2 text-base font-semibold text-foreground">
                {pickLocalized(item.title, locale)}
              </h3>
              <p className="text-sm text-foreground/60">
                {pickLocalized(item.description, locale)}
              </p>
            </div>
          ))}
        </div>
      </div>
    </Section>
  )
}

/**
 * Boş / hata durumu kartı.
 *
 * İkisi AYRI metin gösterir: "veri yok" ile "veriye ulaşılamadı" aynı şey
 * değildir; hatayı boş sonuç sanmak sessiz veri kaybına yol açar. İçerik
 * yokken uydurma biyografi basılmaz — yalnızca bu kart görünür.
 */
function StateCard({
  title,
  description,
  retry,
}: {
  title: string
  description: string
  /** Okuma hatasında "Tekrar Dene" gösterilir. */
  retry?: boolean
}) {
  const { t } = useT()
  const router = useRouter()

  const yenile = useCallback(() => {
    router.refresh()
  }, [router])

  return (
    <Section className="flex-col pt-28 sm:pt-32 pb-24 sm:pb-32">
      <div className="mx-auto w-full max-w-2xl">
        <div
          className={`flex flex-col items-center gap-3 rounded-2xl border p-8 text-center ${
            retry
              ? 'border-danger/25 bg-danger/5'
              : 'border-surface-border bg-background'
          }`}
        >
          {retry
            ? <ErrorIcon size={22} className="text-danger" />
            : <ClockIcon size={22} className="text-primary" />}
          <h1 className="text-lg font-semibold text-foreground sm:text-xl">
            {title}
          </h1>
          <p className="text-sm text-foreground/60">{description}</p>
          {retry
            ? (
                <Button
                  color="primary"
                  size="sm"
                  className="mt-1"
                  onPress={yenile}
                >
                  {t('about.retry')}
                </Button>
              )
            : null}
        </div>
      </div>
    </Section>
  )
}
