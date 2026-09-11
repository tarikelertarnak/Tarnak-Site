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
        {framed ? (
          <div className="w-full max-w-6xl rounded-3xl border border-foreground-200/10 bg-background p-4 sm:p-6 lg:p-10">
            {children}
          </div>
        ) : (
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
}) {
  if (big) {
    return (
      <div className="flex flex-col items-center justify-center pb-8 sm:pb-10 lg:pb-12 text-center">
        <h2 className="inline-flex items-center gap-4 border-b-4 border-primary pb-3 text-3xl font-black uppercase tracking-tight text-primary sm:text-4xl lg:text-5xl">
          {icon}
          {subTitle}
        </h2>
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
      <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight">{title}</h2>
      <p className="text-foreground-500 text-sm sm:text-base max-w-md lg:max-w-lg">{description}</p>
    </div>
  )
}
