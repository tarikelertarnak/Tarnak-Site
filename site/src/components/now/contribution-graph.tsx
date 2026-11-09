'use client'

import type { ContributionCalendar, ContributionDay, ContributionRepo } from '@/lib/github-contributions'
import { useMemo, useState } from 'react'
import { useT } from '@/components/locale-provider'
import { cn } from '@/components/ui/cn'
import {
  contributionLevel,
  formatActivityDate,
  formatHoverDate,
  maxDayCount,
  monthSegments,
} from '@/lib/github-contributions'

/** Hücre kenarı ve arası — ay etiketleri bu adımla hizalanır. */
const CELL = 11
const GAP = 3
const STEP = CELL + GAP
const ROWS = 7

/**
 * Seviye → arka plan sınıfı.
 *
 * Sınıf adları DİNAMİK ÜRETİLMEMELİ (Tailwind derlemede görmez). Bu yüzden
 * tam adlar burada sabit; `contributionLevel` yalnızca indeks verir.
 */
const LEVEL_CLASS = [
  'bg-foreground/10',
  'bg-primary/25',
  'bg-primary/45',
  'bg-primary/70',
  'bg-primary',
] as const

/**
 * GitHub katkı ısı haritası (2026-10-31).
 *
 * `/now` sayfası `force-static`; veri sunucuda `public/github-contributions.json`
 * dosyasından okunup prop olarak gelir. Bu bileşen yalnızca çizim + dil
 * çevirisi yapar — kendi verisini ÇEKMEZ, böylece ilk boyamada dolu gelir.
 *
 * ETKİLEŞİM (GitHub paritesi, kullanıcı isteği):
 *   · üzerine gelince özel ipucu → "10 contributions on June 5th"
 *   · tıklayınca ALTTA panel → "Contribution activity / June 5, 2026 /
 *     Created 10 commits in 1 repository / tarikelertarnak/Player · 10 commits"
 */
export function ContributionGraph({ calendar }: { calendar: ContributionCalendar }) {
  const { t, locale } = useT()

  const max = maxDayCount(calendar.weeks)
  const months = monthSegments(calendar.weeks, locale)
  const [hovered, setHovered] = useState<{ date: string, count: number, week: number, day: number } | null>(null)
  const [selected, setSelected] = useState<string | null>(null)

  /*
    Sütunlar 7 güne tamamlanır: eksik hafta olsa bile ızgara kaymaz
    (`grid-auto-flow: column` + 7 satır).
  */
  const columns = useMemo(
    () => calendar.weeks.map(week => (week.length === ROWS
      ? week
      : [...week, ...Array.from({ length: ROWS - week.length }, () => null)])),
    [calendar.weeks],
  )

  const selectedDay = selected
    ? calendar.weeks.flat().find(day => day.date === selected) ?? null
    : null

  return (
    <div className="flex w-full flex-col gap-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-base font-semibold">
          {t('now.contributionsTitle')}
        </h3>
        <p className="text-xs text-foreground-500">
          {t('now.contributionsTotal', { count: calendar.total })}
        </p>
      </div>

      <div className="overflow-x-auto pb-1">
        <div className="relative min-w-max">
          {/* Ay şeridi — her etiket kapladığı hafta sayısı kadar geniş. */}
          <div className="mb-1 flex" aria-hidden="true">
            {months.map((segment, i) => (
              <span
                key={`${segment.label}-${i}`}
                className="text-[10px] leading-none text-foreground-500"
                style={{ width: segment.span * STEP }}
              >
                {segment.label}
              </span>
            ))}
          </div>

          <div
            className="grid"
            style={{
              gridTemplateRows: `repeat(${ROWS}, ${CELL}px)`,
              gridAutoFlow: 'column',
              gap: GAP,
            }}
            role="img"
            aria-label={t('now.contributionsTitle')}
            onMouseLeave={() => setHovered(null)}
          >
            {columns.flatMap((days, weekIndex) =>
              days.map((day, dayIndex) => (
                <ContributionCell
                  key={`${weekIndex}-${dayIndex}`}
                  day={day}
                  max={max}
                  week={weekIndex}
                  row={dayIndex}
                  active={day?.date === selected}
                  onHover={setHovered}
                  onSelect={setSelected}
                />
              )),
            )}
          </div>

          {/* İpucu — hücrenin ÜSTÜNDE, ızgaraya göre konumlanır (layout okuması
              yok; konum hafta/satır indeksinden hesaplanır). */}
          {hovered && (
            <span
              data-testid="contribution-tooltip"
              className="pointer-events-none absolute z-20 -translate-x-1/2 whitespace-nowrap rounded-md bg-foreground px-2 py-1 text-[11px] font-medium text-background shadow-lg"
              style={{
                left: hovered.week * STEP + CELL / 2,
                top: hovered.day * STEP - 26,
              }}
            >
              {t(hovered.count === 1 ? 'now.contributionsOnOne' : 'now.contributionsOn', {
                count: hovered.count,
                date: formatHoverDate(hovered.date, locale),
              })}
            </span>
          )}
        </div>
      </div>

      {/* Efsane — GitHub düzeni: "Less [5 kutu] More" */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] text-foreground-500">
        <span>{t('now.contributionsHint')}</span>
        <span className="flex items-center gap-1.5">
          <span>{t('now.contributionsLess')}</span>
          {LEVEL_CLASS.map((cls, level) => (
            <span
              key={level}
              className={cn('rounded-[2px]', cls)}
              style={{ width: CELL, height: CELL }}
            />
          ))}
          <span>{t('now.contributionsMore')}</span>
        </span>
      </div>

      {selectedDay && (
        <ContributionActivity
          day={selectedDay}
          repos={calendar.activity[selectedDay.date] ?? []}
          locale={locale}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  )
}

function ContributionCell({
  day,
  max,
  week,
  row,
  active,
  onHover,
  onSelect,
}: {
  day: ContributionDay | null
  max: number
  week: number
  row: number
  active: boolean
  onHover: (value: { date: string, count: number, week: number, day: number } | null) => void
  onSelect: (date: string) => void
}) {
  if (!day) {
    return <span style={{ width: CELL, height: CELL }} aria-hidden="true" />
  }

  const level = contributionLevel(day.count, max)

  return (
    <span
      role="button"
      tabIndex={0}
      aria-label={`${day.date}: ${day.count}`}
      onClick={() => onSelect(day.date)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onSelect(day.date)
        }
      }}
      onMouseEnter={() => onHover({ date: day.date, count: day.count, week, day: row })}
      onMouseLeave={() => onHover(null)}
      onFocus={() => onHover({ date: day.date, count: day.count, week, day: row })}
      onBlur={() => onHover(null)}
      className={cn(
        'cursor-pointer rounded-[2px] outline-none focus-visible:ring-1 focus-visible:ring-primary',
        LEVEL_CLASS[level],
        active && 'ring-1 ring-foreground',
      )}
      style={{ width: CELL, height: CELL }}
    />
  )
}

