import { redirect } from 'next/navigation'
import { getSessionUser } from '@/lib/supabase/session'
import { getLocale } from '@/lib/i18n-server'
import Client from './client'

export const metadata = { title: 'Sayfa Düzenleyici' }
export const dynamic = 'force-dynamic'

export default async function PuckAdminPage({
  params,
}: {
  params: Promise<{ puckPath?: string[] }>
}) {
  const user = await getSessionUser()
  if (!user) {
    redirect('/login?next=/admin/puck')
  }
  if (user.role !== 'admin') {
    const locale = await getLocale()
    const isEn = locale === 'en'
    return (
      <main id="main" className="flex min-h-[80vh] items-center justify-center">
        <div className="max-w-sm rounded-2xl border border-danger-200/30 bg-danger-50/10 p-6 text-center">
          <p className="text-3xl">🔒</p>
          <h1 className="mt-2 text-xl font-bold">
            {isEn ? 'Unauthorized Access' : 'Yetkisiz Erişim'}
          </h1>
          <p className="mt-2 text-sm text-foreground-500">
            {isEn
              ? 'The page editor is only available to admin accounts.'
              : 'Sayfa düzenleyici yalnızca yönetici hesaplarına açıktır.'}
          </p>
        </div>
      </main>
    )
  }

  const { puckPath = [] } = await params
  const page = puckPath[0] || 'home'
  return <Client page={page} />
}