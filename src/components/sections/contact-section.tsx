'use client'

import type { FormEvent } from 'react'
import type { SiteContent } from '@/lib/content'
import type { SessionUser } from '@/lib/supabase/session'
import { motion } from 'motion/react'
import { useEffect, useRef, useState } from 'react'
import { buildContactChannels } from '@/lib/contact-channels'
import { FadeUpSection } from '@/components/fade-up-section'
import { useT } from '@/components/locale-provider'
import { Button } from '@/components/ui/button'
import { Card, CardBody, CardFooter } from '@/components/ui/card'
import {
  ArrowLeftIcon,
  ErrorIcon,
  MailIcon,
  MapPinIcon,
  PhoneIcon,
  SendIcon,
  socialIcon,
} from '@/components/ui/icons'
import { Input } from '@/components/ui/input'
import {
  EMPTY_PHONE,
  parsePhone,
  PhoneInput,
} from '@/components/ui/phone-input'
import { Section, SectionTitle } from '@/components/ui/section'
import { Textarea } from '@/components/ui/textarea'
import { useContactForm } from '@/hooks/use-contact-form'
import { scrollToElement } from '@/lib/scroll'
import { HONEYPOT_FIELD } from '@/lib/validations'

/**
 * Iletisim karti / yerel ikonlar KALDIRILDI.
 *
 * Eskiden e-posta, telefon ve konum uc ayri kart olarak ciziliyordu; her
 * biri ayri bir kutu kapliyor, konumun harita baglantilari da kartin icinde
 * sikisiyordu. Artik hepsi tek bir aranabilir acilir menude
 * (`ContactQuickMenu`) — kopyala butonlari ve Instagram/GitHub gibi tum
 * sosyal kanallarla birlikte.
 */

