import { redirect } from 'next/navigation'
import { AdminPanel } from '@/components/admin/admin-panel'
import { getPosts } from '@/lib/blog'
import { getMessages } from '@/lib/chat'
import { getContent } from '@/lib/content'
import { getLocale } from '@/lib/i18n-server'
import { getSessionUser } from '@/lib/supabase/session'

export const metadata = { title: 'Admin Panel' }
export const dynamic = 'force-dynamic'
export default async function AdminPage() {
  const user = await getSessionUser()
  if (!user) {
    redirect('/login?next=/admin')
  }
  if (user.role !== 'admin') {
    const locale = await getLocale()
    const isEn = locale === 'en'
    return (
      <main
        id="main"
        className="flex min-h-[80vh] items-center justify-center"
      >
        {' '}
        <div className="max-w-sm rounded-2xl border border-danger-200/30 bg-danger-50/10 p-6 text-center">
          {' '}
          <p className="text-3xl">🔒</p>
          {' '}
          <h1 className="mt-2 text-xl font-bold">{isEn ? 'Unauthorized Access' : 'Yetkisiz Erişim'}</h1>
          {' '}
          <p className="mt-2 text-sm text-foreground-500">
            {' '}
            {isEn ? 'The admin panel is only available to admin accounts.' : 'Sayfa düzenleyici yalnızca yönetici hesaplarına açıktır.'}
            {' '}
          </p>
          {' '}
        </div>
        {' '}
      </main>
    )
  }
  const [content, posts, messages] = await Promise.all([
    getContent(),
    getPosts(),
    getMessages(),
  ])
  return (
    <main id="main" className="min-h-screen w-full px-4 sm:px-6 py-8">
      {' '}
      <AdminPanel
        initialContent={content}
        initialPosts={posts}
        initialMessages={messages}
        username={user.email ?? user.username ?? 'admin'}
      />
      {' '}
    </main>
  )
}
