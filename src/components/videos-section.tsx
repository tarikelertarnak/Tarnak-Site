import type { KanalVideosu } from '@/lib/youtube'
import { Icon } from '@iconify/react'

/**
 * YouTube videoları bölümü (Faz 6 · 3).
 *
 * Kullanıcı kuralı: kanal ID boşsa veya besleme hata verirse bölüm
 * HİÇ render edilmez — kırık kutu ya da boş kart yığını gösterilmez.
 * Boşsa `null` dönmek bu bileşenin tek sorumluluğudur.
 */
export function VideosSection({
  videolar,
  baslik,
}: {
  videolar: KanalVideosu[]
  baslik?: string
}) {
  if (!videolar || videolar.length === 0) {
    return null
  }

  return (
    <div className="flex w-full flex-col gap-4">
      {baslik ? (
        <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">
          {baslik}
        </h2>
      ) : null}
      <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {videolar.map((video) => (
          <li key={video.id}>
            <a
              href={video.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex flex-col overflow-hidden rounded-2xl border border-foreground/10 bg-card/40 transition-colors hover:border-primary/50"
            >
              {video.kapak ? (
                <img
                  src={video.kapak}
                  alt=""
                  loading="lazy"
                  referrerPolicy="no-referrer"
                  className="aspect-video w-full object-cover"
                />
              ) : (
                <div className="flex aspect-video w-full items-center justify-center bg-foreground/5">
                  <Icon
                    icon="material-symbols:play-circle-outline"
                    width={40}
                    height={40}
                    className="text-foreground/40"
                  />
                </div>
              )}
              <div className="flex flex-col gap-1 p-3">
                <p className="line-clamp-2 text-sm font-medium leading-snug transition-colors group-hover:text-primary">
                  {video.baslik}
                </p>
                {video.tarih ? (
                  <time
                    dateTime={video.tarih}
                    className="text-xs text-foreground/50"
                  >
                    {new Date(video.tarih).toLocaleDateString('tr-TR')}
                  </time>
                ) : null}
              </div>
            </a>
          </li>
        ))}
      </ul>
    </div>
  )
}
