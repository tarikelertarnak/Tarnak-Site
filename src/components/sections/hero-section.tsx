'use client'

import type { Variants } from 'motion/react'
import type { SiteContent } from '@/lib/content'
import type { CvDoc } from '@/lib/cv'
import { TypewriterEffect } from '@lobehub/ui/awesome'
import { motion } from 'motion/react'
import { useT } from '@/components/locale-provider'
import { Button } from '@/components/ui/button'
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

  return (
    <Section className="min-h-[100svh] flex-col justify-center overflow-hidden pt-20 pb-10">
      {/* Background decorations */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-grid bg-radial-fade" />
        {/* glow removed — no transparency */}
      </div>

      <div className="relative z-10 mx-auto grid w-full max-w-6xl grid-cols-1 items-center gap-8 md:grid-cols-[1.15fr_0.85fr] md:gap-8">
        {/* LEFT — text */}
        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="flex flex-col items-center text-center md:items-start md:text-left"
        >
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
                {' '}
                -
              </span>
              <a
                href={`${SITE_URL}/`}
                className="block pl-1 no-underline"
              >
                TARNAK
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
            (h-11 sabit yükseklik, rounded-lg, font-medium, px-4 py-2).
            Çapa (#) yok: her düğme gerçek bir rotaya gider.
          */}
          <motion.div
            variants={item}
            className="mt-7 sm:mt-8 flex flex-wrap items-center gap-3 sm:gap-4"
          >
            <Button
              color="primary"
              className="h-11 items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary/90"
startContent={<BriefcaseIcon size={16} />}
              href="/projects/"
            >
              {t('hero.projects')}
            </Button>
            <Button
              color="primary"
              className="h-11 items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary/90"
              startContent={<SendIcon size={16} />}
              href="/contact/"
            >
              {t('hero.feedback')}
            </Button>
            <CvPicker
              cvs={cvs}
              color="primary"
              className="h-11 items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary/90"
            />
            <Button
              color="primary"
              className="h-11 items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary/90"
              startContent={<FileIcon size={16} />}
              href="/blog/"
            >
              {t('nav.blog')}
            </Button>
            <Button
              color="primary"
              className="h-11 items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary/90"
              startContent={<UserPlusIcon size={16} />}
              href="/about/"
            >
              {t('nav.about')}
            </Button>
            <Button
              color="primary"
              className="h-11 items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary/90"
              startContent={<ChatIcon size={16} />}
              href="/chat/"
            >
              {t('nav.chat')}
            </Button>
          </motion.div>
        </motion.div>

        {/* RIGHT — TARNAK icon */}
        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="hidden flex-col items-center justify-center gap-4 md:flex"
        >
          <motion.div
            variants={item}
            className="flex items-center justify-center"
          >
            <img
              src="/tarnak-white.svg"
              alt="TARNAK — kuş logosu ve TARIK ELER imzası"
              width={220}
              height={220}
              className="hidden h-44 w-44 opacity-90 dark:block sm:h-56 sm:w-56"
            />
            <img
              src="/tarnak.svg"
              alt="TARNAK — kuş logosu ve TARIK ELER imzası"
              width={220}
              height={220}
              className="block h-44 w-44 opacity-90 dark:hidden sm:h-56 sm:w-56"
            />
          </motion.div>

          {/* Scroll-down indicator */}
          <motion.a
            href="/projects/"
            aria-label={t('hero.scrollDown')}
            variants={item}
            className="mt-2 inline-flex h-12 w-7 items-start justify-center self-center rounded-full border-2 border-primary/40 p-1.5"
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
        </motion.div>
      </div>
    </Section>
  )
}
