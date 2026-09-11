'use client'

import type { SiteContent } from '@/lib/content'
import { useState } from 'react'
import { useT } from '@/components/locale-provider'
import { Button } from '@/components/ui/button'
import { Link } from '@/components/ui/link'
import { TankGame } from '@/components/tank-game'
import { socialIcon } from '@/components/ui/icons'

export function Footer({ content }: { content: SiteContent }) {
  const { t } = useT()
  const [gameOpen, setGameOpen] = useState(false)

  return (
    <footer className="mt-16 sm:mt-24 lg:mt-36 w-full pb-32 sm:pb-40">
      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 md:px-8">
        <div className="rounded-3xl border border-foreground-200/15 bg-background p-6 sm:p-10">
          <div className="flex flex-col gap-8 sm:flex-row sm:items-start sm:justify-between">
            {/* Left: brand */}
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2.5">
                <span className="text-lg font-bold text-primary">
                  {content.hero.name}
                </span>
                <span className="rounded-full border border-secondary/30 bg-secondary/10 px-2.5 py-0.5 text-[10px] font-bold text-secondary tracking-normal">
                  {content.profile.nickname}
                </span>
              </div>
              <p className="max-w-xs text-xs sm:text-sm text-foreground-500">
                {content.about.whoText}
              </p>
            </div>

            {/* Middle: quick links */}
            <nav className="flex flex-col gap-2">
              <p className="text-xs font-bold uppercase tracking-wider text-foreground-500">
                {t('footer.navigate')}
              </p>
              {content.nav.items.map((item) => (
                <Link
                  key={item.title}
                  href={item.href}
                  className="text-sm text-foreground-500 transition-colors duration-200 hover:text-primary"
                >
                  {item.title}
                </Link>
              ))}
            </nav>

            {/* Right: social */}
            <div className="flex flex-col gap-2">
              <p className="text-xs font-bold uppercase tracking-wider text-foreground-500">
                {t('footer.follow')}
              </p>
              <div className="flex flex-row flex-wrap gap-2">
                {content.social.map((item) => (
                  <a
                    key={item.name}
                    href={item.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={item.name}
                    title={item.name}
                    className="flex h-10 w-10 items-center justify-center rounded-xl border border-foreground-200/10 bg-background text-foreground-500 transition-all duration-300 hover:-translate-y-1 hover:border-primary/40 hover:bg-primary/10 hover:text-primary"
                  >
                    {socialIcon(item.icon, 20)}
                  </a>
                ))}
              </div>
            </div>
          </div>

          {/* Bottom row */}
          <div className="flex flex-col items-center justify-between gap-2 border-t border-foreground-200/10 py-5 sm:flex-row">
            <p className="text-xs sm:text-sm text-foreground-500 text-center sm:text-left">
              &copy; {content.footer.copyright} {new Date().getFullYear()} .{' '}
              {t('footer.rights')}
            </p>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setGameOpen(true)}
                className="inline-flex text-xs text-foreground-300/40 hover:text-foreground-300/80 transition-colors font-mono"
                title="?"
              >
                {'</>'}
              </button>
            </div>
          </div>
        </div>
      </div>
      {gameOpen && <TankGame />}
    </footer>
  )
}
