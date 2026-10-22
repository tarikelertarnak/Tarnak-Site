'use client'

import type { Variants } from 'motion/react'
import type { SiteContent } from '@/lib/content'
import type { CvDoc } from '@/lib/cv'
import { TypewriterEffect } from '@lobehub/ui/awesome'
import { motion } from 'motion/react'
import { useHeroText } from '@/components/hero-i18n'
import { useT } from '@/components/locale-provider'
import { SiteLogo } from '@/components/logo'
import { AvailabilityBadge } from '@/components/phase6-sections'
import { Button } from '@/components/ui/button'
import { cn } from '@/components/ui/cn'
import { CvPicker } from '@/components/ui/cv-picker'
import { HERO_BTN_BODY } from '@/components/ui/hero-button-style'
import {
  BriefcaseIcon,
  ChatIcon,
  FileIcon,
  SendIcon,
  UserPlusIcon,
} from '@/components/ui/icons'
import { Section } from '@/components/ui/section'
import { Tilt3D } from '@/components/ui/tilt-3d'
import { heroScrollTop } from '@/lib/hero-scroll'
import { parsePhase6 } from '@/lib/phase6'
import { scrollToY } from '@/lib/scroll'
import { SITE_URL } from '@/lib/site-url'

const container: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.1 },
  },
}

const item: Variants = {
  hidden: { opacity: 0, y: 20 },
  show: {
    opacity: 1,
    y: 0,
    transition: { type: 'spring', stiffness: 240, damping: 22 },
  },
}

