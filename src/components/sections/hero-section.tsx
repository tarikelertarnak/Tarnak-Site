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
import { BriefcaseIcon, ChatIcon, FileIcon, SendIcon, UserPlusIcon } from '@/components/ui/icons'
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
      HERO YERLEŞİMİ (2026-10-06, kullanıcı — tamamen yeniden düzenlendi).

      ÖNCE: md:grid-cols-[1.15fr_0.85fr] — metin solda, kuş logosu SAĞDA
      ve hidden … md:flex ile MASAÜSTÜ DİŞINDA gizleniyordu. Küçük
      ekranda logo hiç yoktu. Fare ikonu logonun altında, logo kolonunun
      içindeydi.

      ARTI: TEK SÜTUN, her ekran boyutunda aynı sıra:
          1) Kuş logosu (üstte, yatay ortalı, HİÇ gizlenmez)
          2) Başlık "TARIK ELER - TARNAK"
          3) Alt yazı (typing animasyonu aynen)
          4) Butonlar (sığmazsa sarmalanır, ortalanır)
          5) Fare (scroll) ikonu — içerik grubunun PARÇASI DEĞİL, hero'nun
             en altında mt-auto ile; alçak ekranda içerik uzayınca fare
             ikonu aşağı İTİLİR (üst üste binmez).

      Dikey konum: justify-center KALDIRILDI → içerik üste yakın. Navbar
      ile logo arası clamp(24px, 6vh, 72px).
  */
  return (
    <Section className="min-h-[100svh] flex-col overflow-hidden pt-[clamp(24px,6vh,72px)] pb-24">
      {/* Background decorations */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-grid bg-radial-fade" />
        {/* glow removed — no transparency */}
      </div>

      <div className="relative z-10 mx-auto flex w-full max-w-6xl flex-col items-center text-center">
        {/* LEFT — text */}
        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="flex w-full flex-col items-center text-center"
        >
          {/*
            KUŞ LOGOSU (2026-10-06, kullanıcı: "başlığın hemen üstünde,
            yatayda ortalı, hiçbir ekran boyutunda gizlenmesin").
            Önce `md:flex` kolonunda ve `hidden` idi → mobil/tablet tamamen
            yoktu. Artık akışın İLK çocuğu, her boyutta görünür.

            Boyut yüksekliğe bağlı: `clamp(56px, 11vh, 130px)` — 360x640'te
            70px, 1920x1080'de 118px. `width:auto` oranı korur, taşmaz.

            HOVER: logoya gelince MAVİ olur (butonlarla AYNI `--tprimary`).
            Sadece renk — glow/gölge/ölçek YOK. Dokunmatikte takılı kalmasın
            diye `@media (hover:hover)` içinde.
          */}
          <motion.a
            href={`${SITE_URL}/`}
            aria-label={content.profile.firstName + ' ' + content.profile.lastName}
            variants={item}
            className="group/logo mb-[clamp(12px,2vh,24px)] inline-flex shrink-0 items-center justify-center"
          >
            <SiteLogo
              size={224}
              className={cn(
                'h-[clamp(56px,11vh,130px)] w-auto opacity-90 transition-colors duration-300',
                // Mavi hover — Tailwind `text-primary` butonlarla aynı token.
                'group-hover/logo:text-primary',
                'group-focus-visible/logo:text-primary',
              )}
            />
          </motion.a>

          {/*
            Name + TARNAK: aynı tipografi (font-black / uppercase /
            tracking-tighter / text-primary), artık iki satır: "TARIK ELER -"
            / "TARNAK". absolute konumlandırma ve üzerine gelince çapraz
            (italic + yukarı kayma) efekti kaldırıldı — marka sabit durur,
            tıklanınca temiz site köküne gider.
          */}
          <motion.div variants={item} className="w-full">
            <h1
              className={[
                'font-black uppercase leading-[0.95] tracking-tighter text-primary select-none',
                'text-5xl sm:text-7xl md:text-7xl lg:text-8xl',
              ].join(' ')}
            >
<span className="block pl-1">
                {name}
                {' - '}
              </span>
              {/*
                TAKMA AD (2026-10-06, kullanıcı).
                Önce burada SABIT "TARNAK" yaziyordu; `hero.name` de
                "TARIK ELER TARNAK" oldugu icin ekranda
                "TARIK ELER TARNAK - TARNAK" cikiyordu.
                Artik `hero.name` = "TARIK ELER" (tek kaynak) ve takma ad
                `profile.nickname`'ten geliyor: "TARIK ELER - TARNAK".
                Boylece admin panelden takma ad degisince burasi da degisir.
              */}
              <a
                href={`${SITE_URL}/`}
                className="block pl-1 no-underline"
              >
                {content.profile.nickname.toUpperCase()}
              </a>
            </h1>
          </motion.div>

          {/* Typewriter */}
          <motion.div variants={item} className="mt-6 sm:mt-7 text-foreground-600">
            <TypewriterEffect
              sentences={[tagline]}
              className="text-lg sm:text-xl md:text-2xl font-semibold"
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
              className="mt-3 max-w-xl text-sm sm:text-base text-foreground/500 leading-relaxed"
            >
              {description}
            </motion.p>
          )}

          {/*
            Ana gezinme: altı düğme de aynı stili alır — `color="primary"` +
            Blog bölümündeki "Tüm Yazıları Gör" butonunun className'i
            (h-10 sabit yükseklik, rounded-lg, font-medium, px-4).
            Çapa (#) yok: her düğme gerçek bir rotaya gider.
          */}
          <motion.div
            variants={item}
            className="mt-7 sm:mt-8 flex flex-wrap items-center gap-3"
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
            <CvPicker
              cvs={cvs}
              color="primary"
              className={HERO_BTN_BODY}
            />
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
      </div>

      {/*
        FARE (SCROLL) İKONU — içerik grubunun DIŞINDA, hero'nun en altında
        (2026-10-06, kullanıcı: "hero'nun en altında, yatayda ortalı").
        Önce logonun sağ kolonunun İÇİNDEydi (`self-center`, `mt-2`) ve
        küçük ekranda `hidden … md:flex` ile birlikte kayboluyordu.

        `mt-auto` → hero `min-h-[100svh]` olduğu için içerik gru
        bittikten sonra kalan boşluğu alır, ikon en alta yapışır. Alçak
        ekranda içerik uzayınca `flex` onu aşağı İTER, üst üste binmez.
      */}
      <motion.a
        href="/projects/"
        aria-label={t('hero.scrollDown')}
        variants={item}
        initial="hidden"
        animate="show"
        className="relative z-10 mt-auto inline-flex h-12 w-7 shrink-0 items-start justify-center self-center rounded-full border-2 border-primary/40 p-1.5"
      >
        <motion.span
          animate={{ y: [0, 10, 0], opacity: [1, 0.2, 1] }}
          transition={{
            duration: 1.6,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
          className="h-2 w-1 rounded-full bg-primary"
        />
      </motion.a>
    </Section>
  )
}
