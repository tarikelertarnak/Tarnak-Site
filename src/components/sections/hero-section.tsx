'use client'

import type { Variants } from 'motion/react'
import type { SiteContent } from '@/lib/content'
import type { CvDoc } from '@/lib/cv'
import { TypewriterEffect } from '@lobehub/ui/awesome'
import { motion } from 'motion/react'
import { useT } from '@/components/locale-provider'
import { SiteLogo } from '@/components/logo'
import { Button } from '@/components/ui/button'
import { HERO_BTN_BODY } from '@/components/ui/hero-button-style'
import { cn } from '@/components/ui/cn'
import { CvPicker } from '@/components/ui/cv-picker'
import {
  BriefcaseIcon,
  ChatIcon,
  FileIcon,
  SendIcon,
  UserPlusIcon,
} from '@/components/ui/icons'
import { Section } from '@/components/ui/section'
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

export function HeroSection({ content, cvs }: { content: SiteContent, cvs: CvDoc[] }) {
  const { name, tagline, description } = content.hero
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

      3) BÖLÜM DÜĞMELERİ: altı düğme (Projeler / İletişim / CV / Blog /
         Hakkımda / Sohbet) `flex-wrap` — dar ekranda alt satıra kayar, hiçbiri
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
          <motion.a
            href={`${SITE_URL}/`}
            aria-label={content.profile.firstName + ' ' + content.profile.lastName}
            variants={item}
            className="group/logo mb-[clamp(10px,1.8vh,20px)] inline-flex shrink-0 items-center justify-center"
          >
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
          </motion.a>

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
          <motion.div variants={item} className="mt-6 text-foreground-600 sm:mt-7">
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
            <Button
              color="primary"
              className={HERO_BTN_BODY}
              startContent={<BriefcaseIcon size={16} />}
              href="/projects/"
            >
              {t('hero.projects')}
            </Button>
            <Button
              color="primary"
              className={HERO_BTN_BODY}
              startContent={<SendIcon size={16} />}
              href="/contact/"
            >
              {t('hero.feedback')}
            </Button>
            <CvPicker cvs={cvs} color="primary" className={HERO_BTN_BODY} />
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
              startContent={<UserPlusIcon size={16} />}
              href="/about/"
            >
              {t('nav.about')}
            </Button>
            <Button
              color="primary"
              className={HERO_BTN_BODY}
              startContent={<ChatIcon size={16} />}
              href="/chat/"
            >
              {t('nav.chat')}
            </Button>
          </motion.div>
        </motion.div>

        {/*
          FARE (SCROLL) İKONU — bölüm şeridinin ALTINDA, ortada.

          Çapa bağlantısı DEĞİL, `<button>`: projede `no-hash-links`
          testi gezinme linklerinde çapa yasaklıyor (2026-10-04 kullanıcı
          kararı — çapalar Search Console'da bozuk doğrulamaya yol açmıştı).
          Aynı işi `scrollIntoView` ile yapıyoruz: URL değişmez, geçmişe
          çapa girdi yazılmaz.

          Tıklayınca `id="about"` bölümüne kaydırır (kullanıcı: "basınca
          projects'e gitmesin, hakkımda kısmına kaydırmaya yarasın").
          `prefers-reduced-motion` açıksa düz kaydırma yapılır.
        */}
        <motion.button
          type="button"
          aria-label={t('hero.scrollDown')}
          onClick={() => {
            const target = document.getElementById('about')
            if (!target) return
            target.scrollIntoView({
              behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches
                ? 'auto'
                : 'smooth',
              block: 'start',
            })
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