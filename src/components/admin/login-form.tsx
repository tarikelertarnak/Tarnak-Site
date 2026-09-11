'use client'

import type { FormEvent } from 'react'
import { useState } from 'react'
import { Icon } from '@iconify/react'
import { useRouter } from 'next/navigation'

import { Button } from '@/components/ui/button'
import { Card, CardBody, CardHeader } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { useLocale } from '@/components/locale-provider'

export function LoginForm() {
  const router = useRouter()
  const { locale } = useLocale()
  const isEn = locale === 'en'
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.message || (isEn ? 'Login failed.' : 'Giriş başarısız.'))
        return
      }
      router.refresh()
    } catch {
      setError(isEn ? 'Something went wrong. Please try again.' : 'Bir hata oluştu. Lütfen tekrar dene.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-[80vh] items-center justify-center">
      <Card className="w-full max-w-sm p-4 sm:p-6 bg-background">
        <CardHeader className="flex flex-col items-center justify-center gap-2 pb-4">
          <p className="text-3xl">🔐</p>
          <h1 className="text-xl sm:text-2xl font-bold">{isEn ? 'Admin Login' : 'Admin Girişi'}</h1>
          <p className="text-sm text-foreground-500">
            {isEn ? 'Sign in to edit site content.' : 'Site içeriğini düzenlemek için giriş yap.'}
          </p>
        </CardHeader>
        <form onSubmit={submit}>
          <CardBody className="flex flex-col gap-4">
            <Input
              type="text"
              label={isEn ? 'Username' : 'Kullanıcı Adı'}
              variant="faded"
              value={username}
              onValueChange={setUsername}
              required
            />
            <Input
              type="password"
              label={isEn ? 'Password' : 'Şifre'}
              variant="faded"
              value={password}
              onValueChange={setPassword}
              required
            />
            {error && (
              <div className="text-danger text-sm font-medium bg-danger-50 border border-danger-200 rounded-lg p-3 flex items-center gap-2">
                <Icon icon="material-symbols:error" width={16} height={16} />
                {error}
              </div>
            )}
            <Button
              type="submit"
              color="primary"
              className="font-semibold w-full"
              isLoading={loading}
              isDisabled={loading || !username.trim() || !password}
            >
              {isEn ? 'Sign In' : 'Giriş Yap'}
            </Button>
          </CardBody>
        </form>
      </Card>
    </div>
  )
}
