import React from 'react'
import { cn } from '@/components/ui/cn'

interface SectionProps {
  children: React.ReactNode
  className?: string
  id?: string
  /** Group content into a single rounded wrapping box (Blog/Projects style). */
  framed?: boolean
}

export const Section = React.forwardRef<HTMLDivElement, SectionProps>(
  ({ children, className, id, framed }: SectionProps, ref) => {
    return (
      <section
        ref={ref}
        className={cn(
          'relative flex w-full items-center justify-center px-4 sm:px-6 md:px-8 lg:px-12 xl:px-0',
          className,
        )}
      >
        <div id={id} className="absolute -top-20 sm:-top-24" />
{framed
          ? (
              // DIŞ GRUP (surface-1): `bg-surface-1` kartın (`bg-background` =
              // surface-2) İÇİNDE koyu temada koyu, açık temada gri. Once
              // ikisi de `bg-background` idi → konteyner ve kart birebir aynı
              // renkte, hover olmadan sıfır ayrışma (2026-10-05).
              <div className="w-full max-w-6xl rounded-3xl border border-surface-border bg-surface-1 p-4 sm:p-6 lg:p-10">
                {children}
              </div>
            )
          : (
              children
            )}
      </section>
    )
  },
)
Section.displayName = 'Section'

export function SectionTitle({
  title,
  subTitle,
  description,
  icon,
  big = false,
  headingLevel = 'h2',
}: {
  title: string
  subTitle: string
  description: string
  icon?: React.ReactNode
  /**
   * big: instead of a small gradient tag + large title, render the subtitle as one big blue
   * underlined title (tasarimcidayi style). The title is hidden.
   */
  big?: boolean
  /**
   * Baslik seviyesi. Varsayilan 'h2' — hicbir sayfada h1'i degistirmez.
   *
   * 2026-10-04 (SEO): /blog, /projects, /credits, /donate, /github sayfalari
   * sayfa basligini bu bilesen ile basiyordu ve bilesen hep <h2> uretiyordu;
   * sonuc olarak bu bes sayfada hic <h1> yoktu. Arama motorlari sayfanin
   * konusunu <h1>'den okur, o yuzden bu sayfalarda konu basligi <h1> olmali.
   * `headingLevel` verilmeden hicbir yerde davranis degismez.
   */
  headingLevel?: 'h1' | 'h2'
}) {
  // Dinamik etiket adi: JSX'te <Heading> yazilamaz, bu yuzden kucuk bir
  // degiskenle cozuluyor. `h2` default oldugu icin mevcut kullanim degismez.
  const Heading = headingLevel

  if (big) {
    return (
      <div className="flex flex-col items-center justify-center pb-8 sm:pb-10 lg:pb-12 text-center">
        <Heading className="inline-flex items-center gap-4 border-b-4 border-primary pb-3 text-3xl font-black uppercase tracking-tight text-primary sm:text-4xl lg:text-5xl">
          {icon}
          {subTitle}
        </Heading>
        {description && (
          <p className="mt-4 text-foreground-500 text-sm sm:text-base max-w-md lg:max-w-lg">{description}</p>
        )}
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center justify-center space-y-1.5 sm:space-y-2 pb-8 sm:pb-10 lg:pb-12 text-center">
      <p className="animate-gradient bg-gradient-to-r from-[#FBBF24] to-[#00C950] bg-size-300 bg-clip-text font-bold text-transparent text-xs sm:text-sm">
        {subTitle}
      </p>
      <Heading className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight">{title}</Heading>
      <p className="text-foreground-500 text-sm sm:text-base max-w-md lg:max-w-lg">{description}</p>
    </div>
  )
}