export function ContactSection({ content }: { content: SiteContent }) {
  const { t } = useT()
  const {
    formData,
    errors,
    isSubmitting,
    /** 429 sonrası kalan saniye; >0 iken gönderim butonu kilitli. */
    cooldown,
    isSubmitted,
    updateField,
    submitForm,
    resetForm,
    switchContactMethod,
  } = useContactForm()

  // Telefon iki kutuda tutulur: ulke kodu + numara. Iletisim degeri
  // PhoneInput tarafindan tek metne birlestirilir.
  const [phoneValue, setPhoneValue] = useState(EMPTY_PHONE)

  /**
   * Oturum: giris yapmis kullaniciya e-posta/telefon ZORUNLU DEGIL — alan
   * `*` isareti gosterilmez, profilindeki deger varsa otomatik dolar.
   * Giris yapmamis kullanici icin zorunlu kalir.
   */
  /*
    2026-10-07 (lint temizliği): `session` ve `sessionChecked`
    state'leri bir zamanlar okunuyordu, artık hiç kullanılmıyor — JSX'te
    `{session && …}` yok. Formu dolduran şey doğrudan `u` (fetch'in
    döndürdüğü kullanıcı), state değil. State'ler kaldırıldı; istek
    korundu çünkü form ön-doldurması ondan geliyor.
  */

  useEffect(() => {
    let alive = true
    fetch('/api/admin/session', { cache: 'no-store' })
      .then(r => r.json())
      .then((d) => {
        if (!alive) {
          return
        }
        const u: SessionUser | null = d?.success && d.user ? d.user : null
        if (u) {
          if (u.fullName) {
            updateField('name', u.fullName)
          }
          if (u.email) {
            switchContactMethod('email')
            updateField('contactValue', u.email)
          }
 else if (u.phone) {
            switchContactMethod('phone')
            setPhoneValue(parsePhone(u.phone))
            updateField('contactValue', u.phone)
          }
        }
      })
      .catch(() => {
        /* oturum yok / ağ hatası: form boş kalır, kritik değil */
      })
    return () => {
      alive = false
    }
  }, [])

  const nameRef = useRef<HTMLInputElement>(null)
  const contactRef = useRef<HTMLInputElement>(null)
  const messageRef = useRef<HTMLTextAreaElement>(null)

  const fieldRefs: Record<string, React.RefObject<HTMLElement | null>> = {
    name: nameRef,
    contactValue: contactRef,
    message: messageRef,
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    const result = await submitForm()
    if (result && result !== 'ok') {
      // Eksik/geçersiz alana odaklan. `preventScroll` ŞART: aksi hâlde
      // tarayıcı odaklarken ANINDA kaydırır ve yumuşak kaydırma
      // başlamadan iptal olur (kullanıcı sıçrama görür).
      const el = fieldRefs[result]?.current
      el?.focus({ preventScroll: true })
      scrollToElement(el)
    }
  }

  /*
    429 SONRASI GERİ SAYIM (2026-10-06).
    Sunucu KV hız sınırı aşılınca 429 + Retry-After döner; hook
    `cooldown`'u saniyede bir azaltır ve bu buton kilitli kalır —
    kullanıcı her denemede 429 almaz, kalan süreyi görür.

    Sabit olarak burada hesaplanıyor: JSX içinde blok yorumlu iç içe
    ternary, `antfu/if-newline` ile `style/operator-linebreak` arasında
    düzeltme çatışmasına giriyor ve pre-commit kilitleniyordu.
  */
  const submitLabel = isSubmitting
    ? t('contact.sending')
    : cooldown > 0
      ? t('form.infoRateLimited', { seconds: cooldown })
      : t('contact.sendMessage')

  if (isSubmitted) {
    return (
      <Section className="flex-col pt-[var(--section-space)]" id="contact" framed>
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4 }}
          className="flex w-full justify-center"
        >
          <Card className="p-4 sm:p-6 lg:p-8 w-full max-w-6xl">
            <CardBody className="flex flex-col items-center justify-center text-center gap-4 sm:gap-6 py-8 sm:py-12">
              <div className="w-24 h-24 sm:w-32 sm:h-32">
                <img
                  src="/thumbs-up-3d.png"
                  alt="Success"
                  className="w-full h-full object-contain"
                />
              </div>
              <div className="space-y-2 sm:space-y-3">
                <h3 className="text-xl sm:text-2xl font-bold">
                  {content.contact.successTitle}
                </h3>
                <p className="text-foreground-500 max-w-md text-sm sm:text-base">
                  {content.contact.successText}
                </p>
              </div>
              <Button
                color="primary"
                variant="light"
                onPress={resetForm}
                startContent={<ArrowLeftIcon size={20} />}
              >
                {t('contact.sendAnother')}
              </Button>
            </CardBody>
          </Card>
        </motion.div>
      </Section>
    )
  }

  return (
    <Section
      className="flex-col pt-[var(--section-space)] pb-0"
      id="contact"
      framed
    >
      {/*
        BÖLÜM BOŞLUĞU — ÜST (2026-10-06, kullanıcı kuralı: "başlık ile
        butonlar arasındaki boşluk, butonlar ile içerik arasındaki
        boşlukla AYNI olsun").

        Ölçüm: `SectionTitle` `big` modu kendi `pb-8 sm:pb-10 lg:pb-12`
        alt boşluğunu getiriyor (48px) → başlık→buton 72px oluyordu,
        buton→içerik ise 24px. İki tarafı eşitlemek için `SectionTitle`
        ALT boşluğu sıfırlandı ve boşluk TEK kaynaktan (`--section-gap`)
        verildi — hem `pb-0` hem de `mb-0` gerekiyor çünkü Section
        tabanında hem `<div>` hem `<h2>` sarmalayıcısı var.
      */}
      <FadeUpSection className="w-full">
        <SectionTitle
          title=""
          subTitle={content.contact.subtitle}
          description={content.contact.description}
          icon={(
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width={36}
              height={36}
              viewBox="0 0 2048 2048"
              fill="currentColor"
              className="inline-block"
              aria-hidden="true"
            >
              <path d="M958 1328q101 40 184 106t142 153t91 187t33 210v64h-128v-64q0-119-45-224t-124-183t-183-123t-224-46q-119 0-224 45t-183 124t-123 183t-46 224v64H0v-64q0-109 32-210t92-187t142-152t184-107q-45-31-81-72t-61-88t-38-100t-14-108q0-93 35-174t96-142t142-96t175-36q93 0 174 35t142 96t96 142t36 175q0 55-13 107t-39 100t-61 89t-81 72m-254-48q66 0 124-25t101-68t69-102t26-125t-25-124t-69-101t-102-69t-124-26t-124 25t-102 69t-69 102t-25 124t25 124t68 102t102 69t125 25M2048 0v1024h-256l-384 384v-384h-128V896h256v203l203-203h181V128H640v230q-32 4-64 10t-64 18V0z" />
            </svg>
          )}
          big
          tightGap
        />
      </FadeUpSection>

      <div aria-hidden className="h-[var(--section-gap)]" />

      {/* Iletisim yollari — tek aranabilir acilir menu (e-posta, telefon,
          konum ve tum sosyal kanallar + kopyala butonlari). */}
      <FadeUpSection className="w-full">
        <div className="mx-auto w-full max-w-6xl">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {(() => {
              const channels = buildContactChannels(content, t)
              const builtin = channels.filter(c => c.kind !== 'social')
              const social = channels.filter(c => c.kind === 'social')
              return (
                <>
                  {builtin.map(c => (
                    <a
                      key={c.id}
                      href={c.href}
                      target={c.href?.startsWith('http') ? '_blank' : undefined}
                      rel={c.href?.startsWith('http') ? 'noopener noreferrer' : undefined}
                      className="flex items-center gap-3 rounded-lg border border-foreground-200/15 bg-background px-4 py-3 transition-colors hover:border-primary/40 hover:bg-foreground-200/10"
                    >
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/12 text-primary">
                        {c.icon === 'email' && <MailIcon size={18} />}
                        {c.icon === 'phone' && <PhoneIcon size={18} />}
                        {c.icon === 'location' && <MapPinIcon size={18} />}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-xs font-semibold text-foreground">
                          {c.label}
                        </span>
                        <span className="block truncate text-[11px] text-foreground-500">
                          {c.value}
                        </span>
                      </span>
                    </a>
                  ))}
                  {social.length > 0 && (
                    <div className="sm:col-span-2">
                      <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.14em] text-foreground-500">
                        {t('contact.socials')}
                      </p>
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        {social.map(c => (
                          <a
                            key={c.id}
                            href={c.href}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-3 rounded-lg border border-foreground-200/15 bg-background px-4 py-3 transition-colors hover:border-primary/40 hover:bg-foreground-200/10"
                          >
                            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/12 text-primary">
                              {socialIcon(c.icon, 18)}
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-xs font-semibold text-foreground">
                                {c.label}
                              </span>
                              <span className="block truncate text-[11px] text-foreground-500">
                                {c.value}
                              </span>
                            </span>
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )
            })()}
          </div>
        </div>
        {/*
          BÖLÜM BOŞLUĞU (2026-10-06, kullanıcı: "Butonlar hiçbir yerde
          alttaki içeriğe YAPIŞIK olmasın"). Buton satırı ile form kartı
          arasında boşluk YOKTU. `mt-[var(--section-gap)]` tek kaynak.
        */}
        <div aria-hidden className="h-[var(--section-gap)]" />
      </FadeUpSection>
      <FadeUpSection className="flex w-full justify-center">
        <Card className="p-4 sm:p-6 lg:p-8 w-full max-w-6xl">
          <form onSubmit={handleSubmit}>
            <CardBody className="flex flex-col w-full gap-4 sm:gap-6 lg:gap-8">
              {/*
                HONEYPOT (2026-10-07, form güvenliği).
                İnsan göremez, göremeyen de dokunulamaz; botlar görünmez
                alanları da doldurduğu için dolu gelen istek sunucuda
                sessizce düşürülüyor. `display:none` KULLANMIYORUZ — bazı
                botlar onu yok sayıp doldurmaz; ekran dışına taşımak daha
                güvenilir tuzak.
              */}
              <input
                type="text"
                name={HONEYPOT_FIELD}
                tabIndex={-1}
                autoComplete="off"
                aria-hidden="true"
                defaultValue=""
                style={{
                  position: 'absolute',
                  left: '-9999px',
                  width: '1px',
                  height: '1px',
                  opacity: '0',
                }}
              />

              <div className="flex flex-col space-y-4 sm:space-y-6 w-full">
                <Input
                  type="text"
                  label={t('contact.name')}
                  variant="faded"
                  inputRef={nameRef}
                  placeholder={t('contact.placeholderName')}
                  value={formData.name}
                  onValueChange={value => updateField('name', value)}
                  isInvalid={!!errors.name}
                  errorMessage={errors.name}
                  required
                  classNames={{ errorMessage: 'text-sm font-medium' }}
                />
                {/* Contact method: combobox (Email/Phone) + one required field */}
                <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
                  <select
                    value={formData.contactMethod}
                    onChange={e =>
                      switchContactMethod(e.target.value as 'email' | 'phone')}
                    aria-label={t('contact.method')}
                    className="h-12 w-full rounded-xl border border-foreground-200/20 bg-background px-3 text-sm text-foreground outline-none transition-colors focus:border-primary/50 sm:w-44 [&>option]:bg-background"
                  >
                    <option value="email">{t('contact.methodEmail')}</option>
                    <option value="phone">{t('contact.methodPhone')}</option>
                  </select>
                  {formData.contactMethod === 'phone' && (
                    <PhoneInput
                      label={t('contact.phone')}
                      value={phoneValue}
                      onChange={(v) => {
                        setPhoneValue(v)
                        updateField('contactValue', `+${v.code}${v.number}`)
                      }}
                      isInvalid={!!errors.contactValue}
                    />
                  )}
                  {formData.contactMethod === 'email' && (
                    <div className="w-full flex-1">
                      <Input
                        type="email"
                        aria-label={t('contact.email')}
                        variant="faded"
                        inputRef={contactRef}
                        placeholder={t('contact.placeholderEmail')}
                        value={formData.contactValue}
                        onValueChange={value =>
                          updateField('contactValue', value)}
                        isInvalid={!!errors.contactValue}
                        errorMessage={errors.contactValue}
                        required
                        classNames={{ errorMessage: 'text-sm font-medium' }}
                      />
                    </div>
                  )}
                </div>
                <Textarea
                  label={t('contact.message')}
                  variant="faded"
                  inputRef={messageRef}
                  placeholder={t('contact.placeholderMessage')}
                  value={formData.message}
                  onValueChange={value => updateField('message', value)}
                  isInvalid={!!errors.message}
                  errorMessage={errors.message}
                  minRows={3}
                  maxRows={8}
                  required
                  classNames={{ errorMessage: 'text-sm font-medium' }}
                />
                {errors.general && (
                  <div className="text-danger text-sm font-medium bg-danger-50 border border-danger-200 rounded-lg p-3 flex items-center gap-2">
                    <ErrorIcon size={16} />
                    {errors.general}
                  </div>
                )}
              </div>
            </CardBody>
            <CardFooter className="flex flex-col sm:flex-row items-center gap-4">
              {content.contact.footerText && (
                <p className="text-sm text-foreground-500 text-center sm:text-left">
                  {content.contact.footerText}
                </p>
              )}
              <div className="flex w-full sm:w-auto sm:ml-auto items-center justify-center gap-3">
                <Button
                  type="submit"
                  color="primary"
                  endContent={<SendIcon size={16} />}
                  className="font-semibold w-full sm:w-auto"
                  isLoading={isSubmitting}
                  isDisabled={isSubmitting || cooldown > 0}
                >
                  {submitLabel}
                </Button>
              </div>
            </CardFooter>
          </form>
        </Card>
      </FadeUpSection>
    </Section>
  )
}
