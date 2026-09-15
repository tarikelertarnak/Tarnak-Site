'use client'

import type { FormEvent } from 'react'
import { Icon } from '@iconify/react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense, useState } from 'react'

import { useLocale, useT } from '@/components/locale-provider'
import { Button } from '@/components/ui/button'
import { Card, CardBody, CardHeader } from '@/components/ui/card'
import { Input } from '@/components/ui/input'

function AuthFormInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { t } = useT()
  const { locale } = useLocale()

  // Admin login: username (ya da e-posta) + şifre → /api/admin/login.
  // (OAuth + signup kaldırıldı — site tek admin kullanıyor, auth supabase değil admin sistem.)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // next param: the safe local path to return to after login
  const rawNext = searchParams.get('next')
  const nextPath
    = rawNext && rawNext.startsWith('/') && !rawNext.startsWith('//')
      ? rawNext
      : '/'

  // X (close): going back to a route that requires login creates an infinite loop
  // (e.g. /chat → /login?next=/chat) — in that case, return to the home page
  const closePath
    = nextPath === '/chat' || nextPath === '/admin' ? '/' : nextPath

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim(), password }),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok) {
        setError(data?.message || t('auth.genericError'))
        return
      }
      router.refresh()
      router.push(nextPath)
    }
    catch {
      setError(t('auth.genericError'))
    }
    finally {
      setLoading(false)
    }
  }

  const errorParam = searchParams.get('error')

  return (
    <Card className="relative w-full max-w-sm p-4 sm:p-6 bg-background">
      {/* Close (X) button — go back without logging in */}
      <button
        type="button"
        aria-label={t('auth.close')}
        onClick={() => router.push(closePath)}
        className="absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-black/30 text-foreground-500 transition-colors hover:bg-black/50 hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        <Icon icon="mdi:close" width={18} height={18} />
      </button>
      <CardHeader className="flex flex-col items-center justify-center gap-2 pb-4">
        <p className="text-3xl">🔐</p>
        <h1 className="text-xl sm:text-2xl font-bold">{t('auth.login')}</h1>
        <p className="text-sm text-foreground-500 text-center">
          {t('auth.loginSub')}
        </p>
      </CardHeader>
      <CardBody className="flex flex-col gap-4">
        <form onSubmit={submit} className="flex flex-col gap-4">
          <Input
            type="text"
            label={t('auth.email')}
            variant="faded"
            value={username}
            onValueChange={setUsername}
            required
            autoComplete="username"
          />
          <Input
            type="password"
            label={t('auth.password')}
            variant="faded"
            value={password}
            onValueChange={setPassword}
            required
            autoComplete="current-password"
          />
          {(error || errorParam) && (
            <div className="text-danger text-sm font-medium bg-danger-50 border border-danger-200 rounded-lg p-3 flex items-center gap-2">
              <Icon icon="material-symbols:error" width={16} height={16} />
              {error
                || (errorParam === 'auth'
                  ? t('auth.authFailed')
                  : t('auth.genericError'))}
            </div>
          )}
          <Button
            type="submit"
            color="primary"
            className="w-full font-semibold"
            isLoading={loading}
            isDisabled={loading || !username.trim() || !password}
          >
            {t('auth.login')}
          </Button>
        </form>
        <p className="text-center text-xs text-foreground-500">
          {t('auth.adminOnly')}
        </p>
      </CardBody>
    </Card>
  )
}

export function AuthForm() {
  return (
    <Suspense>
      <AuthFormInner />
    </Suspense>
  )
}