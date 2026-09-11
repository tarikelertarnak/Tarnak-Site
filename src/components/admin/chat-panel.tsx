'use client'

import type { ChatMessage } from '@/lib/content'
import { Icon } from '@iconify/react'
import { useEffect, useMemo, useRef, useState } from 'react'

import { Button } from '@/components/ui/button'
import { Card, CardBody } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { SearchIcon } from '@/components/ui/icons'
import { useLocale } from '@/components/locale-provider'

interface Conversation {
  name: string
  thread: ChatMessage[]
  lastAt: number
  lastPreview: string
  unread: number
}

function formatTime(ts: number) {
  return new Date(ts).toLocaleTimeString('tr-TR', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatListTime(ts: number) {
  const now = new Date()
  const d = new Date(ts)
  if (d.toDateString() === now.toDateString()) {
    return formatTime(ts)
  }
  return d.toLocaleDateString('tr-TR', {
    day: 'numeric',
    month: 'numeric',
    year: 'numeric',
  })
}

function isImage(mime: string) {
  return mime.startsWith('image/')
}

function isAudio(mime: string) {
  return mime.startsWith('audio/')
}

export function ChatPanel({
  initialMessages,
  displayName,
  onStatus,
}: {
  initialMessages: ChatMessage[]
  displayName: string
  onStatus?: (status: { type: 'success' | 'error'; text: string }) => void
}) {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages)
  const [search, setSearch] = useState('')
  const [activeUser, setActiveUser] = useState<string | null>(null)
  const [replyText, setReplyText] = useState('')
  const [sending, setSending] = useState(false)
  const { locale } = useLocale()
  const isEn = locale === 'en'
  const bottomRef = useRef<HTMLDivElement>(null)
  const seen = useRef<Set<string>>(
    new Set(initialMessages.filter((m) => !m.owner).map((m) => m.name)),
  )

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/api/chat')
        const data = await res.json()
        if (data.success) {
          setMessages((prev) => {
            const latest = data.messages as ChatMessage[]
            const merged = [...prev]
            for (const message of latest) {
              if (!merged.some((m) => m.id === message.id)) {
                merged.push(message)
              }
            }
            return merged
          })
        }
      } catch {
        // ignore polling errors
      }
    }
    const interval = setInterval(load, 4000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [activeUser, messages])

  const conversations = useMemo<Conversation[]>(() => {
    const map = new Map<string, Conversation>()
    for (const message of messages) {
      if (message.owner) {
        if (!message.to) {
          continue
        }
        const conv = map.get(message.to)
        if (conv) {
          conv.thread.push(message)
          conv.lastAt = Math.max(conv.lastAt, message.createdAt)
        }
        continue
      }
      const conv = map.get(message.name) ?? {
        name: message.name,
        thread: [],
        lastAt: 0,
        lastPreview: '',
        unread: 0,
      }
      conv.thread.push(message)
      conv.lastAt = Math.max(conv.lastAt, message.createdAt)
      if (!seen.current.has(message.name)) {
        conv.unread += 1
      }
      map.set(message.name, conv)
    }
    for (const conv of map.values()) {
      conv.thread.sort((a, b) => a.createdAt - b.createdAt)
      const last = conv.thread[conv.thread.length - 1]
      conv.lastPreview =
        last?.text || (last?.file ? `📎 ${last.file.name}` : '')
    }
    return [...map.values()].sort((a, b) => b.lastAt - a.lastAt)
  }, [messages])

  useEffect(() => {
    if (activeUser) {
      seen.current.add(activeUser)
      setMessages((prev) => prev.map((m) => m))
    }
  }, [activeUser])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) {
      return conversations
    }
    return conversations.filter(
      (conv) =>
        conv.name.toLowerCase().includes(q) ||
        conv.lastPreview.toLowerCase().includes(q),
    )
  }, [conversations, search])

  const activeConversation = useMemo(
    () => conversations.find((conv) => conv.name === activeUser) ?? null,
    [conversations, activeUser],
  )

  const sendReply = async () => {
    if (!activeUser || !replyText.trim() || sending) {
      return
    }
    setSending(true)
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: displayName,
          text: replyText.trim(),
          owner: true,
          to: activeUser,
        }),
      })
      const data = await res.json()
      if (res.ok) {
        setReplyText('')
        setMessages((prev) => (data.data ? [...prev, data.data] : prev))
        onStatus?.({ type: 'success', text: isEn ? 'Reply sent.' : 'Yanıt gönderildi.' })
      } else {
        onStatus?.({
          type: 'error',
          text: data.message || (isEn ? 'Reply could not be sent.' : 'Yanıt gönderilemedi.'),
        })
      }
    } catch {
      onStatus?.({ type: 'error', text: isEn ? 'An error occurred.' : 'Bir hata oluştu.' })
    } finally {
      setSending(false)
    }
  }

  const removeMessage = async (id: string) => {
    try {
      const res = await fetch(`/api/chat?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
      })
      if (res.ok) {
        setMessages((prev) => prev.filter((m) => m.id !== id))
        onStatus?.({ type: 'success', text: isEn ? 'Message deleted.' : 'Mesaj silindi.' })
      }
    } catch {
      onStatus?.({ type: 'error', text: isEn ? 'Message could not be deleted.' : 'Mesaj silinemedi.' })
    }
  }

  return (
    <div className="grid w-full grid-cols-1 md:grid-cols-[280px_1fr] gap-3 sm:gap-4 items-start">
      <Card className="bg-background">
        <CardBody className="flex flex-col gap-2 p-2">
          <Input
            type="text"
            size="sm"
            variant="faded"
            placeholder={isEn ? 'Search people...' : 'Kişilerde ara...'}
            value={search}
            onValueChange={setSearch}
            startContent={<SearchIcon size={16} />}
            className="shrink-0"
          />
          <div className="flex max-h-[52vh] flex-col gap-1 overflow-y-auto">
            {filtered.length === 0 ? (
              <p className="px-2 py-6 text-center text-xs text-foreground-500">
                {search
                  ? isEn
                    ? 'No results found.'
                    : 'Sonuç bulunamadı.'
                  : isEn
                    ? 'No messages yet.'
                    : 'Henüz mesaj yok.'}
              </p>
            ) : (
              filtered.map((conv) => (
                <button
                  key={conv.name}
                  type="button"
                  onClick={() => setActiveUser(conv.name)}
                  className={`flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left transition-colors ${
                    activeUser === conv.name
                      ? 'bg-primary/15'
                      : 'hover:bg-background'
                  }`}
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-orange-600 text-sm font-black text-black">
                    {conv.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-sm font-semibold">
                        {conv.name}
                      </p>
                      <span className="shrink-0 text-[10px] text-foreground-500">
                        {formatListTime(conv.lastAt)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-xs text-foreground-500">
                        {conv.thread[conv.thread.length - 1]?.owner
                          ? 'Sen: '
                          : ''}
                        {conv.lastPreview}
                      </p>
                      {conv.unread > 0 && (
                        <span className="flex h-4 min-w-4 shrink-0 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-black">
                          {conv.unread}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </CardBody>
      </Card>
      {activeUser ? (
        <Card className="bg-background">
          <CardBody className="flex flex-col gap-0 p-0 overflow-hidden">
            <div className="flex items-center gap-2.5 border-b border-white/10 bg-black/20 px-3 py-2.5">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-orange-600 text-sm font-black text-black">
                {activeUser.charAt(0).toUpperCase()}
              </div>
              <p className="truncate text-sm font-semibold">{activeUser}</p>
            </div>
            <div className="flex h-[44vh] flex-col gap-2 overflow-y-auto bg-[#0b0b0f] p-3">
              {activeConversation?.thread.length === 0 && (
                <p className="py-8 text-center text-sm text-foreground-500">
                  Bu kişiyle henüz mesaj yok.
                </p>
              )}
              {activeConversation?.thread.map((message) => {
                const mine = message.owner
                return (
                  <div
                    key={message.id}
                    className={`group flex w-full flex-col ${mine ? 'items-end' : 'items-start'}`}
                  >
                    <div
                      className={`relative max-w-[85%] rounded-2xl px-3 py-2 text-sm break-words ${
                        mine
                          ? 'rounded-br-sm bg-primary text-black'
                          : 'rounded-bl-sm bg-[#232329] text-foreground'
                      }`}
                    >
                      {message.file && <FileBlock file={message.file} />}
                      {message.text && (
                        <p className="whitespace-pre-wrap">{message.text}</p>
                      )}
                      <div className="mt-1 flex items-center justify-end gap-1.5">
                        <p
                          className={`text-[10px] ${mine ? 'text-black/60' : 'text-foreground-500'}`}
                        >
                          {formatTime(message.createdAt)}
                        </p>
                        <button
                          type="button"
                          onClick={() => removeMessage(message.id)}
                          className={`opacity-0 transition-opacity group-hover:opacity-100 ${
                            mine
                              ? 'text-black/50 hover:text-black'
                              : 'text-foreground-500 hover:text-danger'
                          }`}
                          aria-label="Sil"
                        >
                          <Icon
                            icon="mdi:trash-can-outline"
                            width={14}
                            height={14}
                          />
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
              <div ref={bottomRef} />
            </div>
            <div className="flex flex-row items-end gap-2 border-t border-white/10 bg-black/20 p-3">
              <Input
                type="text"
                variant="flat"
                placeholder={
                  isEn
                    ? `Reply to ${activeUser}...`
                    : `${activeUser}'a yanıt yaz...`
                }
                value={replyText}
                onValueChange={setReplyText}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    sendReply()
                  }
                }}
                className="flex-1"
                maxLength={500}
              />
              <Button
                color="primary"
                isIconOnly
                aria-label={isEn ? 'Send reply' : 'Yanıt gönder'}
                onPress={sendReply}
                isLoading={sending}
                isDisabled={!replyText.trim()}
              >
                <Icon icon="mdi:send" width={20} height={20} />
              </Button>
            </div>
          </CardBody>
        </Card>
      ) : (
        <Card className="bg-background">
          <CardBody className="flex h-[44vh] flex-col items-center justify-center gap-2 text-center text-foreground-500">
            <Icon icon="mdi:chat-outline" width={40} height={40} />
            <p className="text-sm">
              Bir sohbet seçerek mesajları görüntüle ve yanıtla.
            </p>
          </CardBody>
        </Card>
      )}
    </div>
  )
}

function FileBlock({ file }: { file: NonNullable<ChatMessage['file']> }) {
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
          className="max-h-48 rounded-xl object-contain"
        />
      </a>
    )
  }
  if (isAudio(file.type)) {
    return (
      <audio
        controls
        src={file.url}
        className="mb-1 h-8 w-full max-w-[220px]"
      />
    )
  }
  return (
    <a
      href={file.url}
      target="_blank"
      rel="noopener noreferrer"
      className="mb-1 flex items-center gap-2 rounded-lg border border-white/15 bg-background px-2 py-1 text-xs"
    >
      <Icon icon="mdi:file" width={16} height={16} className="shrink-0" />
      <span className="max-w-[140px] truncate">{file.name}</span>
    </a>
  )
}
