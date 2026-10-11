'use client'

import type { ChatMessageRow } from '@/lib/chat-v2'
import Link from 'next/link'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useT } from '@/components/locale-provider'
import { Button } from '@/components/ui/button'
import { cn } from '@/components/ui/cn'

/**
 * Sohbet v2 arayüzü (kullanıcı tarafı) — 2026-10-11.
 *
 * Kapsam (WhatsApp benzeri, tek sohbet = kullanıcı ↔ site sahibi):
 *  · ✓ teslim (çift tik), ✓ okundu (tek tik) — renk duruma göre
 *  · Mesaja sağ tık → bilgi / sabitle / kopyala / sil
 *  · "Mesaj silinsin mi?" → Herkesten sil · Benden sil · İptal
 *  · Yanıt (tıkla → kaynak mesaja git)
 *  · Emoji, resim/dosya/sesli mesaj gönderimi
 *  · ÖNEMLİ KİŞİ işareti (kırmızı vurgu)
 *
 * Silinen mesaj: içerik sunucuda maskelenir; burada "Bu mesajı sildiniz" notu
 * gösterilir. Admin retention boyunca gerçek içeriği görür (sunucu karar verir).
 */

interface ChatV2Props {
  /** Geri dönülecek adres (giriş/kayıt sonrası). Varsayılan `/chat`. */
  nextPath?: string
}

const EMOJIS = ['😀', '😂', '😊', '😍', '😎', '🤔', '👍', '🙏', '🔥', '💯', '🎉', '❤️', '✅', '⚡', '📌', '🤝']

/** Sohbete yazılacak kişi (admin için liste). */
interface Peer {
  id: string
  username: string
  fullName: string | null
  avatarUrl: string | null
}

/**
 * Oturumu İSTEMCİDE çözeriz (2026-10-11 ölçümü): root layout `force-static`
 * olduğu için sunucuda `cookies()` boş dönüyor ve `getSessionUser()` her zaman
 * null kalıyordu — giriş yapmış kullanıcı bile "giriş yap" ekranını görüyordu.
 * `/api/admin/session` route handler'ı layout DIŞINDA olduğu için aynı çerezi
 * doğru okuyor. Güvenlik aynı: her API çağrısı yine yetkiyi sunucuda doğrular.
 */
