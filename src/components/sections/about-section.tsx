'use client'

import type { ReactNode } from 'react'
import type { CvDoc } from '@/lib/cv'
import type { SiteContent, ToolboxItem as ToolboxItemType } from '@/lib/content'
import { Popover } from '@lobehub/ui/base-ui'
import { useState } from 'react'
import { FadeUpSection } from '@/components/fade-up-section'
import { ContactQuickMenu } from '@/components/contact-quick-menu'
import { useT } from '@/components/locale-provider'
import { BentoBox, BentoBoxItem } from '@/components/ui/bento-box'
import { Button } from '@/components/ui/button'
import { CvPicker } from '@/components/ui/cv-picker'
import {
  BrainIcon,
  CheckIcon,
  ChevronRightIcon,
  CodeIcon,
  CopyIcon,
  EyeIcon,
  FileIcon,
  LaptopIcon,
  LinkIcon,
  MusicIcon,
  SchoolIcon,
  TerminalIcon,
  UserIcon,
} from '@/components/ui/icons'
import { Section, SectionTitle } from '@/components/ui/section'

/** Interest icons — iconify id → SVG (no iconify dependency). */
const INTEREST_ICONS: Record<string, ReactNode> = {
  'mdi:laptop': <LaptopIcon size={14} />,
  'mdi:music': <MusicIcon size={14} />,
  'mdi:creation': <BrainIcon size={14} />,
}

