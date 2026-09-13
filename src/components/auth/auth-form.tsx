'use client'

import type { FormEvent } from 'react'
import { Icon } from '@iconify/react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense, useState } from 'react'

import { useLocale, useT } from '@/components/locale-provider'
import { Button } from '@/components/ui/button'
import { Card, CardBody, CardHeader } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { createClient } from '@/lib/supabase/client'

// window may be undefined during SSR, so optional chaining alone is not enough —
// a typeof check is required. REDIRECT is only used in the browser.
const REDIRECT = `${typeof window !== 'undefined' ? window.location.origin : ''}/auth/callback`

function AuthFormInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { t } = useT()
  const { locale } = useLocale()
  const isEn = locale === 'en'

  // Initial mode comes from ?mode=signup (or ?mode=login) so deep links from
  // the nav header land on the right form. Fall back to 'login'.
  const initialMode: 'login' | 'signup'
    = searchParams.get('mode') === 'signup' ? 'signup' : 'login'
  const [mode, setMode] = useState<'login' | 'signup'>(initialMode)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [notice, setNotice] = useState('')
  const supabase = createClient()

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
    setNotice('')
    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        })
        if (error) {
          setError(error.message)
          return
        }
        router.refresh()
        router.push(nextPath)
      }
      else {
        const { error } = await supabase.auth.signUp({ email, password })
        if (error) {
          setError(error.message)
          return
        }
        setNotice(t('auth.registerSuccess'))
      }
    }
    catch {
      setError(isEn ? 'Something went wrong. Please try again.' : 'Bir hata oluştu. Lütfen tekrar dene.')
    }
    finally {
      setLoading(false)
    }
  }

  const oauth = async (provider: 'google' | 'github') => {
    setLoading(true)
    setError('')
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${REDIRECT}?next=${encodeURIComponent(nextPath)}`,
        },
      })
      if (error) {
        setError(error.message)
      }
    }
    catch {
      setError(isEn ? 'Something went wrong. Please try again.' : 'Bir hata oluştu. Lütfen tekrar dene.')
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
        <p className="text-3xl">{mode === 'login' ? '🔐' : '✍️'}</p>
        <h1 className="text-xl sm:text-2xl font-bold">
          {mode === 'login' ? t('auth.login') : t('auth.register')}
        </h1>
        <p className="text-sm text-foreground-500 text-center">
          {mode === 'login' ? t('auth.loginSub') : t('auth.registerSub')}
        </p>
      </CardHeader>
      <CardBody className="flex flex-col gap-4">
        {/* OAuth buttons */}
        <div className="flex flex-col gap-2">
          <Button
            type="button"
            variant="bordered"
            className="w-full font-medium"
            isLoading={loading}
            onPress={() => oauth('google')}
            startContent={
              <Icon icon="flat-color-icons:google" width={18} height={18} />
            }
          >
            {t('auth.google')}
          </Button>
          <Button
            type="button"
            variant="bordered"
            className="w-full font-medium"
            isLoading={loading}
            onPress={() => oauth('github')}
            startContent={<Icon icon="mdi:github" width={18} height={18} />}
          >
            {t('auth.github')}
          </Button>
        </div>
        <div className="flex items-center gap-3">
          <div className="h-px flex-1 bg-foreground-200/20" />
          <span className="text-xs text-foreground-500">
            {t('auth.orEmail')}
          </span>
          <div className="h-px flex-1 bg-foreground-200/20" />
        </div>
        <form onSubmit={submit} className="flex flex-col gap-4">
          <Input
            type="email"
            label={t('auth.email')}
            variant="faded"
            value={email}
            onValueChange={setEmail}
            required
            autoComplete="email"
          />
          <Input
            type="password"
            label={t('auth.password')}
            variant="faded"
            value={password}
            onValueChange={setPassword}
            required
            autoComplete={
              mode === 'login' ? 'current-password' : 'new-password'
            }
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
          {notice && (
            <div className="text-success text-sm font-medium bg-success-50 border border-success-200 rounded-lg p-3 flex items-center gap-2">
              <Icon
                icon="material-symbols:check-circle"
                width={16}
                height={16}
              />
              {notice}
            </div>
          )}
          <Button
            type="submit"
            color="primary"
            className="w-full font-semibold"
            isLoading={loading}
            isDisabled={loading || !email.trim() || !password}
          >
            {mode === 'login' ? t('auth.login') : t('auth.register')}
          </Button>
        </form>
        <p className="text-center text-sm text-foreground-500">
          {mode === 'login' ? t('auth.noAccount') : t('auth.hasAccount')}
          {' '}
          <button
            type="button"
            className="font-semibold text-primary hover:underline"
            onClick={() => {
              setMode(mode === 'login' ? 'signup' : 'login')
              setError('')
              setNotice('')
            }}
          >
            {mode === 'login' ? t('auth.register') : t('auth.login')}
          </button>
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