export function ChatV2({ nextPath = '/chat' }: ChatV2Props) {
  const { t } = useT()
  const [messages, setMessages] = useState<ChatMessageRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const [replyTo, setReplyTo] = useState<ChatMessageRow | null>(null)
  const [menuMsg, setMenuMsg] = useState<ChatMessageRow | null>(null)
  const [infoMsg, setInfoMsg] = useState<ChatMessageRow | null>(null)
  const [confirmMsg, setConfirmMsg] = useState<ChatMessageRow | null>(null)
  const [showEmoji, setShowEmoji] = useState(false)
  const [important, setImportant] = useState(false)
  const [session, setSession] = useState<{ id: string, role?: string } | null>(null)
  const [sessionChecked, setSessionChecked] = useState(false)
  const [schemaMissing, setSchemaMissing] = useState(false)
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [peers, setPeers] = useState<Peer[] | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const endRef = useRef<HTMLDivElement>(null)

  const isAuthenticated = !!session
  const currentUserId = session?.id ?? ''
  const isAdmin = session?.role === 'admin'

  /*
    1) Oturumu oku. 2) Rolüne göre yol:
       · NORMAL KULLANICI → site sahibiyle sohbet kendiliğinden açılır
         ("kullanıcılar sadece benimle konuşur"; "Henüz bir sohbet yok"
          ekranı kullanıcıya anlamsız geliyordu — o yüzden kaldırıldı).
       · ADMIN → kiminle konuşacağını SEÇER; herkese yazabilir.
  */
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch('/api/admin/session')
        const json = await res.json()
        if (cancelled) {
          return
        }
        if (!json?.user) {
          setSession(null)
          return
        }
        setSession({ id: json.user.id, role: json.user.role })

        if (json.user.role === 'admin') {
          // Admin'in tek bir "sohbeti" yoktur — kime yazacağını seçer.
          const users = await fetch('/api/chat/users')
          const usersJson = await users.json()
          if (!cancelled) {
            setPeers(usersJson?.success ? (usersJson.users as Peer[]) : [])
          }
          return
        }

        const open = await fetch('/api/chat/v2', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'open' }),
        })
        const openJson = await open.json()
        if (cancelled) {
          return
        }
        if (openJson?.code === 'CHAT_SCHEMA_MISSING') {
          setSchemaMissing(true)
        }
        else if (openJson?.conversation?.id) {
          setConversationId(openJson.conversation.id)
        }
        else {
          setError(openJson?.message ?? t('chat.error'))
        }
      }
      catch {
        if (!cancelled) {
          setError(t('chat.error'))
        }
      }
      finally {
        if (!cancelled) {
          setSessionChecked(true)
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [t])

  /** Admin bir kişiye tıkladığında doğrudan sohbeti açar (idempotent). */
  async function openWith(peerId: string) {
    setLoading(true)
    setError(null)
    setMessages([])
    setConversationId(null)
    try {
      const res = await fetch('/api/chat/v2', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'open', peerId }),
      })
      const json = await res.json()
      if (json?.code === 'CHAT_SCHEMA_MISSING') {
        setSchemaMissing(true)
      }
      else if (json?.conversation?.id) {
        setConversationId(json.conversation.id)
      }
      else {
        setError(json?.message ?? t('chat.error'))
      }
    }
    catch {
      setError(t('chat.error'))
    }
    finally {
      setLoading(false)
    }
  }

  const load = useCallback(async () => {
    if (!conversationId) {
      setLoading(false)
      return
    }
    try {
      const res = await fetch(`/api/chat/v2?conversationId=${encodeURIComponent(conversationId)}`)
      const json = await res.json()
      if (json.code === 'CHAT_SCHEMA_MISSING') {
        setError(t('chat.schemaMissing'))
        return
      }
      if (!res.ok || !json.success) {
        setError(json.message ?? 'Sohbet yüklenemedi.')
        return
      }
      setMessages(json.messages ?? [])
      setError(null)
    }
    catch {
      setError('Bağlantı hatası.')
    }
    finally {
      setLoading(false)
    }
  }, [conversationId, t])

  useEffect(() => {
    setLoading(true)
    load()
  }, [load])

  // basit yoklama: yeni mesajda ✓ durumu güncellensin (okundu bilgisi)
  useEffect(() => {
    if (!conversationId || !isAuthenticated) {
      return
    }
    const id = setInterval(load, 5000)
    return () => clearInterval(id)
  }, [conversationId, isAuthenticated, load])

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length])

  async function send() {
    const text = draft.trim()
    if ((!text && !replyTo) || sending || !conversationId) {
      return
    }
    setSending(true)
    try {
      const res = await fetch('/api/chat/v2', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversationId, text, replyToId: replyTo?.id }),
      })
      const json = await res.json()
      if (res.ok && json.success) {
        setMessages(prev => [...prev, json.data])
        setDraft('')
        setReplyTo(null)
      }
      else {
        setError(json.message ?? 'Gönderilemedi.')
      }
    }
    catch {
      setError('Gönderilemedi.')
    }
    finally {
      setSending(false)
    }
  }

  async function uploadFile(file: File) {
    if (!conversationId) {
      return
    }
    setSending(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const up = await fetch('/api/chat/upload', { method: 'POST', body: fd })
      const upJson = await up.json()
      if (!upJson.success) {
        setError(upJson.message ?? 'Dosya yüklenemedi.')
        return
      }
      const isAudio = file.type.startsWith('audio/')
      const isImage = file.type.startsWith('image/')
      const isVideo = file.type.startsWith('video/')
      const res = await fetch('/api/chat/v2', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId,
          kind: isAudio ? 'audio' : isVideo ? 'video' : isImage ? 'image' : 'file',
          file: upJson.file,
        }),
      })
      const json = await res.json()
      if (res.ok && json.success) {
        setMessages(prev => [...prev, json.data])
      }
    }
    finally {
      setSending(false)
    }
  }

  async function act(action: string, extra: Record<string, unknown> = {}) {
    if (!conversationId) {
      return
    }
    await fetch('/api/chat/v2', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, conversationId, ...extra }),
    })
  }

  async function remove(mode: 'me' | 'all') {
    if (!confirmMsg) {
      return
    }
    const res = await fetch(`/api/chat/v2?messageId=${confirmMsg.id}&mode=${mode}`, { method: 'DELETE' })
    const json = await res.json()
    if (json.success) {
      setMessages(prev => prev.filter(m => m.id !== confirmMsg.id))
    }
    setConfirmMsg(null)
    setMenuMsg(null)
  }

  function copy(text: string) {
    navigator.clipboard?.writeText(text)
    setMenuMsg(null)
  }

  function toggleImportant() {
    const next = !important
    setImportant(next)
    act('important', { important: next })
    setMenuMsg(null)
  }

  /* ── durumlar ─────────────────────────────────────────────────────── */
  if (!sessionChecked) {
    return <ChatNotice icon="⏳" text={t('chat.loading')} />
  }
  if (schemaMissing) {
    return <ChatNotice icon="⚠️" text={t('chat.schemaMissingHint')} />
  }
  if (!isAuthenticated) {
    /*
      Kullanıcı isteği (2026-10-11): "giriş yapmadıysam bana Kayıt ol ve
      Giriş yap diye iki buton vermeli". `next` parametresiyle giriş/kayıt
      sonrası doğrudan bu sohbete dönülür.
    */
    return (
      <div className="flex w-full max-w-md flex-col items-center gap-4 rounded-2xl border border-foreground/10 bg-background p-10 text-center">
        <span className="text-3xl">🔒</span>
        <p className="text-sm text-foreground-60">{t('chat.loginRequired')}</p>
        <div className="mt-2 flex flex-wrap items-center justify-center gap-3">
          <Link
            href={`/sign?next=${encodeURIComponent(nextPath)}`}
            className="inline-flex h-10 items-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-fg no-underline transition-colors hover:bg-primary/90"
          >
            {t('chat.registerBtn')}
          </Link>
          <Link
            href={`/login?next=${encodeURIComponent(nextPath)}`}
            className="inline-flex h-10 items-center rounded-lg border border-primary px-4 text-sm font-medium text-primary no-underline transition-colors hover:bg-primary/10"
          >
            {t('chat.loginBtn')}
          </Link>
        </div>
      </div>
    )
  }
  /*
    "Henüz bir sohbet yok" ekranı KALDIRILDI (kullanıcı isteği 2026-10-11):
    anlamsız geliyordu. Artık:
      · normal kullanıcı → sahibiyle sohbet kendiliğinden açılır,
      · admin → kime yazacağını seçer (aşağıdaki liste).
*/
if (isAdmin && !conversationId) {
    return (
      <div className="flex h-[70vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-foreground/10 bg-background">
        <div className="border-b border-foreground/10 px-4 py-3 text-sm font-semibold">
          {t('chat.pickRecipient')}
        </div>
        <div className="flex-1 overflow-y-auto p-2">
          {peers === null && <p className="p-4 text-sm text-foreground-50">{t('chat.loading')}</p>}
          {peers?.length === 0 && (
            <p className="p-4 text-sm text-foreground-50">{t('chat.noRecipients')}</p>
          )}
          {peers?.filter(p => p.id !== currentUserId).map(p => (
            <button
              key={p.id}
              type="button"
              onClick={() => openWith(p.id)}
              className="flex w-full cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors hover:bg-foreground/5"
            >
              <span className="flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary/15 text-xs font-semibold text-primary">
                {p.avatarUrl
                  ? <img src={p.avatarUrl} alt="" className="size-full object-cover" />
                  : (p.fullName || p.username).slice(0, 2).toUpperCase()}
              </span>
              <span className="min-w-0">
                <span className="block truncate text-sm font-medium">{p.fullName || p.username}</span>
                {p.fullName && (
                  <span className="block truncate text-xs text-foreground-50">
@
{p.username}
</span>
                )}
              </span>
            </button>
          ))}
        </div>
      </div>
    )
  }
  if (loading) {
    return <ChatNotice icon="⏳" text={t('chat.loading')} />
  }
  if (error) {
    return <ChatNotice icon="❌" text={error} />
  }

  return (
    <div className="flex h-[70vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-foreground/10 bg-background">
      {/* başlık + önemli kişi */}
      <div className="flex items-center justify-between border-b border-foreground/10 px-4 py-3">
        <div className="flex min-w-0 items-center gap-2">
          {isAdmin && (
            <button
              type="button"
              onClick={() => {
                setConversationId(null)
                setMessages([])
                setError(null)
              }}
              title={t('chat.backToList')}
              aria-label={t('chat.backToList')}
              className="cursor-pointer rounded-lg px-2 py-1 text-sm transition-colors hover:bg-foreground/10"
            >
              ←
            </button>
          )}
          <span className="truncate text-sm font-semibold">{t('chat.v2Title')}</span>
        </div>
        <button
          type="button"
          onClick={toggleImportant}
          title={t('chat.markImportant')}
          className={cn(
            'cursor-pointer rounded-lg px-2 py-1 text-lg transition-colors',
            important ? 'bg-red-500/15' : 'hover:bg-foreground/10',
          )}
        >
          {important ? '🔴' : '⚪'}
        </button>
      </div>

      {/* mesajlar */}
      <div className="flex-1 space-y-2 overflow-y-auto px-4 py-4">
        {messages.length === 0 && (
          <p className="pt-8 text-center text-sm text-foreground-50">{t('chat.emptyThread')}</p>
        )}
        {messages.map((m) => {
          const mine = m.sender_id === currentUserId
          const replied = replyTo?.id === m.id
          return (
            <div
              key={m.id}
              data-replied={replied || undefined}
              className={cn('flex', mine ? 'justify-end' : 'justify-start')}
            >
              <div
                onContextMenu={(e) => {
                  e.preventDefault()
                  setMenuMsg(m)
                }}
                onClick={() => replied && document.getElementById(`m-${m.id}`)?.scrollIntoView({ behavior: 'smooth' })}
                className={cn(
                  'max-w-[80%] cursor-default rounded-2xl px-3 py-2 text-sm',
                  mine ? 'bg-primary text-primary-fg' : 'bg-foreground/10 text-foreground',
                  replied && 'ring-2 ring-primary',
                )}
              >
                {/* yanıt önizlemesi */}
                <span id={`m-${m.id}`} className="block" />
                {m.kind === 'image' && m.file_url && (
                  // Sohbet görselleri kullanıcı yüklemesi; next/image gerekmez.
                  <img src={m.file_url} alt={m.file_name ?? ''} className="mb-1 max-h-48 rounded-lg" />
                )}
                {m.kind === 'audio' && m.file_url && (
                  <audio controls src={m.file_url} className="mb-1 max-w-full" />
                )}
                {m.kind === 'video' && m.file_url && (
                  <video controls src={m.file_url} className="mb-1 max-h-48 rounded-lg" />
                )}
                {m.kind === 'file' && m.file_url && (
                  <a href={m.file_url} target="_blank" rel="noopener noreferrer" className="mb-1 underline">
                    📎
{' '}
{m.file_name}
                  </a>
                )}
                {m.deleted_for_all
                  ? <em className="opacity-70">{t('chat.deletedByYou')}</em>
                  : (
                      <>
                        {m.pinned && <span className="mr-1">📌</span>}
                        <span>{m.text}</span>
                      </>
                    )}
                {/* tikler */}
                <span className="ml-2 inline-flex items-center gap-0.5 align-middle text-[10px]">
                  <span>{new Date(m.created_at).toLocaleTimeString('tr', { hour: '2-digit', minute: '2-digit' })}</span>
                  {mine && (
                    <span className={cn(m.read_at ? 'text-primary-fg' : 'opacity-70')}>
                      {m.read_at ? '✓✓' : m.delivered_at ? '✓✓' : '✓'}
                    </span>
                  )}
                </span>
              </div>
            </div>
          )
        })}
        <div ref={endRef} />
      </div>

      {/* yazma alanı */}
      <div className="border-t border-foreground/10 p-3">
        {replyTo && (
          <div className="mb-2 flex items-center justify-between rounded-lg bg-foreground/10 px-3 py-1.5 text-xs">
            <span className="truncate">
{t('chat.replyingTo')}
{' '}
{replyTo.text || replyTo.file_name}
</span>
            <button type="button" onClick={() => setReplyTo(null)} className="cursor-pointer px-2">
              ✕
            </button>
          </div>
        )}
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => setShowEmoji(v => !v)} className="cursor-pointer text-lg">
            😀
          </button>
          <input
            ref={fileRef}
            type="file"
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) {
                uploadFile(f)
              }
              e.target.value = ''
            }}
          />
          <button type="button" onClick={() => fileRef.current?.click()} className="cursor-pointer text-lg">
            📎
          </button>
          <input
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                send()
              }
            }}
            placeholder={t('chat.placeholder')}
            className="flex-1 rounded-xl border border-foreground/10 bg-transparent px-3 py-2 text-sm outline-none"
          />
          <Button type="button" onClick={send} isDisabled={sending || !draft.trim()} className="h-10">
            {t('chat.send')}
          </Button>
        </div>
        {showEmoji && (
          <div className="mt-2 flex flex-wrap gap-1">
            {EMOJIS.map(e => (
              <button key={e} type="button" onClick={() => setDraft(d => d + e)} className="cursor-pointer text-xl">
                {e}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Mesaj Bilgisi paneli: Okundu · Teslim edildi · Tarih (GG.AA.YYYY) */}
      {infoMsg && (
        <MessageInfo
          message={infoMsg}
          onClose={() => setInfoMsg(null)}
          labels={{
            title: t('chat.info'),
            read: t('chat.readAt'),
            delivered: t('chat.deliveredAt'),
            notRead: t('chat.notRead'),
            notDelivered: t('chat.notDelivered'),
          }}
        />
      )}

      {/* sağ tık menüsü */}
      {menuMsg && (
        <MessageMenu
          message={menuMsg}
          onClose={() => setMenuMsg(null)}
          onReply={() => { setReplyTo(menuMsg); setMenuMsg(null) }}
          onCopy={() => copy(menuMsg.text ?? '')}
          onPin={() => { act('pin', { messageId: menuMsg.id, pinned: !menuMsg.pinned }); setMenuMsg(null) }}
          onInfo={() => { setInfoMsg(menuMsg); setMenuMsg(null) }}
          onDelete={() => { setConfirmMsg(menuMsg); setMenuMsg(null) }}
          labels={{
            reply: t('chat.reply'),
            copy: t('chat.copy'),
            pin: menuMsg.pinned ? t('chat.unpin') : t('chat.pin'),
            info: t('chat.info'),
            delete: t('chat.delete'),
          }}
        />
      )}

      {/* silme onayı */}
      {confirmMsg && (
        <ConfirmDelete
          onDeleteAll={() => remove('all')}
          onDeleteMe={() => remove('me')}
          onCancel={() => setConfirmMsg(null)}
          labels={{
            title: t('chat.deleteConfirmTitle'),
            all: t('chat.deleteForAll'),
            me: t('chat.deleteForMe'),
            cancel: t('chat.cancel'),
          }}
        />
      )}
    </div>
  )
}

function ChatNotice({ icon, text }: { icon: string, text: string }) {
  return (
    <div className="flex w-full max-w-3xl flex-col items-center gap-3 rounded-2xl border border-foreground/10 bg-background p-10 text-center">
      <span className="text-3xl">{icon}</span>
      <p className="text-sm text-foreground-60">{text}</p>
    </div>
  )
}

/**
 * Mesaj Bilgisi (kullanıcı isteği): "Okundu", "Teslim edildi" ve tarih
 * (GG.AA.YYYY biçiminde, Türkçe gün/ay). Okundu ✓ = m.read_at,
 * Teslim ✓✓ = m.delivered_at doluysa.
 */
function MessageInfo({ message, onClose, labels }: {
  message: ChatMessageRow
  onClose: () => void
  labels: Record<string, string>
}) {
  const fmt = (iso: string | null) =>
    iso
      ? `${new Date(iso).toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' })
         } ${new Date(iso).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}`
      : null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className="w-72 rounded-xl border border-foreground/10 bg-background p-4 shadow-xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <span className="text-sm font-semibold">{labels.title}</span>
          <button type="button" onClick={onClose} className="cursor-pointer px-1 text-sm">✕</button>
        </div>
        {message.text && (
          <p className="mb-3 max-h-24 overflow-y-auto rounded-lg bg-foreground/10 p-2 text-xs">{message.text}</p>
        )}
        <dl className="space-y-1.5 text-xs">
          <div className="flex justify-between gap-3">
            <dt className="text-foreground/60">{labels.read}</dt>
            <dd>{fmt(message.read_at) ?? labels.notRead}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-foreground/60">{labels.delivered}</dt>
            <dd>{fmt(message.delivered_at) ?? labels.notDelivered}</dd>
          </div>
          <div className="flex justify-between gap-3 border-t border-foreground/10 pt-1.5">
            <dt className="text-foreground/60">{labels.title}</dt>
            <dd>{fmt(message.created_at) ?? '—'}</dd>
          </div>
        </dl>
      </div>
    </div>
  )
}

function MessageMenu({ message, onClose, onReply, onCopy, onPin, onInfo, onDelete, labels }: {
  message: ChatMessageRow
  onClose: () => void
  onReply: () => void
  onCopy: () => void
  onPin: () => void
  onInfo: () => void
  onDelete: () => void
  labels: Record<string, string>
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className="min-w-48 overflow-hidden rounded-xl border border-foreground/10 bg-background shadow-xl"
        onClick={e => e.stopPropagation()}
      >
        {message.text && (
          <p className="max-h-20 overflow-y-auto border-b border-foreground/10 px-4 py-2 text-xs text-foreground-60">
            {message.text}
          </p>
        )}
        <button type="button" onClick={onReply} className="block w-full cursor-pointer px-4 py-2.5 text-left text-sm hover:bg-foreground/10">
          ↩︎
{' '}
{labels.reply}
        </button>
        <button type="button" onClick={onCopy} className="block w-full cursor-pointer px-4 py-2.5 text-left text-sm hover:bg-foreground/10">
          ⧉
{' '}
{labels.copy}
        </button>
        <button type="button" onClick={onPin} className="block w-full cursor-pointer px-4 py-2.5 text-left text-sm hover:bg-foreground/10">
          📌
{' '}
{labels.pin}
        </button>
        <button type="button" onClick={onInfo} className="block w-full cursor-pointer px-4 py-2.5 text-left text-sm hover:bg-foreground/10">
          ⓘ
{' '}
{labels.info}
        </button>
        <button type="button" onClick={onDelete} className="block w-full cursor-pointer px-4 py-2.5 text-left text-sm text-red-500 hover:bg-red-500/10">
          🗑
{' '}
{labels.delete}
        </button>
      </div>
    </div>
  )
}

function ConfirmDelete({ onDeleteAll, onDeleteMe, onCancel, labels }: {
  onDeleteAll: () => void
  onDeleteMe: () => void
  onCancel: () => void
  labels: Record<string, string>
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onCancel}>
      <div
        className="w-72 overflow-hidden rounded-xl border border-foreground/10 bg-background shadow-xl"
        onClick={e => e.stopPropagation()}
      >
        <p className="px-4 pt-4 text-sm font-semibold">{labels.title}</p>
        <div className="mt-2 flex flex-col">
          <button type="button" onClick={onDeleteAll} className="cursor-pointer px-4 py-2.5 text-left text-sm text-red-500 hover:bg-red-500/10">
            {labels.all}
          </button>
          <button type="button" onClick={onDeleteMe} className="cursor-pointer px-4 py-2.5 text-left text-sm hover:bg-foreground/10">
            {labels.me}
          </button>
          <button type="button" onClick={onCancel} className="cursor-pointer px-4 py-2.5 text-left text-sm hover:bg-foreground/10">
            {labels.cancel}
          </button>
        </div>
      </div>
    </div>
  )
}