export function AboutSection({ content, cvs }: { content: SiteContent, cvs: CvDoc[] }) {
  const about = content.about
  const { t } = useT()
  const [copiedKey, setCopiedKey] = useState<string | null>(null)

  const copyValue = (key: string, value: string) => {
    void navigator.clipboard?.writeText(value)
    setCopiedKey(key)
    window.setTimeout(
      () => setCopiedKey(prev => (prev === key ? null : prev)),
      2000,
    )
  }

  return (
    <Section id="about" className="flex-col pt-16 sm:pt-24 lg:pt-36" framed>
      <FadeUpSection className="flex w-full flex-col items-center">
        <SectionTitle
          title=""
          subTitle={about.subtitle}
          description={about.description}
          icon={<UserIcon size={34} className="inline-block" />}
          big
        />
        {/*
          Başlık altı aksiyon satırı (2026-10-05, kullanıcı):
            1. "Daha Fazlası" -> /about/ (rozet, hafif kenar + ok ikonu)
            2. "İletişim Bilgileri" -> `ContactQuickMenu` (mavi birleşik
               buton, /contact/ ile AYNI bileşen — tek kaynak)
          `gap-3` diğer buton satırlarıyla aynı. Sıralama: önce bağlantı,
          sonra eylem; kullanıcı "combobox'u buraya da ekle" dediği için
          combobox sağda duruyor.
        */}
        <div className="flex w-full flex-wrap items-center justify-center gap-3">
          <Button
            color="primary"
            href="/about/"
            // Hero butonlariyla BIREBIR ayni olcak (h-10, rounded-lg, px-4,
            // gap-2, text-sm font-medium) — "Daha Fazlasi" dugmesi farkli
            // gorsunmesin diye. `variant="bordered"` yerine dolu: ayni satirda
            // "Iletisim Bilgileri" (bg-primary) ve hero butonlari duruyor.
            className="h-10 shrink-0 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-primary-fg no-underline transition-colors hover:bg-primary/90"
            endContent={<ChevronRightIcon size={15} className="shrink-0" />}
          >
            {t('about.more')}
          </Button>
          <ContactQuickMenu content={content} />
        </div>
      </FadeUpSection>

      <div className="flex w-full justify-center">
        <BentoBox className="w-full max-w-6xl grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {/* Personal info */}
          <BentoBoxItem className="col-span-1 sm:col-span-2 lg:col-span-3 gap-4">
            <div className="flex w-full flex-col gap-4 sm:flex-row sm:items-start">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={content.profile.profileImage || undefined}
                alt={`${content.profile.firstName} ${content.profile.lastName} — profil fotoğrafı`}
                referrerPolicy="no-referrer"
                className="h-24 w-24 shrink-0 rounded-full border border-foreground-200/10 object-cover"
              />
              <div className="flex w-full flex-col gap-1">
                <h3 className="flex items-center gap-2 text-base sm:text-lg font-semibold">
                  <UserIcon size={20} className="text-primary" />
                  {t('about.infoCardTitle')}
                </h3>
                <div className="mt-2 grid w-full grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5">
                  {/*
                    AD / SOYAD (2026-10-05, kullanıcı).
                    Önce tek satırda `TARIK ELER TARNAK` birleşik
                    gösteriliyordu — kullanıcı "Ad kısmında sadece TARIK,
                    yanında Soyad olsun o da ELER yazsın, takma isim altta
                    o da Tarnak olsun" dedi.

                    Yapı:
                      Ad (TARIK) | Soyad (ELER)      ← 2 kolon, yan yana
                      Takma ad (Tarnak)               ← alt satır, tam genişlik

                    Kopyala düğmesi artık SADECE "Ad" satırında; eskiden
                    birleşik üç kelimeyi kopyalıyordu.
                  */}
                  <InfoRow
                    label={t('about.infoName')}
                    value={content.profile.firstName}
                    action={(
                      <CopyValueButton
                        copied={copiedKey === 'name'}
                        label={t('about.copy')}
                        copiedLabel={t('about.copied')}
                        onClick={() => copyValue('name', content.profile.firstName)}
                      />
                    )}
                  />
                  <InfoRow label={t('about.infoLastName')} value={content.profile.lastName} />
                  <div className="sm:col-span-2">
                    <InfoRow
                      label={t('about.infoNickname')}
                      value={content.profile.nickname}
                      action={(
                        <CopyValueButton
                          copied={copiedKey === 'nickname'}
                          label={t('about.copy')}
                          copiedLabel={t('about.copied')}
                          onClick={() => copyValue('nickname', content.profile.nickname)}
                        />
                      )}
                    />
                  </div>
                  <InfoRow
                    label={t('about.infoPhone')}
                    value={content.contact.phone}
                    action={(
                      <CopyValueButton
                        copied={copiedKey === 'phone'}
                        label={t('about.copy')}
                        copiedLabel={t('about.copied')}
                        onClick={() => copyValue('phone', content.contact.phone)}
                      />
                    )}
                  />
                  <InfoRow
                    label={t('about.infoEmail')}
                    value={content.contact.email}
                    action={(
                      <CopyValueButton
                        copied={copiedKey === 'email'}
                        label={t('about.copy')}
                        copiedLabel={t('about.copied')}
                        onClick={() => copyValue('email', content.contact.email)}
                      />
                    )}
                  />
                  <InfoRow
                    label={t('about.infoDiscord')}
                    value={t('footer.discordHandle')}
                    action={(
                      <CopyValueButton
                        copied={copiedKey === 'discord'}
                        label={t('about.copy')}
                        copiedLabel={t('about.copied')}
                        onClick={() => copyValue('discord', t('footer.discordHandle'))}
                      />
                    )}
                  />
                  {/*
                    "Ana Dil" satiri kaldirildi (kullanici istegi): ayni bilgi
                    "Diller" tablosunda zaten `about.infoFirstLanguage` rozetiyle
                    gorunuyor, burada tekrar etiketli satiri gereksiz tekrardi.
                  */}
                </div>
              </div>
            </div>
          </BentoBoxItem>

          {/* Languages: structured table. Data stays a plain string
              ("İngilizce (A2), Almanca (A1)") — parsed here, no schema churn. */}
          <BentoBoxItem className="col-span-1 sm:col-span-2 lg:col-span-2 gap-4">
            <h3 className="text-base sm:text-lg font-semibold">
              {t('about.languagesTitle')}
            </h3>
            {/* Cerceve: tablo govdesi sayfa zemine yapisip "Diller" basligindan
                  kopuyordu. `border` + `rounded-xl` ile ayri bir yuzey. */}
            <div className="w-full overflow-x-auto rounded-xl border border-foreground-200/15">
              <table className="w-full text-left text-xs sm:text-sm">
                <tbody>
                  <tr className="border-b border-foreground-200/10">
                    <td className="py-2 pr-3 font-medium">
                      {content.profile.firstLanguage}
                    </td>
                    <td className="py-2 text-right">
                      <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[11px] font-semibold uppercase text-primary">
                        {t('about.infoFirstLanguage')}
                      </span>
                    </td>
                  </tr>
                  {parseLanguages(content.profile.otherLanguages).map(row => (
                    <tr
                      key={row.name}
                      className="border-b border-foreground-200/10 last:border-b-0"
                    >
                      <td className="py-2 pr-3 text-foreground-700 dark:text-foreground/80">
                        {row.name}
                      </td>
                      <td className="py-2 text-right font-semibold text-primary">
                        {row.level}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </BentoBoxItem>

          {/* Resume: who I am + summary + experience + education */}
          <BentoBoxItem className="col-span-1 sm:col-span-2 lg:col-span-3 gap-4">
            <div className="flex w-full flex-col gap-4">
              <div className="flex w-full flex-row flex-wrap items-center justify-between gap-3">
                <h3 className="flex items-center gap-2 text-base sm:text-lg font-semibold">
                  <FileIcon size={20} className="text-primary" />
                  {about.whoTitle}
                </h3>
                <CvPicker cvs={cvs} size="sm" color="primary" />
              </div>
              <p className="text-xs sm:text-sm text-foreground-500 leading-relaxed">
                {about.whoText}
              </p>
              <p className="text-xs sm:text-sm text-foreground-500 leading-relaxed">
                {about.cv.summary}
              </p>
              {/* Only education — there is no work experience yet. */}
              <div className="flex w-full flex-col gap-2">
                <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-primary">
                  <SchoolIcon size={14} />
                  {t('about.cvEducation')}
                </p>
                <ul className="flex flex-col gap-2.5">
                  {about.cv.education.map(entry => (
                    <CvEntryItem
                      key={`${entry.company}-${entry.role}`}
                      entry={entry}
                    />
                  ))}
                </ul>
              </div>
            </div>
          </BentoBoxItem>

          <BentoBoxItem className="col-span-1 sm:col-span-2 lg:col-span-2">
            <h3 className="text-base sm:text-lg font-semibold">
              {about.toolboxTitle}
            </h3>
            <p className="mt-2 text-xs sm:text-sm text-foreground-500">
              {about.toolboxDescription}
            </p>
            <div className="flex w-full">
              <ul className="mt-3 sm:mt-4 grid grid-cols-2 xs:grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-2 sm:gap-3 lg:gap-4 w-full">
                {about.toolbox.map(item => (
                  <ToolboxItem key={item.label} item={item} />
                ))}
              </ul>
            </div>
          </BentoBoxItem>

          <BentoBoxItem className="col-span-1 sm:col-span-2 lg:col-span-2">
            <h3 className="text-base sm:text-lg font-semibold">
              {about.beyondTitle}
            </h3>
            <p className="mt-2 text-xs sm:text-sm text-foreground-500">
              {about.beyondDescription}
            </p>
            <div className="flex w-full">
              <ul className="mt-3 sm:mt-4 grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 lg:gap-4 w-full">
                {about.interests.map(item => (
                  <InterestsItem
                    key={item.label}
                    icon={INTEREST_ICONS[item.icon] ?? <CodeIcon size={14} />}
                    content={item.content}
                  >
                    {item.label}
                  </InterestsItem>
                ))}
              </ul>
            </div>
          </BentoBoxItem>
        </BentoBox>
      </div>
    </Section>
  )
}

/**
 * "İngilizce (A2), Almanca (A1)" → [{ name, level }].
 * Seviye parantezi yoksa boş string döner; ana dil tabloda ayrı satır.
 */
function parseLanguages(raw: string): { name: string, level: string }[] {
  return raw
    .split(',')
    .map(s => s.trim())
    .filter(Boolean)
    .map((entry) => {
      const m = entry.match(/^(.*?)\s*\(([^)]+)\)$/)
      return m
        ? { name: m[1].trim(), level: m[2].trim() }
        : { name: entry, level: '' }
    })
}

function InfoRow({
  label,
  value,
  action,
}: {
  label: string
  value: string
  action?: ReactNode
}) {
  return (
    <div className="flex flex-row items-center justify-between gap-3 border-b border-foreground-200/10 py-1.5">
      <span className="text-xs text-foreground-500">{label}</span>
      <span className="flex min-w-0 items-center justify-end gap-1">
        <span className="truncate text-right text-xs sm:text-sm font-semibold">
          {value.trim() || '—'}
        </span>
        {action}
      </span>
    </div>
  )
}

function CopyValueButton({
  copied,
  label,
  copiedLabel,
  onClick,
}: {
  copied: boolean
  label: string
  copiedLabel: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={copied ? copiedLabel : label}
      title={copied ? copiedLabel : label}
      className={`ml-1 inline-flex h-6 w-6 shrink-0 cursor-pointer items-center justify-center rounded-md border transition-colors ${
        copied
          ? 'border-success/40 bg-success/10 text-success'
          : 'border-foreground-200/20 bg-background text-foreground-500 hover:border-primary/50 hover:text-primary'
      }`}
    >
      {copied
        ? (
            <CheckIcon size={13} />
          )
        : (
            <CopyIcon size={13} />
          )}
    </button>
  )
}

function CvEntryItem({
  entry,
}: {
  entry: {
    role: string
    company: string
    period: string
    description: string
  }
}) {
  return (
    <li className="flex flex-row items-start gap-3 rounded-xl border border-foreground-200/10 bg-background p-3 transition-all duration-300 hover:border-primary/30 hover:bg-primary/5">
      <span className="mt-0.5 shrink-0 rounded-full bg-primary/15 p-1 text-primary">
        <ChevronRightIcon size={12} />
      </span>
      <div className="flex min-w-0 flex-col gap-0.5">
        <p className="text-sm font-semibold leading-tight">{entry.role}</p>
        <p className="text-xs text-foreground-500">
          {entry.company}
          {' '}
          <span className="mx-1.5 opacity-50">•</span>
          {' '}
          <span className="text-primary/80">{entry.period}</span>
        </p>
        <p className="mt-1 text-xs text-foreground-500 leading-relaxed">
          {entry.description}
        </p>
      </div>
    </li>
  )
}

function ToolboxItem({ item }: { item: ToolboxItemType }) {
  const { t } = useT()
  const isCommand = item.type === 'command'
  const href = item.href?.trim() ?? ''
  const icon = isCommand
    ? (
        <TerminalIcon size={14} />
      )
    : href
      ? (
          <LinkIcon size={14} />
        )
      : (
          <CodeIcon size={14} />
        )
  const body = (
    <>
      <span className="mr-2 shrink-0 text-foreground-500 transition-colors duration-300 group-hover:text-primary">
        {icon}
      </span>
      <span className="truncate font-medium">{item.label}</span>
      {isCommand && href && (
        <CopyIcon
          size={12}
          className="ml-1.5 shrink-0 opacity-0 transition-opacity duration-300 group-hover:opacity-70"
        />
      )}
    </>
  )
  const chipCls
    = 'group flex flex-row items-center rounded-xl border border-foreground-200/10 bg-background px-3 py-2 text-xs sm:text-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/30 hover:bg-primary/5 hover:shadow-lg hover:shadow-primary/5 min-h-[38px]'

  // Command type: clicking copies the command text to the clipboard.
  if (isCommand) {
    return (
      <li
        className={`${chipCls} cursor-pointer`}
        title={href ? t('about.toolboxCopy') : undefined}
        onClick={() => {
          if (href)
            void navigator.clipboard?.writeText(href)
        }}
      >
        {body}
      </li>
    )
  }

  // Link type: external link.
  if (href) {
    return (
      <li className={chipCls}>
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="flex w-full items-center"
        >
          {body}
        </a>
      </li>
    )
  }

  return <li className={chipCls}>{body}</li>
}

function InterestsItem({
  children,
  icon,
  content,
}: {
  children: ReactNode
  icon: ReactNode
  content: string
}) {
  return (
    <Popover
      placement="bottom"
      content={(
        <div className="max-w-[200px] sm:max-w-[225px] break-words px-1 py-2 text-xs sm:text-sm">
          {content}
        </div>
      )}
    >
      <li className="group flex animate-gradient cursor-pointer flex-row items-center rounded-xl border border-foreground-200/10 bg-background px-3 py-2 text-xs sm:text-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/30 hover:bg-primary/5 min-h-[38px]">
        <span className="mr-2 shrink-0 text-foreground-500 transition-colors duration-300 group-hover:text-primary">
          {icon}
        </span>
        <span className="truncate font-medium">{children}</span>
      </li>
    </Popover>
  )
}
