import { Icon } from '@iconify/react'

export default function GithubLoading() {
  return (
    <div className="flex w-full max-w-6xl flex-col items-center gap-6 px-4 sm:px-6 pt-28 sm:pt-32 animate-pulse bg-foreground/8">
      <div className="flex w-full flex-col items-center gap-3 text-center pb-6 animate-pulse bg-foreground/8">
        <span className="h-4 w-24 rounded-full animate-pulse bg-foreground/8" />
        <span className="h-8 w-48 rounded-lg animate-pulse bg-foreground/8" />
        <span className="h-3 w-64 max-w-full rounded-md animate-pulse bg-foreground/8" />
      </div>
      <div className="flex w-full flex-row items-center gap-4 rounded-2xl bg-background p-4 sm:p-6 animate-pulse bg-foreground/8">
        <span className="h-[72px] w-[72px] shrink-0 rounded-2xl animate-pulse bg-foreground/8" />
        <div className="flex w-full flex-col gap-2 animate-pulse bg-foreground/8">
          <span className="h-6 w-1/3 rounded-md animate-pulse bg-foreground/8" />
          <span className="h-3 w-1/4 rounded-md animate-pulse bg-foreground/8" />
          <span className="h-3 w-1/2 rounded-md animate-pulse bg-foreground/8" />
        </div>
      </div>
      <div className="grid w-full grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 animate-pulse bg-foreground/8">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="flex flex-col gap-3 rounded-2xl bg-background p-4 animate-pulse bg-foreground/8"
          >
            <div className="flex items-center justify-between gap-2 animate-pulse bg-foreground/8">
              <span className="h-4 w-16 rounded-full animate-pulse bg-foreground/8" />
              <Icon
                icon="mdi:github"
                width={18}
                height={18}
                className="text-foreground-500 animate-pulse bg-foreground/8"
              />
            </div>
            <span className="h-5 w-3/4 rounded-md animate-pulse bg-foreground/8" />
            <span className="h-3 w-full rounded-md animate-pulse bg-foreground/8" />
            <span className="h-3 w-2/3 rounded-md animate-pulse bg-foreground/8" />
            <span className="h-3 w-1/2 rounded-md animate-pulse bg-foreground/8" />
          </div>
        ))}
      </div>
    </div>
  )
}
