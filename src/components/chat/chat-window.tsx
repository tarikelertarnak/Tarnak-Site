'use client'

import type { ChatMessage, SiteContent } from '@/lib/content'
import {
  ChatIcon,
  FileIcon,
  HouseIcon,
  LoginIcon,
  PaperclipIcon,
  SendIcon,
  UserPlusIcon,
} from '@/components/ui/icons'
import Link from 'next/link'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useT } from '@/components/locale-provider'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'

const POLL_MS = 3000

interface Contact {
  name: string
  lastAt: number
  lastText: string
}

function formatTime(ts: number) {
  return new Date(ts).toLocaleTimeString('tr-TR', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatSize(bytes: number) {
  if (bytes < 1024) {
    return `${bytes} B`
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function isImage(mime: string) {
  return mime.startsWith('image/')
}

function isAudio(mime: string) {
  return mime.startsWith('audio/')
}

export function ChatWindow({
  content,
  userName,
}: {
  content: SiteContent
  userName: string
}) {
  const { t } = useT()
  const profile = content.profile
  const joined = Boolean(userName)
  // All accessible messages: public + private threads (filtered server-side)
  const [all, setAll] = useState<ChatMessage[]>([])
  // Registered users who have never sent a message (the "Other" group)
  const [others, setOthers] = useState<string[]>([])
  // Selected person: null = the public chat
  const [contact, setContact] = useState<string | null>(null)
  const [text, setText] = useState('')
  const [error, setError] = useState('')
  const [sending, setSending] = useState(false)
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!joined || !userName) {
      return
    }
    const load = async () => {
      try {
        const res = await fetch(`/api/chat?user=${encodeURIComponent(userName)}`)
        const data = await res.json()
        if (data.success) {
          setAll(data.messages)
        }
      } catch {
        // ignore polling errors
      }
    }
    load()
    const interval = setInterval(load, POLL_MS)
    return () => clearInterval(interval)
  }, [joined, userName])

  useEffect(() => {
    if (!joined) {
      return
    }
    fetch('/api/chat/users')
      .then((res) => (res.ok ? res.json() : { users: [] }))
      .then((data) => {
        const names = ((data.users ?? []) as Array<{ username: string | null }>)
          .map((u) => u.username)
          .filter((n): n is string => Boolean(n))
        setOthers(names.filter((n) => n !== userName))
      })
      .catch(() => setOthers([]))
  }, [joined, userName])

  // Person list: users with message history (sorted by last message)
  const contacts = useMemo<Contact[]>(() => {
    const map = new Map<string, Contact>()
    const upsert = (name: string, m: ChatMessage) => {
      if (!name || name === userName) {
        return
      }
      const cur = map.get(name)
      const lastAt = m.createdAt
      const lastText = m.text || (m.file ? `📎 ${m.file.name}` : '')
      if (!cur || lastAt >= cur.lastAt) {
        map.set(name, { name, lastAt, lastText })
      }
    }
    for (const m of all) {
      if (m.to === userName || m.to === null || m.to === undefined) {
        // Owner of private messages sent to me or of public messages → person
        upsert(m.name, m)
      } else if (m.name === userName && m.to) {
        // Recipient of my private messages → person
        upsert(m.to, m)
      }
    }
    return [...map.values()].sort((a, b) => b.lastAt - a.lastAt)
  }, [all, userName])

  // Messages to show in the active thread
  const visible = useMemo(() => {
    if (contact === null) {
      // Public chat: only public messages
      return all.filter((m) => !m.to && !m.owner)
    }
    return all.filter(
      (m) =>
        (m.name === userName && (!m.to || m.to === contact)) ||
        (m.name === contact && (!m.to || m.to === userName)),
    )
  }, [all, contact, userName])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [visible])

  const send = async (fileData?: {
    name: string
    type: string
    size: number
    url: string
  }) => {
    if (
      !userName ||
      (!text.trim() && !fileData) ||
      sending ||
      uploading
    ) {
      return
    }
    setSending(true)
    setError('')
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: text.trim(),
          ...(fileData ? { file: fileData } : {}),
          // Private message if a person is selected; otherwise public
          ...(contact ? { to: contact } : {}),
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.message || t('chat.sendFailed'))
        return
      }
      setText('')
      const refresh = await fetch(
        `/api/chat?user=${encodeURIComponent(userName)}`,
      )
      const refreshed = await refresh.json()
      if (refreshed.success) {
        setAll(refreshed.messages)
      }
    } catch {
      setError(t('chat.error'))
    } finally {
      setSending(false)
    }
  }

  const onPickFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) {
      return
    }
    setUploading(true)
    setError('')
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch('/api/chat/upload', {
        method: 'POST',
        body: fd,
      })
      const data = await res.json()
      if (!res.ok || !data.success) {
        setError(data.message || t('chat.uploadFailed'))
        return
      }
      await send(data.file)
    } catch {
      setError(t('chat.uploadFailed'))
    } finally {
      setUploading(false)
    }
  }

  if (!joined) {
    return (
      <div className="flex w-full max-w-md flex-col gap-4">
        <Card className="bg-background">
          <div className="flex flex-col items-center gap-4 p-6 sm:p-8">
            <ProfileAvatar profile={profile} size={72} />
            <div className="text-center">
              <h2 className="text-lg font-bold sm:text-xl">
                {profile.displayName}
              </h2>
              <p className="text-foreground-500 text-sm">
                {t('chat.requiresLogin')}
              </p>
            </div>
            <div className="flex w-full flex-col gap-3">
              <Button
                href="/login?next=/chat"
                color="primary"
                className="w-full font-semibold"
              >
                <LoginIcon size={20} />
                {t('chat.loginBtn')}
              </Button>
              <Button
                href="/login?next=/chat"
                variant="bordered"
                className="w-full font-semibold"
              >
                <UserPlusIcon size={20} />
                {t('chat.registerBtn')}
              </Button>
            </div>
            <p className="text-foreground-500 text-center text-xs">
              {t('chat.fileHint')}
            </p>
          </div>
        </Card>
      </div>
    )
  }

  const activeName = contact ?? t('chat.general')

  return (
    <div className="flex w-full max-w-5xl flex-col gap-3">
      <Card className="bg-background overflow-hidden">
        <div className="flex items-center gap-3 border-b border-foreground-200/10 px-3 py-2.5 sm:px-4">
          <div className="relative shrink-0">
            <ProfileAvatar profile={profile} size={40} />
            <span className="border-foreground-200 absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 bg-emerald-500" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold sm:text-base">
              {profile.displayName}
            </p>
            <p className="text-emerald-400 truncate text-[11px] sm:text-xs">
              {t('chat.online')}
              {profile.nickname && (
                <span className="text-foreground-500">
                  {' '}
                  • {profile.nickname}
                </span>
              )}
            </p>
          </div>
          <Link
            href="/"
            className="text-foreground-500 hover:text-foreground inline-flex shrink-0 items-center gap-1 text-xs transition-colors"
            title={t('chat.home')}
          >
            <HouseIcon size={18} />
            <span className="hidden xs:inline">{t('chat.home')}</span>
          </Link>
        </div>

        <div className="flex flex-col md:flex-row">
          {/* Left: person list */}
          <div className="border-foreground-200/10 flex max-h-44 shrink-0 flex-col gap-1 overflow-y-auto border-b p-2 md:max-h-[56vh] md:w-56 md:border-b-0 md:border-r">
            <button
              type="button"
              onClick={() => setContact(null)}
              className={`flex w-full flex-col gap-0.5 rounded-lg px-2.5 py-2 text-left transition-colors ${
                contact === null
                  ? 'bg-foreground-200/15 text-foreground'
                  : 'text-foreground-500 hover:bg-foreground-200/10 hover:text-foreground'
              }`}
            >
              <span className="flex items-center gap-2 text-xs font-semibold">
                <ChatIcon size={15} />
                {t('chat.general')}
              </span>
              <span className="text-foreground-500 truncate text-[10px]">
                {t('chat.generalHint')}
              </span>
            </button>

            {contacts.length > 0 && (
              <p className="text-foreground-500 px-2 pt-2 pb-0.5 text-[10px] font-bold tracking-wider uppercase">
                {t('chat.chats')}
              </p>
            )}
            {contacts.map((c) => (
              <button
                key={c.name}
                type="button"
                onClick={() => setContact(c.name)}
                className={`flex w-full flex-col gap-0.5 rounded-lg px-2.5 py-2 text-left transition-colors ${
                  contact === c.name
                    ? 'bg-foreground-200/15 text-foreground'
                    : 'text-foreground-500 hover:bg-foreground-200/10 hover:text-foreground'
                }`}
              >
                <span className="flex items-center gap-2 text-xs font-semibold">
                  <AvatarDot name={c.name} />
                  <span className="truncate">{c.name}</span>
                </span>
                <span className="flex items-center justify-between gap-2">
                  <span className="text-foreground-500 min-w-0 flex-1 truncate text-[10px]">
                    {c.lastText}
                  </span>
                  <span className="text-foreground-600 shrink-0 text-[9px]">
                    {formatTime(c.lastAt)}
                  </span>
                </span>
              </button>
            ))}

            {others.length > 0 && (
              <>
                <div className="border-foreground-200/10 my-1 border-t" />
                <p className="text-foreground-500 px-2 pt-1 pb-0.5 text-[10px] font-bold tracking-wider uppercase">
                  {t('chat.others')}
                </p>
                {others.map((name) => (
                  <button
                    key={name}
                    type="button"
                    onClick={() => setContact(name)}
                    className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left transition-colors ${
                      contact === name
                        ? 'bg-foreground-200/15 text-foreground'
                        : 'text-foreground-500 hover:bg-foreground-200/10 hover:text-foreground'
                    }`}
                  >
                    <AvatarDot name={name} />
                    <span className="truncate text-xs font-semibold">
                      {name}
                    </span>
                  </button>
                ))}
              </>
            )}
          </div>

          {/* Right: messages */}
          <div className="flex min-w-0 flex-1 flex-col">
            <div className="border-foreground-200/10 flex items-center gap-2 border-b px-3 py-1.5">
              <AvatarDot name={activeName} />
              <p className="text-foreground truncate text-xs font-semibold">
                {activeName}
              </p>
              {contact && (
                <span className="text-primary text-[10px]">
                  {t('chat.ownerName')}
                </span>
              )}
            </div>
            <div className="bg-background flex h-[48vh] w-full flex-col gap-2 overflow-y-auto p-3 sm:h-[52vh] sm:p-4">
              {visible.length === 0 ? (
                <div className="text-foreground-500 flex h-full flex-col items-center justify-center gap-2 text-center">
                  <ChatIcon size={40} />
                  <p className="text-sm">{t('chat.empty')}</p>
                </div>
              ) : (
                visible.map((message) => {
                  const mine = message.owner ? false : message.name === userName
                  return (
                    <MessageBubble
                      key={message.id}
                      message={message}
                      mine={mine}
                      profile={profile}
                    />
                  )
                })
              )}
              <div ref={bottomRef} />
            </div>
            <div className="border-foreground-200/10 flex flex-col gap-2 border-t p-3 sm:p-4">
              {error && <p className="text-danger text-sm font-medium">{error}</p>}
              <div className="flex flex-row items-end gap-2">
                <input
                  ref={fileRef}
                  type="file"
                  className="hidden"
                  onChange={onPickFile}
                />
                <Button
                  isIconOnly
                  variant="bordered"
                  aria-label={t('chat.attach')}
                  isLoading={uploading}
                  onPress={() => fileRef.current?.click()}
                  className="shrink-0"
                >
                  <PaperclipIcon size={20} />
                </Button>
                <Input
                  type="text"
                  variant="flat"
                  placeholder={
                    contact
                      ? `${t('chat.placeholder')} @${contact}`
                      : t('chat.placeholder')
                  }
                  value={text}
                  onValueChange={setText}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      send()
                    }
                  }}
                  maxLength={500}
                  className="flex-1"
                />
                <Button
                  color="primary"
                  isIconOnly
                  aria-label={t('chat.send')}
                  onPress={() => send()}
                  isLoading={sending}
                  isDisabled={!text.trim() || uploading}
                  className="shrink-0"
                >
                  <SendIcon size={20} />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  )
}

function AvatarDot({ name, size = 6 }: { name: string; size?: number }) {
  return (
    <span
      className="bg-foreground-500/40 inline-block shrink-0 rounded-full"
      style={{ width: size, height: size }}
      aria-hidden
    />
  )
}

function ProfileAvatar({
  profile,
  size,
}: {
  profile: SiteContent['profile']
  size: number
}) {
  if (profile.profileImage) {
    return (
      <img
        src={profile.profileImage}
        alt={profile.displayName}
        width={size}
        height={size}
        className="rounded-full object-cover"
        style={{ width: size, height: size }}
      />
    )
  }
  return (
    <div
      className="flex items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-orange-600 font-black text-black"
      style={{ width: size, height: size, fontSize: size / 2.4 }}
    >
      {profile.displayName.charAt(0) || 'T'}
    </div>
  )
}

function MessageBubble({
  message,
  mine,
  profile,
}: {
  message: ChatMessage
  mine: boolean
  profile: SiteContent['profile']
}) {
  const { t } = useT()
  return (
    <div
      className={`flex w-full flex-col ${mine ? 'items-end' : 'items-start'}`}
    >
      <div
        className={`max-w-[82%] rounded-2xl px-3 py-2 text-sm break-words ${
          mine
            ? 'bg-primary text-black rounded-br-sm'
            : 'bg-foreground-200/10 text-foreground rounded-bl-sm'
        }`}
      >
        {message.owner && (
          <div className="mb-1 flex items-center gap-1.5">
            {message.file?.type.startsWith('image/') && profile.profileImage ? (
              <img
                src={profile.profileImage}
                alt=""
                className="h-4 w-4 rounded-full object-cover"
              />
            ) : (
              <span className="text-foreground-500 text-[10px]">
                {t('chat.ownerName')}
              </span>
            )}
          </div>
        )}
        {!message.owner && !mine && (
          <p className="text-primary mb-1 text-xs font-semibold">
            {message.name}
          </p>
        )}
        {message.file && <MessageFile file={message.file} mine={mine} />}
        {message.text && <p className="whitespace-pre-wrap">{message.text}</p>}
        <p
          className={`mt-1 text-[10px] ${
            mine ? 'text-black/60' : 'text-foreground-500'
          }`}
        >
          {formatTime(message.createdAt)}
        </p>
      </div>
    </div>
  )
}

function MessageFile({
  file,
  mine,
}: {
  file: NonNullable<ChatMessage['file']>
  mine: boolean
}) {
  if (isImage(file.type)) {
    return (
      <a
        href={file.url}
        target="_blank"
        rel="noopener noreferrer"
        className="mb-1 block"
      >
        <img
          src={file.url}
          alt={file.name}
          className="max-h-64 rounded-xl object-contain"
        />
      </a>
    )
  }
  if (isAudio(file.type)) {
    return (
      <audio
        controls
        src={file.url}
        className="mb-1 h-9 w-full max-w-[240px]"
      />
    )
  }
  return (
    <a
      href={file.url}
      target="_blank"
      rel="noopener noreferrer"
      className={`mb-1 flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-xs ${
        mine
          ? 'border-black/20 bg-black/10'
          : 'border-foreground-200/20 bg-background'
      }`}
    >
      <FileIcon size={18} className="shrink-0" />
      <span className="max-w-[140px] truncate">{file.name}</span>
      <span className="shrink-0 opacity-70">{formatSize(file.size)}</span>
    </a>
  )
}
