'use client'

import type { FormEvent, ReactNode } from 'react'
import type { SiteContent } from '@/lib/content'
import { motion } from 'motion/react'
import { useRef } from 'react'
import { FadeUpSection } from '@/components/fade-up-section'
import { useT } from '@/components/locale-provider'
import { Button } from '@/components/ui/button'
import { Card, CardBody, CardFooter } from '@/components/ui/card'
import { CountrySelect } from '@/components/ui/country-select'
import {
  ArrowLeftIcon,
  ChatIcon,
  ErrorIcon,
  GlobeIcon,
  SendIcon,
} from '@/components/ui/icons'
import { Input } from '@/components/ui/input'
import { Section, SectionTitle } from '@/components/ui/section'
import { Textarea } from '@/components/ui/textarea'
import { useContactForm } from '@/hooks/use-contact-form'

interface ContactCardProps {
  icon: ReactNode
  label: string
  value: string
  href?: string
  /** Extra content to show instead of value (e.g. map buttons) */
  actions?: ReactNode
}

/** Contact card — plain view (no link) when empty; clickable when filled. */
function ContactCard({
  icon,
  label,
  value,
  href,
  actions,
}: ContactCardProps) {
  const inner = (
    <>
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-foreground-500">
          {label}
        </p>
        {actions ?? (
          <p className="truncate text-sm font-medium text-foreground">
            {value.trim() || '—'}
          </p>
        )}
      </div>
    </>
  )
  const cls
    = 'flex w-full items-center gap-3 rounded-xl border border-foreground-200/10 bg-background p-3.5 transition-colors'
  if (href) {
    return (
      <a
        href={href}
        target={href.startsWith('mailto:') || href.startsWith('tel:') ? undefined : '_blank'}
        rel={href.startsWith('http') ? 'noopener noreferrer' : undefined}
        className={`${cls} no-underline hover:border-primary/40`}
      >
        {inner}
      </a>
    )
  }
  return <div className={cls}>{inner}</div>
}

function MailIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={20}
      height={20}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect width="20" height="16" x="2" y="4" rx="2" />
      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
    </svg>
  )
}

function PhoneIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={20}
      height={20}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
    </svg>
  )
}

export function ContactSection({ content }: { content: SiteContent }) {
  const { t } = useT()
  const {
    formData,
    errors,
    isSubmitting,
    isSubmitted,
    updateField,
    submitForm,
    resetForm,
    switchContactMethod,
    country,
    setCountry,
  } = useContactForm()

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
      // Focus the missing/invalid field
      const el = fieldRefs[result]?.current
      el?.focus()
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }

  if (isSubmitted) {
    return (
      <Section className="flex-col pt-16 sm:pt-24 lg:pt-36" id="contact" framed>
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
    <Section className="flex-col pt-16 sm:pt-24 lg:pt-36" id="contact" framed>
      {/* Title outside the box */}
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
        />
      </FadeUpSection>
      {/* Contact cards */}
      <FadeUpSection className="w-full">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap justify-center gap-3">
          <div className="w-full sm:w-[calc(50%-0.375rem)] lg:w-[calc(33.333%-0.5rem)]">
            <ContactCard
              icon={<MailIcon />}
              label={t('contact.cardEmail')}
              value={content.contact.email ?? ''}
              href={
                content.contact.email
                  ? `mailto:${content.contact.email.trim()}`
                  : undefined
              }
            />
          </div>
          <div className="w-full sm:w-[calc(50%-0.375rem)] lg:w-[calc(33.333%-0.5rem)]">
            <ContactCard
              icon={<PhoneIcon />}
              label={t('contact.cardPhone')}
              value={content.contact.phone ?? ''}
              href={
                content.contact.phone
                  ? `tel:${content.contact.phone.replace(/[\s-]/g, '')}`
                  : undefined
              }
            />
          </div>
          <div className="w-full sm:w-[calc(50%-0.375rem)] lg:w-[calc(33.333%-0.5rem)]">
            <ContactCard
              icon={<GlobeIcon size={20} />}
              label={t('contact.cardLocation')}
              value=""
              actions={(
                <div className="flex flex-row flex-wrap gap-1.5">
                  {content.contact.location && (
                    <a
                      href={content.contact.location}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 text-[11px] font-semibold text-primary no-underline transition-colors hover:bg-primary/20"
                    >
                      {t('contact.mapsGoogle')}
                    </a>
                  )}
                  {content.contact.locationYandex && (
                    <a
                      href={content.contact.locationYandex}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-full border border-foreground-200/25 bg-background px-2.5 py-1 text-[11px] font-semibold text-foreground/85 no-underline transition-colors hover:border-primary/40 hover:text-foreground"
                    >
                      {t('contact.mapsYandex')}
                    </a>
                  )}
                </div>
              )}
            />
          </div>
        </div>
      </FadeUpSection>
      <FadeUpSection className="flex w-full justify-center">
        <Card className="p-4 sm:p-6 lg:p-8 w-full max-w-6xl">
          <form onSubmit={handleSubmit}>
            <CardBody className="flex flex-col w-full gap-4 sm:gap-6 lg:gap-8">
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
                    <CountrySelect
                      value={country}
                      onChange={setCountry}
                      showCode={false}
                    />
                  )}
                  <div className="w-full flex-1">
                    <Input
                      type={
                        formData.contactMethod === 'email' ? 'email' : 'tel'
                      }
                      label={
                        formData.contactMethod === 'email'
                          ? t('contact.email')
                          : t('contact.phone')
                      }
                      variant="faded"
                      inputRef={contactRef}
                      placeholder={
                        formData.contactMethod === 'email'
                          ? t('contact.placeholderEmail')
                          : t('contact.placeholderPhone')
                      }
                      value={formData.contactValue}
                      onValueChange={value =>
                        updateField('contactValue', value)}
                      isInvalid={!!errors.contactValue}
                      errorMessage={errors.contactValue}
                      required
                      classNames={{ errorMessage: 'text-sm font-medium' }}
                    />
                  </div>
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
              <div className="flex w-full sm:w-auto sm:ml-auto items-center justify-center gap-2">
                <Button
                  href="/chat"
                  color="primary"
                  startContent={<ChatIcon size={18} />}
                  className="font-semibold w-full sm:w-auto"
                >
                  {t('contact.chatCta')}
                </Button>
                <Button
                  type="submit"
                  color="primary"
                  endContent={<SendIcon size={16} />}
                  className="font-semibold w-full sm:w-auto"
                  isLoading={isSubmitting}
                  isDisabled={isSubmitting}
                >
                  {isSubmitting
                    ? t('contact.sending')
                    : t('contact.sendMessage')}
                </Button>
              </div>
            </CardFooter>
          </form>
        </Card>
      </FadeUpSection>
    </Section>
  )
}