/**
 * Tıklanan günün detayı — GitHub'ın "Contribution activity" paneli.
 *
 * Depo kırılımı yoksa (o gün yalnızca issue/PR katkısı varsa) SAYI gösterilir,
 * depo listesi çizilmez: uydurma depo adı yazılmaz.
 */
function ContributionActivity({
  day,
  repos,
  locale,
  onClose,
}: {
  day: ContributionDay
  repos: ContributionRepo[]
  locale: string
  onClose: () => void
}) {
  const { t } = useT()
  const commits = repos.reduce((sum, repo) => sum + repo.count, 0)

  return (
    <div
      data-testid="contribution-activity"
      className="mt-1 rounded-xl border border-foreground/10 bg-foreground/[0.03] p-4"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold">{t('now.activityTitle')}</p>
          <p className="mt-0.5 text-xs text-foreground-500">
            {formatActivityDate(day.date, locale)}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label={t('now.activityClose')}
          title={t('now.activityClose')}
          className="shrink-0 cursor-pointer rounded-full px-2 py-1 text-foreground-500 hover:bg-foreground/10 hover:text-foreground"
        >
          ✕
        </button>
      </div>

      {repos.length > 0
        ? (
            <>
              <p className="mt-3 text-sm">
                {repos.length === 1
                  ? (commits === 1
                      ? t('now.activityCommitsSingle')
                      : t('now.activityCommitsOne', { count: commits }))
                  : t('now.activityCommitsMany', { count: commits, repos: repos.length })}
              </p>
              <ul className="mt-3 flex flex-col gap-1.5">
                {repos.map(repo => (
                  <li key={repo.repo}>
                    <a
                      href={repo.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-between gap-3 rounded-lg px-2 py-1.5 text-sm text-foreground-500 no-underline transition-colors duration-200 hover:bg-foreground/5 hover:text-foreground"
                    >
                      <span className="truncate font-medium">{repo.repo}</span>
                      <span className="shrink-0 text-xs tabular-nums">
                        {repo.count === 1
                          ? t('now.activityCommitCountOne', { count: repo.count })
                          : t('now.activityCommitCount', { count: repo.count })}
                      </span>
                    </a>
                  </li>
                ))}
              </ul>
            </>
          )
        : (
            <p className="mt-3 text-sm text-foreground-500">
              {day.count > 0
                ? t('now.activityNoBreakdown', { count: day.count })
                : t('now.activityEmpty')}
            </p>
          )}
    </div>
  )
}
