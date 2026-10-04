'use client'

import type { Variants } from 'motion/react'
import type { CvDoc } from '@/lib/cv'
import type { SiteContent } from '@/lib/content'
import { TypewriterEffect } from '@lobehub/ui/awesome'
import { motion } from 'motion/react'
import { useT } from '@/components/locale-provider'
import { Button } from '@/components/ui/button'
import { CvPicker } from '@/components/ui/cv-picker'
import { EyeIcon } from '@/components/ui/icons'
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
            Name + TARNAK: TARNAK artık TARIK ELER ile aynı tipografide
            (font-black / uppercase / tracking-tighter / text-primary), sağ üstte
            ve üst kenardan taşarak durur. Üzerine gelince italik, tıklanınca
            temiz site köküne gider.
          */}
          <motion.div variants={item} className="relative w-full">
            <h1
              className={[
                'font-black uppercase leading-[0.95] tracking-tighter text-primary select-none',
                'text-5xl sm:text-7xl md:text-7xl lg:text-8xl',
              ].join(' ')}
            >
              <span className="block pl-1">{name}</span>
            </h1>
            <a
              href={`${SITE_URL}/`}
              className="absolute -top-1 right-0 block font-black uppercase leading-none tracking-tighter text-primary no-underline transition-transform duration-300 hover:italic hover:-translate-y-0.5 text-3xl sm:text-5xl md:text-6xl lg:text-7xl"
            >
              TARNAK
            </a>
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

          {/* Ana gezinme: Projeler, İletişim, CV, Blog, Hakkımda, Sohbet. */}
          <motion.div
            variants={item}
            className="mt-7 sm:mt-8 flex flex-wrap items-center gap-3 sm:gap-4"
          >
            <Button
              color="primary"
              className="font-semibold text-sm sm:text-base px-6 py-3"
              href="#projects"
            >
              {t('hero.projects')}
            </Button>
            <Button
              variant="bordered"
              className="font-semibold text-sm sm:text-base px-6 py-3"
              href="#contact"
            >
              {t('hero.feedback')}
            </Button>
            <CvPicker
              cvs={cvs}
              variant="bordered"
              className="font-semibold text-sm sm:text-base px-6 py-3"
              startContent={<EyeIcon size={18} />}
            />
            <Button
              variant="bordered"
              className="font-semibold text-sm sm:text-base px-6 py-3"
              href="/blog/"
            >
              {t('nav.blog')}
            </Button>
            <Button
              variant="bordered"
              className="font-semibold text-sm sm:text-base px-6 py-3"
              href="#about"
            >
              {t('nav.about')}
            </Button>
            <Button
              variant="bordered"
              className="font-semibold text-sm sm:text-base px-6 py-3"
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
            href="#projects"
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
