'use client'

import type { FormEvent } from 'react'
import { Icon } from '@iconify/react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense, useState } from 'react'

import { useT } from '@/components/locale-provider'
import { Button } from '@/components/ui/button'
import { Card, CardBody, CardHeader } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { cn } from '@/components/ui/cn'
import { PhoneInput, EMPTY_PHONE } from '@/components/ui/phone-input'
import { normalizePhone } from '@/lib/phone'

export type AuthMode = 'login' | 'signup'

function AuthFormInner({ mode }: { mode: AuthMode }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { t } = useT()

  // Ortak alanlar
  const [identifier, setIdentifier] = useState('') // login: Ad veya e-posta
  const [fullName, setFullName] = useState('') // signup: Ad
  const [email, setEmail] = useState('') // signup: e-posta
  // signup: telefon (opsiyonel) — ulke kodu + numara
  const [phoneValue, setPhoneValue] = useState(EMPTY_PHONE)
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')

  const isLogin = mode === 'login'

  // next param: local safe path to return to after auth
  const rawNext = searchParams.get('next')
  const nextPath
    = rawNext && rawNext.startsWith('/') && !rawNext.startsWith('//')
      ? rawNext
      : '/'

  // X (close): going back to a route that requires login creates an infinite loop

  const switchMode = (m: AuthMode) => {
    if (m === mode) {
      return
    }
    const target = m === 'signup' ? '/sign' : '/login'
    const query = nextPath !== '/' ? `?next=${encodeURIComponent(nextPath)}` : ''
    router.push(target + query)
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccessMessage('')

    // Akıllı ön-doğrulama: sunucuya gitmeden neyin eksik/yanlış olduğunu söyle.
    // (Sunucu mesajları Türkçe ve doğru ama alan bazında ipucu vermiyordu.)
    if (isLogin) {
      if (!identifier.trim()) {
        setLoading(false)
        setError(t('auth.errIdentifierEmpty'))
        return
      }
      if (!identifier.includes('@') && identifier.trim().length < 3) {
        setLoading(false)
        setError(t('auth.errIdentifierShort'))
        return
      }
      if (!password) {
        setLoading(false)
        setError(t('auth.errPasswordEmpty'))
        return
      }
    }
    else {
      if (!fullName.trim()) {
        setLoading(false)
        setError(t('auth.errNameEmpty'))
        return
      }
      if (fullName.trim().length < 2) {
        setLoading(false)
        setError(t('auth.errNameShort'))
        return
      }
      if (!email.trim()) {
        setLoading(false)
        setError(t('auth.errEmailEmpty'))
        return
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
        setLoading(false)
        setError(t('auth.errEmailInvalid'))
        return
      }
      if (password.length < 8) {
        setLoading(false)
        setError(t('auth.errPasswordShort', { n: password.length }))
        return
      }
      // Telefon girildiyse ülke kurallarına göre denetle (veri bazlı).
      if (phoneValue.code || phoneValue.number) {
        const full = `+${phoneValue.code}${phoneValue.number}`
        const check = normalizePhone(full)
        if (!check.ok) {
          setLoading(false)
          setError(
            check.verdict === 'tooShort'
              ? t('form.errPhoneShort', { min: check.min ?? 4, max: check.max ?? 15 })
              : t('form.errPhoneLong', { max: check.max ?? 15 }),
          )
          return
        }
      }
    }

    try {
      const endpoint = isLogin ? '/api/auth/login' : '/api/auth/signup'
      const body = isLogin
        ? { identifier: identifier.trim(), password }
        : {
            fullName: fullName.trim(),
            email: email.trim(),
            password,
            phone: (phoneValue.code || phoneValue.number)
        ? `+${phoneValue.code}${phoneValue.number}`
        : undefined,
          }
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok) {
        setError(data?.message || t('auth.genericError'))
        return
      }
      if (data?.sessionDelayed) {
        // Hesap oluştu ama otomatik oturum kurulamadı — giriş sayfasına git
        setSuccessMessage(t('auth.registerSuccess'))
        router.push(`/login?next=${encodeURIComponent(nextPath)}`)
        return
      }
      router.refresh()
      router.push(data?.next || nextPath)
    }
    catch {
      setError(t('auth.genericError'))
    }
    finally {
      setLoading(false)
    }
  }
  const canSubmit = isLogin
    ? identifier.trim().length > 0 && password.length > 0
    : fullName.trim().length > 0 && email.trim().length > 0 && password.length >= 8

  return (
    <Card className="relative w-full max-w-sm p-4 sm:p-6 bg-background">
      {/* Sağ üstteki "Kapat" (×) butonu KALDIRILDI — gereksizdi; ana sayfaya
          dönmek için üstteki logo ve tarayıcı geri tuşu yeterli. */}

      {/* ── Tab'lar: 1. Giriş | 2. Kayıt Ol ────────────────────────────
          *
          * SIRALAMA 2026-10-05 (kullanıcı): "1. tab giriş 2. tap kayıt ol".
          * Önceden solda "Kayıt Ol", sağda "Giriş Yap" vardı — yani giriş
          * yapmak isteyen kullanıcı ikinci sekmeye tıklamak zorundaydı.
          *
          * `role="tablist"` + `role="tab"` + `aria-selected`: ekran okuyucu
          * hangi sekmenin açık olduğunu okuyabilsin. Klavyede ok tuşlarıyla
          * gezinme de eklendi (roving tabindex) — sekmeler bağımsız buton
          * değil, bir grup içinde seçim.
          *
          * `switchMode` `?next=` parametresini TAŞIDIĞI için
          * `/login?next=/chat` ↔ `/sign?next=/chat` arasında geçişte geri
          * dönüş rotası korunur.
          */}
      <div
        role="tablist"
        aria-label={isLogin ? t('auth.login') : t('auth.register')}
        className="mb-4 grid grid-cols-2 gap-1 rounded-xl bg-foreground/[0.06] p-1"
      >
        <button
          type="button"
          role="tab"
          id="auth-tab-login"
          aria-selected={mode === 'login'}
          aria-controls="auth-panel"
          tabIndex={mode === 'login' ? 0 : -1}
          onClick={() => switchMode('login')}
          onKeyDown={(e) => {
            if (e.key === 'ArrowRight') {
              e.preventDefault()
              switchMode('signup')
            }
          }}
          className={cn(
            'rounded-lg px-3 py-2 text-sm font-semibold transition-colors',
            mode === 'login'
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'text-foreground/70 hover:text-foreground',
          )}
        >
          {t('auth.login')}
        </button>
        <button
          type="button"
          role="tab"
          id="auth-tab-signup"
          aria-selected={mode === 'signup'}
          aria-controls="auth-panel"
          tabIndex={mode === 'signup' ? 0 : -1}
          onClick={() => switchMode('signup')}
          onKeyDown={(e) => {
            if (e.key === 'ArrowLeft') {
              e.preventDefault()
              switchMode('login')
            }
          }}
          className={cn(
            'rounded-lg px-3 py-2 text-sm font-semibold transition-colors',
            mode === 'signup'
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'text-foreground/70 hover:text-foreground',
          )}
        >
          {t('auth.register')}
        </button>
      </div>

      {/*
        Alt başlık metni (2026-10-05, kullanıcı): "Yeni hesap oluşturun. Ad,
        e-posta ve şifre zorunludur; telefon isteğe bağlıdır." KALDIRILDI.
        Kayıt ekranı artık yalnız "Kayıt Ol" başlığını gösterir.
        `auth.registerUserSub` çeviri anahtarı da boşaltıldı ve tüm
        render'lar kaldırıldı — anahtarı silmek yerine boş bırakmak,
        `t()` fallback'i (tr) yüzünden diğer dillere sızmasın diye.
      */}
      <CardHeader className="flex flex-col items-center justify-center gap-2 pb-4">
        <p className="text-3xl">{isLogin ? '🔐' : '📝'}</p>
        <h1 className="text-xl sm:text-2xl font-bold">
          {isLogin ? t('auth.login') : t('auth.register')}
        </h1>
        {isLogin && (
          <p className="text-sm text-foreground/60 text-center">{t('auth.loginUserSub')}</p>
        )}
      </CardHeader>

      <CardBody
        id="auth-panel"
        role="tabpanel"
        aria-labelledby={mode === 'login' ? 'auth-tab-login' : 'auth-tab-signup'}
        className="flex flex-col gap-4"
      >
        <form onSubmit={submit} className="flex flex-col gap-4">
          {isLogin
            ? (
                <Input
                  type="text"
                  label={t('auth.identifier')}
                  variant="faded"
                  value={identifier}
                  onValueChange={setIdentifier}
                  required
                  autoComplete="username"
                  placeholder={t('auth.identifierPlaceholder')}
                />
              )
            : (
                <>
                  <Input
                    type="text"
                    label={t('auth.name')}
                    variant="faded"
                    value={fullName}
                    onValueChange={setFullName}
                    required
                    autoComplete="name"
                    maxLength={100}
                  />
                  <Input
                    type="email"
                    label={t('auth.email')}
                    variant="faded"
                    value={email}
                    onValueChange={setEmail}
                    required
                    autoComplete="email"
                    maxLength={254}
                  />
                </>
              )}

          <Input
            type="password"
            label={t('auth.password')}
            variant="faded"
            value={password}
            onValueChange={setPassword}
            required
            autoComplete={isLogin ? 'current-password' : 'new-password'}
          />

          {!isLogin && (
            <PhoneInput
              label={t('auth.phone')}
              optionalLabel={t('auth.phoneOptional')}
              value={phoneValue}
              onChange={setPhoneValue}
              isInvalid={!!error && /telefon|phone|numara/i.test(error)}
              errorMessage={error && /telefon|phone|numara/i.test(error) ? error : undefined}
            />
          )}

          {error && (
            <div className="text-danger text-sm font-medium bg-danger-50 border border-danger-200 rounded-lg p-3 flex items-center gap-2">
              <Icon icon="material-symbols:error" width={16} height={16} />
              {error}
            </div>
          )}

          {successMessage && (
            <div className="text-emerald-600 text-sm font-medium bg-emerald-50 border border-emerald-200 rounded-lg p-3">
              {successMessage}
            </div>
          )}

          <Button
            type="submit"
            color="primary"
            className="w-full font-semibold"
            isLoading={loading}
            isDisabled={loading || !canSubmit}
          >
            {isLogin ? t('auth.login') : t('auth.register')}
          </Button>
        </form>

        {/* Alt geçiş linki — tab'ların yanında ikinci yol */}
        <p className="text-center text-xs text-foreground-500">
          {isLogin ? t('auth.noAccount') : t('auth.hasAccount')}
          {' '}
          <button
            type="button"
            onClick={() => switchMode(isLogin ? 'signup' : 'login')}
            className="font-semibold text-primary hover:underline"
          >
            {isLogin ? t('auth.register') : t('auth.login')}
          </button>
        </p>
      </CardBody>
    </Card>
  )
}

export function AuthForm({ mode = 'login' }: { mode?: AuthMode }) {
  return (
    <Suspense>
      <AuthFormInner mode={mode} />
    </Suspense>
  )
}
