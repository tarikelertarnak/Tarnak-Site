'use client'

import type { ReactNode } from 'react'
import type { SiteContent, ToolboxItem as ToolboxItemType } from '@/lib/content'
import { Popover } from '@lobehub/ui'
import { useState } from 'react'
import { FadeUpSection } from '@/components/fade-up-section'
import { useT } from '@/components/locale-provider'
import { BentoBox, BentoBoxItem } from '@/components/ui/bento-box'
import { Button } from '@/components/ui/button'
import {
  BriefcaseIcon,
  CheckIcon,
  ChevronRightIcon,
  CodeIcon,
  CopyIcon,
  DownloadIcon,
  DumbbellIcon,
  EyeIcon,
  FileIcon,
  GamepadIcon,
  LaptopIcon,
  LinkIcon,
  MusicIcon,
  SchoolIcon,
  ShieldIcon,
  socialIcon,
  TerminalIcon,
  UserIcon,
} from '@/components/ui/icons'
import { Section, SectionTitle } from '@/components/ui/section'

/** Interest icons — iconify id → SVG (no iconify dependency). */
const INTEREST_ICONS: Record<string, ReactNode> = {
  'mdi:laptop': <LaptopIcon size={14} />,
  'mdi:gamepad-variant': <GamepadIcon size={14} />,
  'mdi:gym': <DumbbellIcon size={14} />,
  'mdi:music': <MusicIcon size={14} />,
  'mdi:shield-lock': <ShieldIcon size={14} />,
}

export function AboutSection({ content }: { content: SiteContent }) {
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
        {/* Social links */}
        <div className="mb-8 flex flex-row flex-wrap items-center justify-center gap-3">
          {content.social.map(item => (
            <a
              key={item.name}
              href={item.href}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={item.name}
              title={item.name}
              className="group flex h-11 w-11 items-center justify-center rounded-xl border border-foreground-200/10 bg-background text-foreground-500 transition-all duration-300 hover:-translate-y-1 hover:border-primary/40 hover:bg-primary/10 hover:text-primary"
            >
              {socialIcon(item.icon, 22)}
            </a>
          ))}
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
                alt={content.profile.displayName}
                referrerPolicy="no-referrer"
                className="h-24 w-24 shrink-0 rounded-full border border-foreground-200/10 object-cover"
              />
              <div className="flex w-full flex-col gap-1">
                <h3 className="flex items-center gap-2 text-base sm:text-lg font-semibold">
                  <UserIcon size={20} className="text-primary" />
                  {t('about.infoCardTitle')}
                </h3>
                <div className="mt-2 grid w-full grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5">
<InfoRow
                    label={t('about.infoName')}
                    value={`${content.profile.firstName} ${content.profile.lastName}`}
                    action={(
                      <CopyValueButton
                        copied={copiedKey === 'name'}
                        label={t('about.copy')}
                        copiedLabel={t('about.copied')}
                        onClick={() =>
                          copyValue(
                            'name',
                            `${content.profile.firstName} ${content.profile.lastName}`,
                          )}
                      />
                    )}
                  />
                  <InfoRow label={t('about.infoTitle')} value={content.profile.title} />
                  <InfoRow
                    label={t('about.infoExperience')}
                    value={content.profile.experience}
                  />
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
                  <InfoRow
                    label={t('about.infoFirstLanguage')}
                    value={content.profile.firstLanguage}
                  />
                  <InfoRow
                    label={t('about.infoOtherLanguages')}
                    value={content.profile.otherLanguages}
                  />
                </div>
              </div>
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
                <div className="flex flex-row gap-2">
                  <Button
                    size="sm"
                    color="primary"
                    href={about.cv.href ?? '/cv/tarikeler-cv.pdf'}
                    target="_blank"
                    startContent={<DownloadIcon size={16} />}
                  >
                    {t('about.cvDownload')}
                  </Button>
                  <Button
                    size="sm"
                    variant="bordered"
                    href={about.cv.href ?? '/cv/tarikeler-cv.pdf'}
                    target="_blank"
                    startContent={<EyeIcon size={16} />}
                  >
                    {t('about.cvView')}
                  </Button>
                </div>
              </div>
              <p className="text-xs sm:text-sm text-foreground-500 leading-relaxed">
                {about.whoText}
              </p>
              <p className="text-xs sm:text-sm text-foreground-500 leading-relaxed">
                {about.cv.summary}
              </p>
              <div className="grid w-full grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex w-full flex-col gap-2">
                  <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-primary">
                    <BriefcaseIcon size={14} />
                    {t('about.cvExperience')}
                  </p>
                  <ul className="flex flex-col gap-2.5">
                    {about.cv.experience.map(entry => (
                      <CvEntryItem
                        key={`${entry.company}-${entry.role}`}
                        entry={entry}
                      />
                    ))}
                  </ul>
                </div>
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

          <BentoBoxItem className="col-span-1">
            <h3 className="text-base sm:text-lg font-semibold">
              {about.securityTitle}
            </h3>
            <p className="mt-2 text-xs sm:text-sm text-foreground-500">
              {about.securityText}
            </p>
            <div className="flex w-full">
              <ul className="mt-3 sm:mt-4 grid grid-cols-2 gap-2 sm:gap-3 lg:gap-4 w-full">
                {about.securityTools.map(item => (
                  <ToolboxItem
                    key={item.label}
                    item={{ label: item.label, type: 'link', href: item.href }}
                  />
                ))}
              </ul>
            </div>
          </BentoBoxItem>
        </BentoBox>
      </div>
    </Section>
  )
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
