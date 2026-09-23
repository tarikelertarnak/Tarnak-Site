'use client'

import type { SiteContent } from '@/lib/content'
import { useMemo } from 'react'
import { ContactQuickMenu } from '@/components/contact-quick-menu'
import { useT } from '@/components/locale-provider'
import { buildSiteNavigation } from '@/lib/site-navigation'
import { cn } from '@/components/ui/cn'
import { ArrowUpRightIcon } from '@/components/ui/icons'
import { Link } from '@/components/ui/link'

/**
 * Alt bilgi (footer).
 *
 * Tasarim notlari:
 *  - 12 kolonlu izgara: marka 4 / gezinme 8. Gezinme artik UC alt kolona
 *    yayilir: Sayfalar, Bolumler (ana sayfa anchor'lari), Hesap.
 *  - Eskiden ayri bir "Takip Et" sutunu vardi; sosyal kanallar artik
 *    `ContactQuickMenu` icinde oldugu icin TEKRARlanmiyor — o alan
 *    gezinmeye verildi (liste 4 baglantidan ~17'ye cikti).
 *  - Iletisim bilgileri marka blogundaki `ContactQuickMenu` menusunde.
 *  - Dekoratif isik/gradient AYRI bir katmanda ve `overflow-hidden` orada.
 *    Kartin kendisine `overflow-hidden` verilseydi acilir menu KIRPILIRDI.
 *  - Arka plan TAM SIYAH: onceki surumde `bg-primary/10 blur-3xl` mavi bir
 *    parlaklik veriyordu ve kart diger bolumlerden farkli duruyordu.
 *    Artik hicbir renk katmani yok, yalnizca notr bir ust cerceve.
 */
export function Footer({ content }: { content: SiteContent }) {
  const { t } = useT()

  // Muzik calari TAM GENISLIKTE bir cubuk olarak ekranin altina sabitlenir
  // (bkz. music-player.tsx: `fixed bottom-0 left-0 right-0`). Acikken footer'in
  // altinda bosluk birakmak ZORUNLU; kapaliyken ayni bosluk sayfayi ~160px
  // gereksiz uzatiyordu. Bu yuzden bosluk duruma gore veriliyor.
  const hasMusicPlayer = Boolean(content.settings?.musicSrc)
  const year = new Date().getFullYear()

  const groups = useMemo(
    () => buildSiteNavigation(t, content.nav.items),
    [t, content.nav.items],
  )

  return (
    <footer
      className={cn(
        'mt-16 sm:mt-24 lg:mt-36 w-full',
        hasMusicPlayer ? 'pb-32 sm:pb-40' : 'pb-10 sm:pb-14',
      )}
    >
      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 md:px-8">
        <div className="relative rounded-3xl border border-foreground-200/15 bg-background">
          {/* Notr ust cerceve — RENKLI gradient yok (kart tam siyah kalir) */}
          <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden rounded-3xl">
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-foreground-200/25 to-transparent" />
          </div>

          <div className="relative p-6 sm:p-10">
            <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 lg:gap-10">
              {/* Marka + iletisim */}
              <div className="flex flex-col gap-3 lg:col-span-4">
                <div className="flex flex-wrap items-center gap-2.5">
                  <span className="text-lg font-bold text-primary">
                    {content.hero.name}
                  </span>
                  <span className="rounded-full border border-secondary/30 bg-secondary/10 px-2.5 py-0.5 text-[10px] font-bold tracking-normal text-secondary">
                    {content.profile.nickname}
                  </span>
                </div>
                {/* Kisa slogan — footer'a uzun "hakkımda" paragrafı koymak
                    düzeni bozuyordu; tam metin Hakkımda bölümünde zaten var. */}
                <p className="max-w-sm text-xs leading-relaxed text-foreground-500 sm:text-sm">
                  {content.hero.tagline}
                </p>
                <div className="mt-1">
                  <ContactQuickMenu content={content} />
                </div>
              </div>

              {/* GEZINME — tum sayfalar, bolumler ve hesap baglantilari.
                  Uc alt kolon: dar ekranda tek, genis ekranda yan yana. */}
              <nav
                aria-label={t('footer.navigate')}
                className="flex flex-col gap-4 lg:col-span-8"
              >
                <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-foreground-500">
                  {t('footer.navigate')}
                </p>

                <div className="grid grid-cols-2 gap-x-6 gap-y-6 sm:grid-cols-3">
                  {groups.map(group => (
                    <div key={group.id} className="flex flex-col gap-2">
                      <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-foreground-500/70">
                        {group.title}
                      </p>
                      <ul className="flex flex-col gap-1">
                        {group.entries.map(entry => (
                          <li key={entry.id}>
                            <Link
                              href={entry.href}
                              className="group inline-flex items-center gap-1 text-sm text-foreground-500 no-underline transition-colors duration-200 hover:text-primary"
                            >
                              <span className="truncate">{entry.label}</span>
                              <ArrowUpRightIcon
                                size={12}
                                className="shrink-0 opacity-0 transition-all duration-200 group-hover:translate-x-0.5 group-hover:opacity-100"
                              />
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </nav>
            </div>

            {/* Alt satir. `-mx` + `px` ile ayirici kartin TAM genisliginde kalir;
                aksi halde kart dolgusunun icinde kisa bir cizgi gibi duruyordu. */}
            <div className="-mx-6 mt-8 flex flex-col items-center gap-3 border-t border-foreground-200/10 px-6 pt-5 sm:-mx-10 sm:flex-row sm:justify-between sm:px-10">
              <p className="text-center text-xs text-foreground-500 sm:text-left sm:text-sm">
                &copy;
                {' '}
                {year}
                {' '}
                {content.footer.copyright}
                {' '}
                &middot;
                {' '}
                {t('footer.rights')}
              </p>

              <button
                type="button"
                onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                className="cursor-pointer text-xs text-foreground-500 transition-colors hover:text-primary"
              >
                {t('footer.backToTop')}
              </button>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}