export function HeroSection({
  content,
  cvs,
}: {
  content: SiteContent
  cvs: CvDoc[]
}) {
  const { name, description } = content.hero
  // Dile göre çözülen alanlar (2026-10-20): admin panelden girilen dile özel
  // metin sunucu tabanını EZER. Bkz. `hero-i18n.ts`.
  const heroText = useHeroText()
  const tagline = heroText(content.hero.i18n, 'tagline', content.hero.tagline)
  // Logo kaynağı: admin dosya/link verdiyse o, yoksa gömülü marka SVG'si.
  const logoSrc = content.hero.logo?.trim()
  // Müsaitlik rozeti (içerik boşsa render edilmez)
  const phase6 = parsePhase6(
    (content as unknown as Record<string, unknown>).phase6,
  )
  const { t } = useT()

  /*
      HERO YERLEŞİMİ (2026-10-07, kullanıcı düzeltmeleriyle güncellendi).

      1) DİKEY KONUM: içerik artık ÜSTTE YAPIŞIK değil, hero içinde
         DİKEYDE ORTALI (`flex-1 justify-center`). Önce `pt-[clamp(24px,6vh,72px)]`
         + `justify-center` yoktu → blok navbar altına yapışıyordu
         ("çok üstte olmuş o kısım ortala sayfaya").

      2) LOGO: başlığın hemen üstünde, DİHA BÜYÜK
         (`clamp(72px,14vh,168px)` — eskisi `clamp(56px,11vh,130px)` idi ve
         kullanıcı "çok küçük" dedi). Hâlâ her ekran boyutunda görünür,
         asla `hidden` olmaz.

      3) BÖLÜM DÜĞMELERİ: altı düğme (2026-10-12 kullanıcı sırası:
         Hakkımda / Projeler / Blog / İletişim / Sohbet / CV) `flex-wrap` —
         dar ekranda alt satıra kayar, hiçbiri
         görünmez olmaz. Sol/sağ ok YOK (oklar admin panelindeki sekme
         şeridinde; 2026-10-07 kullanıcı düzeltmesi).

      4) FARE (SCROLL) İKONU: bölüm düğmelerinin ALTINDA (kullanıcı:
         "konumu ... bölümler var ya onun altında olacak"), biraz daha BÜYÜK
         (`h-14 w-8`, eskisi `h-12 w-7`). Tıklanınca `/projects/` yerine
         `id="about"` bölümüne kaydırır (kullanıcı: "basınca projects'e
         gitmesin, hakkımda kısmına kaydırmaya yarasın").
  */
  return (
    <Section className="min-h-[100svh] flex-col overflow-hidden pt-16 pb-10 sm:pt-20">
      {/* Background decorations */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-grid bg-radial-fade" />
        {/* glow removed — no transparency */}
      </div>

      <div className="relative z-10 mx-auto flex w-full max-w-6xl flex-1 flex-col items-center justify-center text-center">
        {/* LEFT — text */}
        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="flex w-full flex-col items-center text-center"
        >
          {/*
            KUŞ LOGOSU — başlığın hemen üstünde, yatayda ortalı, her ekran
            boyutunda görünür. `width:auto` oranı korur, yatay taşma olmaz.

            HOVER: logoya gelince MAVİ olur (butonlarla AYNI `--tprimary`).
            Sadece renk — glow/gölge/ölçek YOK.
          */}
          {/*
          Müsaitlik rozeti — logonun ÜSTÜNDE, ayrı bir öğe.
          İçerik boşsa (`enabled: false` veya etiket yoksa) render edilmez.
          Logo `<a>`'sının İÇİNE konulmadı: rozet kendi bağlantısını
          taşımalı (iletişime gidiyor), logo bağlantısının parçası olursa
          tıklayınca ana sayfaya gider ve ekran okuyucu adı da bozulur.
        */}
          <motion.div variants={item} className="mb-4 flex justify-center">
            <AvailabilityBadge data={phase6?.availability} />
          </motion.div>
<Tilt3D intensity={6}>
          <motion.a
            href={`${SITE_URL}/`}
            aria-label={`${content.profile.firstName} ${content.profile.lastName}`}
            variants={item}
            className="group/logo mb-[clamp(10px,1.8vh,20px)] inline-flex shrink-0 items-center justify-center"
          >
            {logoSrc
              ? (
                  // Admin panelden dosya/link verildiyse onu bas (2026-10-20,
                  // kullanıcı isteği: "Emoji/Logo" alanı gerçek logo kaynağı).
                  // Kullanıcı URL'si olduğu için next/image değil `<img>`.
                  <img
                    src={logoSrc}
                    alt={content.profile.firstName}
                    className={cn(
                      'h-[clamp(72px,18vh,200px)] w-auto object-contain opacity-90',
                      'transition-opacity duration-300 group-hover/logo:opacity-100',
                    )}
                  />
                )
              : (
                  <SiteLogo
                    size={224}
                    className={cn(
                      // 2026-10-07: kullanıcı "çok küçük" dedi. 900px yükseklikte
                      // 126px → 162px ölçülüyor; 360×640'de 72px (taşmaz).
                      'h-[clamp(72px,18vh,200px)] w-auto opacity-90 transition-colors duration-300',
                      // Mavi hover — Tailwind `text-primary` butonlarla aynı token.
                      'group-hover/logo:text-primary',
                      'group-focus-visible/logo:text-primary',
                    )}
                  />
                )}
          </motion.a>
        </Tilt3D>

          {/*
            Name + TARNAK: aynı tipografi (font-black / uppercase /
            tracking-tighter / text-primary), iki satır:
            "TARIK ELER -" / "TARNAK".

            ⚠️ `select-none` KALDIRILDI (2026-10-07, kullanıcı: "yazısını
            kendim yazdım seçilmedi"). Kullanıcı başlığı seçip
            kopyalamak istiyor — `select-none` bunu imkânsız kılıyordu.
          */}
          <motion.div variants={item} className="w-full">
            <h1
              className={[
                'font-black uppercase leading-[0.95] tracking-tighter text-primary',
                'text-5xl sm:text-7xl md:text-7xl lg:text-8xl',
              ].join(' ')}
            >
              <span className="block">
                {name}
                {' - '}
              </span>
              {/*
                TAKMA AD: `hero.name` = "TARIK ELER" (tek kaynak), takma ad
                `profile.nickname`'ten geliyor: "TARIK ELER - TARNAK".
                Admin panelden takma ad değişince burası da değişir.
              */}
              <a href={`${SITE_URL}/`} className="block no-underline">
                {content.profile.nickname.toUpperCase()}
              </a>
            </h1>
          </motion.div>

          {/* Typewriter */}
          <motion.div
            variants={item}
            className="mt-6 text-foreground-600 sm:mt-7"
          >
            <TypewriterEffect
              sentences={[tagline]}
              className="text-lg font-semibold sm:text-xl md:text-2xl"
              color="currentColor"
              cursorColor="var(--tprimary)"
              typingSpeed={60}
              deletingSpeed={30}
              pauseDuration={3000}
            />
          </motion.div>

          {/*
            Description: sabit metin kaldırıldı. İçerik boşsa alan gizlenir,
            admin `hero.description` alanına yazınca kendiliğinden geri gelir.
          */}
          {description.trim() && (
            <motion.p
              variants={item}
              className="mt-3 max-w-xl text-sm leading-relaxed text-foreground/500 sm:text-base"
            >
              {description}
            </motion.p>
          )}

          {/*
            BÖLÜM DÜĞMELERİ (2026-10-07 düzeltme, kullanıcı: "yanlış yere
            sola ve sağa ok eklemişsin, ana sayfaya eklemişsin, onu kaldır.

            Sol/sağ ok KALDIRILDI. Okların asıl yeri admin panelindeki sekme
            şeridi (Genel Bakış / Profil / Hakkımda / Sosyal Medya / Projeler…)
            — orada çok sekme var ve liste taşıyor. Ana sayfada altı düğme var;
            sarmalansınlar da olur, taşma olmaz. `flex-wrap` geri geldi.
          */}
          <motion.div
            variants={item}
            className="mt-7 flex w-full flex-wrap items-center justify-center gap-3 sm:mt-8"
          >
            {/*
              SIRA (2026-10-12 kullanıcı): Hakkımda, Projeler, Blog,
              İletişim, Sohbet, CV — `hero-section.order.test.ts` bunu
              kaynak sözleşmesi olarak doğrular.
            */}
            <Button
              color="primary"
              className={HERO_BTN_BODY}
              startContent={<UserPlusIcon size={16} />}
              href="/about/"
            >
              {t('nav.about')}
            </Button>
            <Button
              color="primary"
              className={HERO_BTN_BODY}
              startContent={<BriefcaseIcon size={16} />}
              href="/projects/"
            >
              {heroText(content.hero.i18n, 'exploreLabel', t('hero.projects'))}
            </Button>
            <Button
              color="primary"
              className={HERO_BTN_BODY}
              startContent={<FileIcon size={16} />}
              href="/blog/"
            >
              {t('nav.blog')}
            </Button>
            <Button
              color="primary"
              className={HERO_BTN_BODY}
              startContent={<SendIcon size={16} />}
              href="/contact/"
            >
              {heroText(content.hero.i18n, 'connectLabel', t('hero.feedback'))}
            </Button>
            <Button
              color="primary"
              className={HERO_BTN_BODY}
              startContent={<ChatIcon size={16} />}
              href="/chat/"
            >
              {t('nav.chat')}
            </Button>
            <CvPicker cvs={cvs} color="primary" className={HERO_BTN_BODY} />
          </motion.div>
        </motion.div>

        {/*
          FARE (SCROLL) İKONU — bölüm şeridinin ALTINDA, ortada.

          Çapa bağlantısı DEĞİL, `<button>`: projede `no-hash-links`
          testi gezinme linklerinde çapa yasaklıyor (2026-10-04 kullanıcı
          kararı — çapalar Search Console'da bozuk doğrulamaya yol açmıştı).
          URL değişmez, geçmişe çapa girdi yazılmaz.

          Tıklayınca `id="about"` bölümüne kaydırır (kullanıcı: "basınca
          projects'e gitmesin, hakkımda kısmına kaydırmaya yarasın").

          2026-10-12 (kullanıcı: "çok az gidiyo, üstte siyah boş kısım
          oluyo, daha fazla kaydırmalı"): `scrollIntoView` YERİNE
          `heroScrollTop` hesabı — çapa div'inin `-top-20` konumu +
          `scroll-margin-top:88px` + `overflow-x:hidden` üçlüsü kısa/yüksek
          kaydırıyordu (bkz. src/lib/hero-scroll.ts). Artık About başlığı
          sabit üst çubuğun hemen altına getirilir.
        */}
        <motion.button
          type="button"
          aria-label={t('hero.scrollDown')}
          onClick={() => {
            const section = document.getElementById('about')?.closest('section')
            if (!section)
              return
            // Kaydırma tek yardımcıdan geçer: yumuşaklık + hareket tercihi
            // (`lib/scroll`), konum hero-scroll hesabından.
            scrollToY(heroScrollTop(section))
          }}
          variants={item}
          initial="hidden"
          animate="show"
          className="relative z-10 mt-8 inline-flex h-14 w-8 shrink-0 cursor-pointer items-start justify-center self-center rounded-full border-2 border-primary/40 p-1.5"
        >
          <motion.span
            animate={{ y: [0, 14, 0], opacity: [1, 0.2, 1] }}
            transition={{
              duration: 1.6,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
            className="h-2.5 w-1 rounded-full bg-primary"
          />
        </motion.button>
      </div>
    </Section>
  )
}
