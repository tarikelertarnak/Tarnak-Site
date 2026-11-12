'use client'

import type { CSSProperties, KeyboardEvent as ReactKeyboardEvent, MouseEvent as ReactMouseEvent, PointerEvent as ReactPointerEvent } from 'react'
import type { LightboxItem } from '@/components/chat/media-lightbox'
import type { ChatMessageRow, ChatReactionRow } from '@/lib/chat-db'
import type { Presence, PresenceState } from '@/lib/chat-peers'
import type { TickStyle } from '@/lib/chat-ticks'
import Link from 'next/link'

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AudioMessage } from '@/components/chat/audio-message'
import { EmojiPicker } from '@/components/chat/emoji-picker'
import { MediaLightbox } from '@/components/chat/media-lightbox'
import { useSwipeReply } from '@/components/chat/use-swipe-reply'
import { VideoMessage } from '@/components/chat/video-message'
import { useT } from '@/components/locale-provider'
import { cn } from '@/components/ui/cn'
import {
  BanIcon,
  BellIcon,
  BellOffIcon,
  ChevronDownIcon,
  ClockIcon,
  CloseIcon,
  CopyIcon,
  DownloadIcon,
  EditIcon,
  ErrorIcon,
  FileIcon,
  FolderIcon,
  ForwardIcon,
  InfoIcon,
  LockIcon,
  MenuIcon,
  MoreVerticalIcon,
  PaperclipIcon,
  PinIcon,
  PlusIcon,
  PollIcon,
  ReplyIcon,
  SearchIcon,
  SendIcon,
  SmileFaceIcon,
  StarIcon,
  StickerIcon,
  TickReadIcon,
  TickSentIcon,
  TrashIcon,
  UserIcon,
} from '@/components/ui/icons'
import { askNotify, dismissNotify, notifyDismissed, notifyState, showBrowserNotification } from '@/lib/browser-notify'
import {
  isTyping,
  PRESENCE_UI,
  presenceOf,
  sortPeers,
  typingLabel,
} from '@/lib/chat-peers'
import { replyPlaceholderKey, replySenderLabel, toReplyPreview } from '@/lib/chat-reply'
import { TICK_LIST_COLORS, tickFor, tickForFlags } from '@/lib/chat-ticks'
import { helloMessage } from '@/lib/greeting'
import { MenuHeader, MenuItem, menuPoint, MenuSurface, useLongPress } from './context-menu'

/**
 * Sohbet arayüzü (kullanıcı tarafı) — 2026-10-11.
 *
 * YERLEŞİM (2026-10-12 kullanıcı isteği): TEK EKRAN — solda "kime yazmak
 * istiyorum" paneli (sürükleyerek genişlet/daralt), sağda tıklanan kişiyle
 * sohbet. Eski "önce kişiyi seç, sonra sohbet açılsın" iki adımlı ekranı ve
 * "Kime yazmak istiyorsun?" başlığı kaldırıldı; yükleme/hata tam ekranı
 * kaplamaz.
 *
 * Kapsam (WhatsApp benzeri, tek sohbet = kullanıcı ↔ site sahibi):
 *  · Tikler (karar: `lib/chat-ticks.ts`): tek tik + SARI = gönderildi,
 *    çift tik + SARI = teslim edildi, çift tik + YEŞİL = okundu
 *  · Mesaja sağ tık → bilgi / sabitle / kopyala / sil
 *  · "Mesaj silinsin mi?" → Herkesten sil · Benden sil · İptal
 *  · Yanıt (tıkla → kaynak mesaja git)
 *  · Emoji, resim/dosya/sesli mesaj gönderimi
 *  · ÖNEMLİ KİŞİ işareti (kırmızı vurgu)
 *
 * Silinen mesaj: içerik sunucuda maskelenir; burada "Bu mesajı sildiniz" notu
 * gösterilir. Admin retention boyunca gerçek içeriği görür (sunucu karar verir).
 */

interface ChatProps {
  /** Geri dönülecek adres (giriş/kayıt sonrası). Varsayılan `/chat`. */
  nextPath?: string
  /** Bir mesaja tıklanınca değeri metin alanına yazar (admin düzenleme için). */
  onConfigUpdate?: (value: string) => void
  /** Tıklanan mesajın id/class bilgisini döndürür. */
  onMessageClick?: (info: { id: string, className: string }) => void
}

/**
 * Yan panel (kişi listesi) genişliği — sürükleyerek veya ok tuşlarıyla değişir,
 * `localStorage`ta hatırlanır (desen: `components/sidebar.tsx`).
 */
const CHAT_PANEL_MIN = 240
const CHAT_PANEL_MAX = 560
const CHAT_PANEL_DEFAULT = 288
const CHAT_PANEL_KEY = 'chat-panel-width'
const CHAT_LAST_PEER_KEY = 'chat-last-peer'
/**
 * Liste panelinin GENİŞ/KOMPAKT durumu hatırlanır (2026-10-13 kullanıcı isteği:
 * "hamburger listeyi genişletip daraltsın … seçimi localStorage'a kaydet").
 * KOMPAKT = yalnız avatar sütunu; GENİŞ = arama kutusu + isim + son mesaj.
 */
const CHAT_PANEL_OPEN_KEY = 'chat-panel-open'
/** Çok dar ekran (kullanıcı isteği: "480px altında otomatik kompakt liste"). */
const CHAT_NARROW_QUERY = '(max-width: 479px)'

/**
 * YAZMA SİNYALİ (2026-10-12 kullanıcı isteği: "gecikme çok uzun").
 *  · yazarken sinyal en fazla ~2 sn'de bir tekrarlanır (throttle),
 *  · yazmayı bırakınca ~2.5 sn sonra "durdu" gider (debounce),
 *  · sunucudaki durum `TYPING_TTL_MS` (5 sn) yaşar — sinyal kesilirse söner.
 */
const TYPING_THROTTLE_MS = 2_000
const TYPING_IDLE_MS = 2_500
/** Kişi listesi + mesaj yoklama aralığı: yazma durumu ~2 sn içinde görünür. */
const POLL_MS = 2_000

/**
 * `md` kırılma noktası JS tarafı YOK ARTIK: liste paneli her genişlikte yan yana
 * durur, daralma/genişleme CSS `clamp()` + `--chat-panel-w` ile yapılır.
 */

/** Çok dar ekran mı — 480px altında liste otomatik KOMPAKT başlar. */
function isNarrowScreen() {
  return typeof window !== 'undefined'
    && window.matchMedia?.(CHAT_NARROW_QUERY).matches === true
}

/** Boş alan menüsü hedefi — sağ tık ve uzun basma aynı menüyü açar. */
function areaMenuAt(x: number, y: number) {
  return { kind: 'area' as const, x, y }
}

/**
 * İSTEMCİ TARAFI MESAJ (2026-10-16): sunucu satırı + iyimser gönderim durumu.
 * `_pending` → saat ikonu, `_failed` → kırmızı ünlem + "Tekrar dene".
 * Sunucudan gelen satırlarda ikisi de yoktur.
 */
type UiMessage = ChatMessageRow & { _pending?: boolean, _failed?: boolean }

/**
 * Mesajın gerçek medya türü — sunucu türü BİLİNMİYORSA (eski/bug'lı
 * yüklemeler `file`+`.bin` olarak kaydoldu) dosya adından/MIME'den çıkar.
 * `file` satırı bozuk olsa bile player yine çizilir (2026-11-08).
 */
function mediaKindOf(m: ChatMessageRow): 'image' | 'audio' | 'video' | null {
  if (m.kind === 'image' || m.kind === 'audio' || m.kind === 'video') {
    return m.kind
  }
  const name = (m.file_name ?? '').toLowerCase()
  const dot = name.lastIndexOf('.')
  const ext = dot >= 0 ? name.slice(dot + 1) : ''
  const ft = (m.file_type ?? '').toLowerCase()
  if (ft.startsWith('image/') || ['png', 'jpg', 'jpeg', 'gif', 'webp', 'avif', 'bmp'].includes(ext)) {
    return 'image'
  }
  if (ft.startsWith('video/') || ['mp4', 'mov', 'mkv', 'avi', 'webm'].includes(ext)) {
    return 'video'
  }
  if (ft.startsWith('audio/') || ['mp3', 'wav', 'flac', 'm4a', 'aac', 'ogg', 'oga', 'opus', 'weba'].includes(ext)) {
    return 'audio'
  }
  return null
}

/**
 * Medya altına dosya adı + İNDİRME ikonu (2026-11-08, kullanıcı isteği):
 * görsel/video/ses balonunda dosya adı ve yanında indirme düğmesi durur.
 */
function MediaCaption({
  fileName,
  mine,
}: {
  fileName: string | null
  mine: boolean
}) {
  if (!fileName) {
    return null
  }
  return (
    <div className={cn('mb-1 flex items-center gap-1.5', mine ? 'justify-end' : 'justify-start')}>
      <span className={cn('font-mono text-[10px] leading-tight break-all whitespace-normal text-left', mine ? 'text-primary-fg/75' : 'text-foreground-500')}>
        {fileName}
      </span>
    </div>
  )
}

/**
 * ALINTI ŞERİDİ RENGİ (kullanıcı isteği: "gönderene göre SABİT renk; kendi
 * mesajın için mavi"). Renk gönderen id'sinin karmasından seçilir → aynı kişi
 * her zaman aynı renkte görünür. Kendi mesajlarım (ve kendi alıntılarım) sitenin
 * mavi vurgusunu (`--tprimary`) kullanır.
 */
const QUOTE_ACCENTS = [
  { bar: 'border-pink-400', text: 'text-pink-400' },
  { bar: 'border-amber-400', text: 'text-amber-400' },
  { bar: 'border-emerald-400', text: 'text-emerald-400' },
  { bar: 'border-violet-400', text: 'text-violet-400' },
  { bar: 'border-teal-400', text: 'text-teal-400' },
  { bar: 'border-rose-400', text: 'text-rose-400' },
  { bar: 'border-indigo-400', text: 'text-indigo-400' },
  { bar: 'border-orange-400', text: 'text-orange-400' },
]

/** Tepki şeridindeki hızlı emojiler (WhatsApp düzeni). */
const QUICK_REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🙏'] as const

/** Tepkileri emoji başına gruplar; sıra tepkinin oluşma sırasıyla korunur. */
function groupReactions(list: ChatReactionRow[]): { emoji: string, users: ChatReactionRow[] }[] {
  const map = new Map<string, ChatReactionRow[]>()
  for (const r of list) {
    const arr = map.get(r.emoji) ?? []
    arr.push(r)
    map.set(r.emoji, arr)
  }
  return [...map.entries()].map(([emoji, users]) => ({ emoji, users }))
}

/** İsimden baş harfler — avatarsız kullanıcılarda monogram. */
function initialsOf(name: string | null | undefined): string {
  const s = (name ?? '').trim()
  if (!s) {
    return '?'
  }
  const parts = s.split(/\s+/).filter(Boolean)
  const first = parts[0] ?? ''
  const last = parts.length > 1 ? parts[parts.length - 1]! : ''
  return ((first[0] ?? '?') + (last[0] ?? '')).toUpperCase()
}

/**
 * Alıntı şeridi/başlık rengi.
 * `onOwnBubble`: alıntı KENDİ mavi balonumun içindeyse mavi şerit görünmez —
 * orada balonun metin renginin yarı saydam hâli kullanılır (okunur kalır).
 */
function quoteAccent(senderId: string, isMine: boolean, onOwnBubble: boolean) {
  if (onOwnBubble) {
    return { bar: 'border-primary-fg/70', text: 'text-primary-fg/90' }
  }
  if (isMine) {
    return { bar: 'border-primary', text: 'text-primary' }
  }
  let hash = 0
  for (let i = 0; i < senderId.length; i++) {
    hash = (hash * 31 + senderId.charCodeAt(i)) >>> 0
  }
  return QUOTE_ACCENTS[hash % QUOTE_ACCENTS.length]
}

/**
 * Bırakılan dosyaları toplar (2026-11-08, kullanıcı isteği). Klasör bırakılırsa
 * `webkitGetAsEntry` ile içine girilir; tek tek File alıp kuyruğa eklenir.
 * `DataTransfer.files` yalnız düz dosya verir — dizinlerde boş döner, o yüzden
 * girişlere bakılır; hiçbir giriş yoksa `.files` yedeği döner.
 */
async function collectDroppedFiles(dt: DataTransfer): Promise<File[]> {
  const items = [...dt.items]
  const entries = items
    .map(item => (typeof item.webkitGetAsEntry === 'function' ? item.webkitGetAsEntry() : null))
    .filter((e): e is FileSystemEntry => !!e)
  if (entries.length === 0) {
    return [...dt.files]
  }
  const files: File[] = []
  const walk = async (entry: FileSystemEntry): Promise<void> => {
    if (entry.isFile) {
      const file = await new Promise<File>((resolve, reject) => {
        (entry as FileSystemFileEntry).file(resolve, reject)
      })
      files.push(file)
      return
    }
    if (entry.isDirectory) {
      const reader = (entry as FileSystemDirectoryEntry).createReader()
      // readEntries en fazla ~100 satır döndürür — tükenene kadar döngü.
      while (true) {
        const batch = await new Promise<FileSystemEntry[]>((resolve, reject) => {
          reader.readEntries(resolve, reject)
        })
        if (batch.length === 0) {
          break
        }
        for (const child of batch) {
          // eslint-disable-next-line no-await-in-loop -- sıralı okuma
          await walk(child)
        }
      }
    }
  }
  for (const entry of entries) {
    // eslint-disable-next-line no-await-in-loop -- sıralı toparla
    await walk(entry)
  }
  return files
}

/** Kaydırma sonrası vurgulanan mesajın parlaması (ms). */
const FLASH_MS = 1_900

/**
 * YEREL ÇEVRIMİÇİ DURUMU (local-first, 2026-10-14; kural 2026-10-16'da
 * DEĞİŞTİ).
 *
 * Sunucudan gelen `lastSeenAt` yerine, SEKME GÖRÜNÜRLÜĞÜ ile yerel olarak
 * hesaplanır. Sunucuya senkron:
 *   - Sekme kapanırken / gizlenirken (pagehide, visibilitychange)
 *   - Periyodik nabız — sadece "hala buradayım" demek için
 *   - Yazma durumu değiştiğinde (typing start/stop)
 *
 * KULLANICI ŞİKÂYETİ (2026-10-16): "kendim nasıl çevrimdışı olabiliyorum?"
 * İki hata birdendi:
 *   1. Yerel kural "30 sn etkileşim yoksa çevrimdışı" idi → uzun mesajı okurken
 *      veya videoyu izlerken kendi noktam kırmızıya düşüyordu. Artık çevrimdışı
 *      olmanın TEK yolu sekmenin gizlenmesi/kapanmasıdır (WhatsApp Web modeli).
 *   2. Sunucu senkronu 5 dk'ydı, `presenceOf` tazelik penceresi 60 sn (bkz.
 *      `chat-peers.ts: PRESENCE_ONLINE_MS`) → nabız iki pencere arasında
 *      kaçıyor, HERKES herkese çevrimdışı görünüyordu. Nabız artık pencereden
 *      küçük (`SYNC_INTERVAL_MS`).
 *
 * Bu sayede:
 *   - 2 sn'de bir `/api/chat/users` çekmek YOK (liste POLL_MS kaldırıldı)
 *   - Yeşil nokta anında tepki verir (ağ gecikmesi yok)
 */
/*
  Nabız aralığı `presenceOf` tazelik penceresinden (60 sn) KÜÇÜK olmalı: bir
  nabız kaybolsa (ağ/sleep) bile karşı taraf beni çevrimiçi görmeye devam eder.
  30 sn = pencere/2 → tek kayıp toleransı, sunucuya dakikada 2 küçük güncelleme.
*/
const SYNC_INTERVAL_MS = 30_000

interface LocalPresenceState {
  /** SEKME GÖRÜNÜR mü? (2026-10-16: "son etkileşim zamanı" DEĞİL.) */
  isOnline: boolean
  presenceState: PresenceState | null
}

/** Sohbete yazılacak kişi (admin için liste). */
interface Peer {
  id: string
  username: string
  fullName: string | null
  nickname: string | null
  avatarUrl: string | null
  /** ÇEVRİMİÇİ NABZI (2026-10-11) — `/api/chat/users` döner. */
  lastSeenAt?: string | null
  presenceState?: string | null
  /** Admin işaretleri (sağ tık menüsü bunları aç/kapatır). */
  favorite?: boolean
  important?: boolean
  blocked?: boolean
  /** Son mesaj zamanı (sohbetin `updated_at`i) — "konuştumuz zamana göre". */
  lastMessageAt?: string | null
  /** Sessiz: `chat_participants.muted_until` (gelecekteyse sessiz). */
  mutedUntil?: string | null
  /**
   * Kişiyle bir SOBET var mı (2026-10-13). Yoksa yönetici listesinde satır
   * çıkmaz: kayıt olup hiç yazmayan kişi paneli doldurmaz (kullanıcı isteği).
   */
  hasConversation?: boolean
  /** Liste öğesindeki son mesaj özeti. */
  preview?: string | null
  previewSender?: string | null
  /**
   * LİSTE ROZETİ + TİK (2026-10-13 kullanıcı isteği): bana gelen okunmamış
   * mesaj sayısı ve son mesajın BENİM olup olmadığı/durumu (ticks).
   * Sunucu `/api/chat` listesinden gelir (`chat-db.conversationMeta`).
   */
  unread?: number
  /** Son mesaj: benim mi + teslim/okundu (tik göstergesi). */
  lastMessage?: { mine: boolean, delivered: boolean, read: boolean, at: string } | null
  /** Sohbet türü — "Gruplar" süzgeci kullanır ('direct' | 'group'). */
  kind?: string | null
}

/** `GET /api/chat`nin sohbet satırından ihtiyaç duyduğumuz alanlar. */
interface ConversationLite {
  id: string
  direct_key: string | null
  important: boolean | null
  favorite: boolean | null
  blocked: boolean | null
  updated_at: string | null
  last_preview: string | null
  last_sender_name: string | null
  /** Sohbet türü ('direct' | 'group') — "Gruplar" süzgeci. */
  kind?: string | null
  /** Okunmamış sayısı (sunucu türetir). */
  unread?: number
  /** Sessiz: `chat_participants.muted_until`. */
  mutedUntil?: string | null
  /** Son mesajın damgaları (sunucu türetir). */
  last?: {
    sender_id: string
    delivered_at: string | null
    read_at: string | null
    created_at: string
  } | null
}

/**
 * Liste için türetilmiş satır: ad + nokta rengi + "yazıyor" (saf `lib/chat-peers`).
 * Nokta artık SARI OLMAZ (2026-10-12): yeşil/kırmızı çevrimiçi durumu kalır,
 * "yazıyor" bilgisi `typing` bayrağıyla mavi METİN olarak gösterilir.
 */
interface PeerRow extends Peer {
  name: string
  presence: Presence
  typing: boolean
}

/**
 * Oturumu İSTEMCİDE çözeriz (2026-10-11 ölçümü): root layout `force-static`
 * olduğu için sunucuda `cookies()` boş dönüyor ve `getSessionUser()` her zaman
 * null kalıyordu — giriş yapmış kullanıcı bile "giriş yap" ekranını görüyordu.
 * `/api/admin/session` route handler'ı layout DIŞINDA olduğu için aynı çerezi
 * doğru okuyor. Güvenlik aynı: her API çağrısı yine yetkiyi sunucuda doğrular.
 */
export function Chat({ nextPath = '/chat', onConfigUpdate, onMessageClick }: ChatProps) {
  const { t, locale } = useT()
  const [messages, setMessages] = useState<UiMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const [replyTo, setReplyTo] = useState<ChatMessageRow | null>(null)
  /**
   * AÇIK BAĞLAM MENÜSÜ — aynı anda TEK menü (2026-10-13 kullanıcı isteği:
   * "aynı anda tek menü açık olsun"). Hedef + imleç noktası birlikte tutulur;
   * kişi menüsü eskiden `menuPeer`, mesaj menüsü `menuMsg` idi ve ikisi ayrı
   * state olduğu için çakışabiliyorlardı.
   */
  const [menu, setMenu] = useState<
    | { kind: 'peer', peer: Peer, x: number, y: number }
    | { kind: 'message', message: ChatMessageRow, x: number, y: number }
    /** Boş alana sağ tık / uzun basma (2026-10-13 kullanıcı istekte). */
    | { kind: 'area', x: number, y: number }
    /** Kişi listesi süzgeci (filtre düğmesi — arama kutusunun yanı). */
    | { kind: 'filter', x: number, y: number }
    /** Yan panel üç nokta menüsü (2026-11-08, WhatsApp tarzı). */
    | { kind: 'panel', x: number, y: number }
    | null
  >(null)
  /** "İlet" (forward) hedef seçimi — mesajı başka bir kişiye gönderir. */
  const [forwardMsg, setForwardMsg] = useState<ChatMessageRow | null>(null)
  const [infoMsgId, setInfoMsgId] = useState<string | null>(null)
  const [confirmMsg, setConfirmMsg] = useState<ChatMessageRow | null>(null)
  /** Kaydırılıp vurgulanan mesaj (aynı mesaja tekrar tıklanınca animasyon yeniden oynar). */
  const [flashId, setFlashId] = useState<string | null>(null)
  /** Kısa bilgi bildirimi ("Mesaj bulunamadı" vb.) — kendiliğinden kaybolur. */
  const [notice, setNotice] = useState<string | null>(null)
  /** Açık tepki şeridi / emoji seçici / "kim tepki verdi" paneli (2026-11-08). */
  const [stripFor, setStripFor] = useState<string | null>(null)
  const [pickerFor, setPickerFor] = useState<string | null>(null)
  const [reactionPanelFor, setReactionPanelFor] = useState<string | null>(null)
  /** Görsel/video lightbox: tıklanan medya — tüm medya listesi + sıradaki indeks. */
  const [gallery, setGallery] = useState<{ items: LightboxItem[], index: number } | null>(null)
  /** Sabit REAKSİYON diyaloğu (2026-11-08): "Sabitlemenizin ne kadar süre kalacağını seçin". */
  const [pinDialog, setPinDialog] = useState<UiMessage | null>(null)
  const [pinChoice, setPinChoice] = useState<'24h' | '7d' | 'forever' | 'custom'>('7d')
  const [pinCustomAt, setPinCustomAt] = useState('')
  /** Bildirim sessizliği diyaloğu (2026-11-08): pin'le aynı süre seçici. */
  const [mutePeer, setMutePeer] = useState<Peer | null>(null)
  const [muteChoice, setMuteChoice] = useState<'24h' | '7d' | 'forever' | 'custom'>('7d')
  const [muteCustomAt, setMuteCustomAt] = useState('')
  /** Üstteki sabit paneli: sıradaki sabitin indeksi + arama listesi. */
  const [pinCursor, setPinCursor] = useState(0)
  const [pinListOpen, setPinListOpen] = useState(false)
  const [pinSearchQ, setPinSearchQ] = useState('')
  /** Üstteki sabit şeridine sağ tık → "Sabitlemeyi kaldır / Süresini değiştir". */
  const [pinBannerMenu, setPinBannerMenu] = useState<{ x: number, y: number } | null>(null)
  /** Admin'in "Sohbeti Temizle"den döndürebilmesi için geri-al damgası. */
  const [undoClear, setUndoClear] = useState<{ conversationId: string } | null>(null)
  /** Anketler: messageId -> anket verisi. `user_vote` seçilen seçenek indeksi veya null. */
  const [polls, setPolls] = useState<Record<string, {
    question: string
    options: { text: string, votes: number, voter_ids: string[] }[]
    is_closed: boolean
    user_vote: number | null
  }>>({})
  /** Anket oluşturma taslağı: null → yok, dolu → form açık. */
  const [pollDraft, setPollDraft] = useState<{
    question: string
    options: string[]
    multiple: boolean
  } | null>(null)
  // "Ekle" (kâğıt kıskacı) düğmesinin açılır menüsü: Dosya / Klasör / Anket…
  const [attachMenuOpen, setAttachMenuOpen] = useState(false)
  // "Açık konu (thread)" state'i KALDIRILDI (2026-11-08, kullanıcı isteği).

  /** Lightbox aç: tüm medya (görsel+video) — tıklanandan başla. */
  function openGallery(clicked: UiMessage) {
    const avatarOf = (senderId: string) =>
  // eslint-disable-next-line ts/no-use-before-define -- fonksiyon bildirimi; çağrı yalnızca render sonrası (olay anında) olduğu için TDZ riski yok
      (peers ?? []).find(p => p.id === senderId)?.avatarUrl ?? null
    const items: LightboxItem[] = []
    for (const m of messages) {
      const k = mediaKindOf(m)
      if (k !== 'image' && k !== 'video') {
        continue
      }
      if (m.file_url) {
        items.push({
          id: m.id,
          url: m.file_url,
          kind: k,
          fileName: m.file_name,
          createdAt: m.created_at,
          senderName: m.sender_name,
          senderAvatarUrl: avatarOf(m.sender_id),
          pinned: m.pinned,
        })
      }
    }
    if (items.length === 0) {
      if (clicked.file_url) {
        items.push({
          id: clicked.id,
          url: clicked.file_url,
          kind: 'image',
          fileName: clicked.file_name,
          createdAt: clicked.created_at,
          senderName: clicked.sender_name,
          senderAvatarUrl: avatarOf(clicked.sender_id),
          pinned: clicked.pinned,
        })
      }
    }
    const clickedIndex = items.findIndex(i => i.id === clicked.id)
    setGallery({ items, index: clickedIndex >= 0 ? clickedIndex : 0 })
  }

  /** Galeri kapat. */
  function closeGallery() {
    setGallery(null)
  }
  /**
   * Mesaj listesi görünür alanda mı (2026-10-16): "okundu" damgası YALNIZCA
   * sekme görünürken VE liste ekrandayken atılır — arka plandaki sekme
   * kendiliğinden okundu saymaz (kullanıcı isteği).
   */
  const [listVisible, setListVisible] = useState(false)
  const [showEmoji, setShowEmoji] = useState(false)
  /**
   * Liste paneli GENİŞ mi (2026-10-13 kullanıcı isteği: "hamburger tam ekran
   * liste açmasın, paneli genişletip daraltsın").
   *   · GENİŞ (`true`)   → arama kutusu + avatar + isim + son mesaj.
   *   · KOMPAKT (`false`) → yalnız avatar sütunu (72px), isim/son mesaj/arama gizli.
   * Panel HİÇBİR genişlikte kaybolmaz; iki panel her zaman yan yana durur.
   * Seçim `localStorage`ta hatırlanır; <480px'de varsayılan KOMPAKT.
   */
  const [panelOpen, setPanelOpen] = useState(true)
  /**
   * Panel, DAR ekrana geçildiği için kendiliğinden katlandı mı? (2026-10-30)
   * Otomatik katlanma kullanıcı tercihi DEĞİLDİR: `localStorage`a yazılmaz,
   * yoksa masaüstünde sayfa yenileyen kullanıcı listeyi kompakt bulurdu.
   * Kullanıcı düğmeye basınca bayrak düşer ve seçim yeniden kalıcı olur.
   */
  const autoCollapsed = useRef(false)
  const [session, setSession] = useState<{ id: string, role?: string } | null>(null)
  const [sessionChecked, setSessionChecked] = useState(false)
  const [schemaMissing, setSchemaMissing] = useState(false)
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [peers, setPeers] = useState<Peer[] | null>(null)
  /**
   * Kişi listesi SORGUSU çöktüğünde true. `peers === null` tek başına hem
   * "yükleniyor" hem "başarısız" demek olduğu için, ayrılmazsa istek hata
   * verdiğinde ekran sonsuza kadar "Sohbet yükleniyor…" gösteriyordu.
   */
  const [peersError, setPeersError] = useState(false)
  /**
   * `/api/chat/users`ın döndüğü SOHBET KİMLİĞİ (2026-10-12). `/login` ile giren
   * site sahibinin id'si `admin:<ad>`tır ama sohbetler profil uuid'i ile
   * tutulur. `direct_key` ayrıştırması ve "bu mesaj benim mi?" kararı bu
   * kimlikle yapılmalı; sunucu ile istemci aynı kişiyi "karşı taraf" saysın
   * diye sunucudan gelir.
   */
  const [selfId, setSelfId] = useState('')
  /** Sağ panelde açık olan kişi (panelde vurgu + başlıkta ad/durum). */
  const [activePeerId, setActivePeerId] = useState<string | null>(null)
  /** Yan panel genişliği (px). */
  const [panelWidth, setPanelWidth] = useState(CHAT_PANEL_DEFAULT)
  const [peerQuery, setPeerQuery] = useState('')
  const [profilePeer, setProfilePeer] = useState<Peer | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  /** Klasör seçimi (webkitdirectory): içindeki dosyalar sırayla mesaj olur. */
  const folderRef = useRef<HTMLInputElement>(null)
  /** "Ekle" açılır menüsünün dışa tıklama yakalayıcısı. */
  const attachMenuRef = useRef<HTMLDivElement>(null)
  /**
   * Aşama dosyaları (2026-11-08, kullanıcı isteği): bırakılan/eklenen
   * dosyalar WhatsApp gibi ÖNCE mesajın üstünde çip olarak durur; gönder
   * basınca altyazısıyla birlikte gider, kişi ✕ ile çıkarabilir.
   */
  const [staged, setStaged] = useState<Array<{ id: string, file: File }>>([])
  const stagedSeqRef = useRef(0)
  /** Sürükle-bırak overlay'i: dosyalar karta sürüklenince gösterilir. */
  const [dropActive, setDropActive] = useState(false)
  const queueFiles = (files: File[]) => {
    setStaged((prev) => {
      const next = [...prev]
      for (const file of files) {
        if (next.length >= 20) {
          break
        }
        stagedSeqRef.current += 1
        next.push({ id: `staged-${stagedSeqRef.current}-${file.name}`, file })
      }
      return next
    })
  }

  // "Ekle" menüsüne dışarı tıklayınca kapanır.
  useEffect(() => {
    if (!attachMenuOpen) {
      return
    }
    const onDoc = (e: MouseEvent) => {
      if (!attachMenuRef.current?.contains(e.target as Node)) {
        setAttachMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [attachMenuOpen])
  /** Metin alanı: emoji imlecin olduğu yere eklensin diye ref gerekir. */
  const inputRef = useRef<HTMLInputElement>(null)
  /** Mesaj alanı: kaydırma BURADA olur, sayfada değil (bkz. `scrollToBottom`). */
  const listRef = useRef<HTMLDivElement>(null)
  /** Sohbeti sessizde mi — `showBrowserNotification` denetimi `load()` içinde. */
  const mutedRef = useRef(false)
  /** Kişi arama alanı — "Kişi ara" menü maddesi odağı buraya verir. */
  const searchRef = useRef<HTMLInputElement>(null)
  /** Liste saatini tazele — nokta rengi yeni veri gelmeden de eskisin (yeşil → kırmızı). */
  const [now, setNow] = useState(() => Date.now())

  const isAuthenticated = !!session
  const currentUserId = session?.id ?? ''
  const isAdmin = session?.role === 'admin'
  /** Sohbet kimliğim: "bu mesaj benim mi?" kararı sunucunun verdiği kimlikle verilir. */
  const myId = selfId || currentUserId

  /*
    BİLDİRİM (2026-10-30, kullanıcı: "bildirim açma olayı olsun, chat kısmına
    girince istesin"). Sohbete girildiğinde izin henüz verilmemişse üstte
    ince bir şerit çıkar; "Aç" `Notification.requestPermission()` çağırır.
    Yeni mesaj geldiğinde (yoklama) ve sekme arka plandaysa masaüstü
    bildirimi gösterilir — sohbeti okuyan kullanıcıya gürültü yapılmaz.
  */
  const [notifyBanner, setNotifyBanner] = useState(false)
  const seenIdsRef = useRef<Set<string>>(new Set())

  useEffect(() => {
    const sync = () => {
      setNotifyBanner(notifyState() === 'default' && !notifyDismissed())
    }
    sync()
    // Kullanıcı izni tarayıcı ayarlarından da değiştirebilir.
    document.addEventListener('visibilitychange', sync)
    return () => document.removeEventListener('visibilitychange', sync)
  }, [])

  async function enableNotifications() {
    const result = await askNotify()
    if (result !== 'granted')
      dismissNotify()
    setNotifyBanner(result === 'default')
  }

  function hideNotifyBanner() {
    dismissNotify()
    setNotifyBanner(false)
  }

  /**
   * CANLI yanıt hedefi: seçim anındaki kopya yerine LİSTEDEKİ güncel satır
   * tercih edilir. Böylece yanıtlanan mesaj sonradan silinirse alıntı bloğu ve
   * giriş üstü önizleme anında "Bu mesaj silindi"ye döner (kullanıcı isteği);
   * satır listeden tamamen düşmüşse seçim anındaki kopya kullanılır.
   */
  const replyLive = useMemo(
    () => (replyTo ? messages.find(m => m.id === replyTo.id) ?? replyTo : null),
    [replyTo, messages],
  )

  /** Yanıtlamayı başlat (menü, hover oku, kaydırma — hepsi buraya gelir). */
  const startReply = useCallback((messageId: string) => {
    const row = messages.find(m => m.id === messageId)
    if (!row || row.deleted_for_all) {
      return
    }
    setReplyTo(row)
    // Kullanıcı isteği: "seçince giriş alanına otomatik odaklan".
    inputRef.current?.focus()
  }, [messages])
  const swipeReply = useSwipeReply(startReply)

  /**
   * KİŞİ LİSTESİ (2026-10-11; yetki 2026-10-12'de herkese açıldı).
   *
   * Sunucu listeyi YETKİYE GÖRE süzer: site sahibi/admin → kayıtlı herkes
   * (admin'in KENDİSİ DAHİL; kendini filtreleme yok), normal kullanıcı → yalnız
   * konuşabileceği kişiler (site sahibi). "Erişim yok" ekranı bu yüzden imkânsız:
   * konuşulamayacak kişi listeye hiç girmez.
   *
   *  · Her satıra sohbet işaretleri (sabitlenen/favori/engelli + son mesaj)
   *    ve çevrimiçi nabzı işlenir; nokta rengi `lib/chat-peers`te hesaplanır.
   *  · Sohbetler `direct_key = "<id>|<id>"` ile kişiye bağlanır: BENİM
   *    sohbet kimliğim (`chatId`) olmayan parça karşı tarafın id'sidir.
   */
  const loadPeers = useCallback(async (): Promise<Peer[] | null> => {
    const [usersRes, convsRes] = await Promise.all([
      fetch('/api/chat/users'),
      fetch('/api/chat'),
    ])
    const usersJson = await usersRes.json().catch(() => null)
    const convsJson = await convsRes.json().catch(() => null)
    if (convsJson?.code === 'CHAT_SCHEMA_MISSING') {
      // Tablolar yok → liste sorgusu da anlamsız; boş liste yerine tek ve
      // anlaşılır "şema gerekli" ekranı gösterilir.
      setSchemaMissing(true)
    }
    if (!usersJson?.success) {
      // Liste gelmedi: hata panelin İÇİNDE gösterilir, tam ekran "erişim yok"
      // ekranı yok (kullanıcı isteği 2026-10-12).
      return null
    }
    // Sohbet kimliği sunucudan gelir (`admin:<ad>` → profil uuid'i).
    const me = typeof usersJson.chatId === 'string' && usersJson.chatId
      ? usersJson.chatId
      : currentUserId
    setSelfId(me)
    const convs: ConversationLite[] = convsJson?.success ? convsJson.conversations ?? [] : []
    const byPeer = new Map<string, ConversationLite>()
    for (const c of convs) {
      const parts = (c.direct_key ?? '').split('|')
      /*
        KENDİMLE SOHBET (`<id>|<id>`, 2026-10-16 kullanıcı şikâyeti): "karşı
        taraf" YOKTUR — satırın sahibi yine benim. Eski `.find(part !== me)`
        hiçbir şey bulamıyordu → kendi sohbetim liste verisini (önizleme,
        rozet, son mesaj tiki) tamamen kaybediyordu.
      */
      const other = parts.find(part => part !== me) ?? (parts[0] === me ? me : undefined)
      if (other) {
        byPeer.set(other, c)
      }
    }
    return ((usersJson.users ?? []) as Peer[]).map((u): Peer => {
      const conv = byPeer.get(u.id)
      return {
        ...u,
        hasConversation: !!conv,
        important: !!conv?.important,
        favorite: !!conv?.favorite,
        blocked: !!conv?.blocked,
        kind: conv?.kind ?? null,
        lastMessageAt: conv?.updated_at ?? null,
        mutedUntil: conv?.mutedUntil ?? null,
        preview: conv?.last_preview ?? null,
        previewSender: conv?.last_sender_name ?? null,
        // Rozet + tik (sunucu türetir; `me` ile karşılaştırma BURADA).
        unread: conv?.unread ?? 0,
        lastMessage: conv?.last
          ? {
              mine: conv.last.sender_id === me,
              delivered: !!conv.last.delivered_at,
              read: !!conv.last.read_at,
              at: conv.last.created_at,
            }
          : null,
      }
    })
  }, [currentUserId])

  /*
    YEREL ÇEVRIMİÇİ DURUMU + YAZMA SİNYALİ (local-first, 2026-10-14; kural 2026-10-16'da değişti).

    Çevrimiçi kararı SEKME GÖRÜNÜRLÜĞÜNE bağlıdır (zaman aşımına DEĞİL): sekme
    gizlenince/kapanınca çevrimdışı, görünür olduğu sürece çevrimiçi.
    Sunucuya senkron:
      - Sekme kapanırken / gizlenirken (pagehide, visibilitychange)
      - Periyodik nabız (`SYNC_INTERVAL_MS`) — "hala buradayım"
      - Yazma durumu değiştiğinde (typing start/stop)
  */
  const localPresenceRef = useRef<LocalPresenceState>({
    // Gerçek değer bağlanma (mount) anında `document.hidden`dan yazılır.
    isOnline: true,
    presenceState: null,
  })
  const syncTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  /** Yazma sinyalinin son gönderim zamanı (throttle) + "durdu" zamanlayıcısı. */
  const typingSentAt = useRef(0)
  const typingIdle = useRef<ReturnType<typeof setTimeout> | null>(null)

  /**
   * Etkileşim (tıklama/tuş/dokunma/kaydırma/odak): yerel durumu "çevrimiçi"ye
   * tazeler. Çevrimdışı kararı artık buraya BAĞLI DEĞİL — sekme gizlenmedikçe
   * çevrimdışı olunmaz (kullanıcı şikâyeti 2026-10-16: "kendim nasıl çevrimdışı
   * olabiliyorum?"; eski 30 sn'lik hareketsizlik kuralı, uzun bir mesajı okurken
   * kendi noktamı kırmızıya düşürüyordu).
   */
  const markActivity = useCallback(() => {
    localPresenceRef.current.isOnline = true
  }, [])

  /** Sunucuya presence gönder (debounced, sadece durum değişiminde veya periyodik). */
  const syncToServer = useCallback(async (force = false) => {
    const state = localPresenceRef.current.presenceState
    // Sadece typing/uploading/recording durumunda veya zorunluysa gönder
    if (!force && state === null) {
      return
    }
    try {
      await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'presence', state, force }),
      })
    }
 catch {
      // sessizce başarısız olsun, yerel durum bozulmasın
    }
  }, [])

  /**
   * Kişi listesi için yerel presence hesaplama (diğer kullanıcılar için).
   * Sunucudan gelen `lastSeenAt` + `presenceState` kullanır, ama yerel `now`
   * ile karşılaştırır. Bu sayede liste tazelenmesede nokta rengi anında güncellenir.
   */
  const computePeerPresence = useCallback((peer: Peer, now: number): Presence => {
    // KENDİMİZ: yerel hesaplama (sekme odaklı + aktivite)
    if (peer.id === selfId) {
      return localPresenceRef.current.isOnline ? 'online' : 'offline'
    }
    // BAŞKALARI: sunucudan gelen lastSeenAt ile hesapla (chat-peers mantığı)
    return presenceOf(peer.lastSeenAt, now)
  }, [selfId])

  /**
   * Kişi listesi için yazma durumu (diğer kullanıcılar için).
   * Kendi yazma durumumuz yerel `signalTyping`/`stopTyping` ile yönetiliyor.
   */
  const computePeerTyping = useCallback((peer: Peer, now: number): boolean => {
    if (peer.id === selfId) {
      return localPresenceRef.current.presenceState === 'typing'
    }
    return isTyping(peer.lastSeenAt, peer.presenceState, now)
  }, [selfId])

  /** Periyodik sunucu senkronu başlat. */
  const startSyncTimer = useCallback(() => {
    if (syncTimerRef.current) {
      return
    }
    syncTimerRef.current = setInterval(() => {
      syncToServer(true) // force=true: "hala buradayım" (presenceState=null olsa bile last_seen_at tazelensin)
    }, SYNC_INTERVAL_MS)
  }, [syncToServer])

  /** Periyodik sunucu senkronunu durdur. */
  const stopSyncTimer = useCallback(() => {
    if (syncTimerRef.current) {
      clearInterval(syncTimerRef.current)
      syncTimerRef.current = null
    }
  }, [])

  /** Sayfa görünürlüğü / odak değiştiğinde yerel durumu güncelle. */
  useEffect(() => {
    const onVisibilityChange = () => {
      if (document.hidden) {
        localPresenceRef.current.isOnline = false
        localPresenceRef.current.presenceState = null
        syncToServer(true) // offline oluyoruz, sunucuyu bilgilendir
        stopSyncTimer()
      }
      else {
        markActivity()
        // Nokta ANINDA yeşile dönsün: `isOnline` bir ref, tek başına render
        // tetiklemez (10 sn'lik saat tiki düzeltirdi).
        setNow(Date.now())
        startSyncTimer()
      }
    }
    const onPageHide = () => {
      localPresenceRef.current.isOnline = false
      localPresenceRef.current.presenceState = null
      // sendBeacon ile güvence altına al (sayfa kapanırken fetch iptal olabilir)
      navigator.sendBeacon('/api/chat', new Blob([JSON.stringify({ action: 'presence', state: null })], { type: 'application/json' }))
      stopSyncTimer()
    }

    document.addEventListener('visibilitychange', onVisibilityChange)
    window.addEventListener('pagehide', onPageHide)

    /*
      BAŞLANGIÇ: sekme görünürse çevrimiçi + nabız açık, gizliyse çevrimdışı ve
      nabız KAPALI (arka planda açılan sekme kimseyi "çevrimiçi" göstermesin).
      Görünürlüğü izleyen etkileşim dinleyicileri KALDIRILDI (2026-10-16):
      çevrimiçi/çevrimdışı kararı yalnız sekme görünürlüğüdür, tıklama değil —
      dinleyiciler yalnızca her kaydırmada boşa çalışıyordu.
    */
    localPresenceRef.current.isOnline = !document.hidden
    if (!document.hidden) {
      // Bağlanır bağlanmaz "buradayım": ilk periyodik nabız 30 sn sonra gelir,
      // o boşlukta liste beni çevrimdışı gösterirdi.
      void syncToServer(true)
      startSyncTimer()
    }

    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange)
      window.removeEventListener('pagehide', onPageHide)
      stopSyncTimer()
    }
  }, [markActivity, syncToServer, startSyncTimer, stopSyncTimer])

  /**
   * Yazı yazıldı: sinyal en fazla `TYPING_THROTTLE_MS`'de bir gider (throttle),
   * yazma durunca `TYPING_IDLE_MS` sonra "durdu" bildirilir (debounce).
   * Yerel state'e yaz + sunucuya senkron et.
   */
  const signalTyping = useCallback(() => {
    const at = Date.now()
    markActivity()
    if (at - typingSentAt.current >= TYPING_THROTTLE_MS) {
      typingSentAt.current = at
      localPresenceRef.current.presenceState = 'typing'
      syncToServer()
    }
    if (typingIdle.current) {
      clearTimeout(typingIdle.current)
    }
    typingIdle.current = setTimeout(() => {
      typingIdle.current = null
      typingSentAt.current = 0
      localPresenceRef.current.presenceState = null
      syncToServer()
    }, TYPING_IDLE_MS)
  }, [markActivity, syncToServer])

  /** Yazma bitti (mesaj gönderildi / sohbet kapandı): durum HEMEN temizlenir. */
  const stopTyping = useCallback(() => {
    if (typingIdle.current) {
      clearTimeout(typingIdle.current)
      typingIdle.current = null
    }
    typingSentAt.current = 0
    localPresenceRef.current.presenceState = null
    syncToServer()
  }, [syncToServer])

  /*
    OTURUM İSTEMCİDE çözülür (`force-static` layout tuzağı — 2026-10-11).
    Kime yazılacağı BURADA seçilmez: kişi listesi effect'i hem listeyi getirir
    hem (tek kişi varsa) sohbeti kendiliğinden açar. Eski "önce seç, sonra aç"
    iki adımlı akış kullanıcı isteğiyle kaldırıldı (2026-10-12).
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

  /**
   * Liste saati: diğer kullanıcıların `lastSeenAt`inden presence hesaplamak için.
   * Yerel first: kendi durumumuz `localPresenceRef`'den gelir (anlık).
   * Başkaları için sunucudan gelen `lastSeenAt` + yerel `now` ile hesaplanır.
   * 2 sn yerine 10 sn: yazma durumu (typing) yine de anlık görünür çünkü
   * sunucu `presenceState: 'typing'` + `lastSeenAt` her yazışta güncellenir.
   */
  const LIST_CLOCK_MS = 10_000
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), LIST_CLOCK_MS)
    return () => clearInterval(id)
  }, [])

  /*
    KİŞİ LİSTESİ: giriş yapmış HERKES için ilk yükleme + periyodik tazeleme.
    Local-first: kendi çevrimiçi durumumuz yerel, başkaları sunucudan.
    Tazeleme aralığı 30 sn (eskiden 2 sn): yeni sohbet, son mesaj özeti,
    karşı tarafın lastSeenAt/presenceState için yeterli. Yazma durumu
    yine anlık görünür çünkü sunucu her keystroke'ta presence günceller.
  */
  const PEERS_REFRESH_MS = 30_000
  useEffect(() => {
    if (!isAuthenticated) {
      return
    }
    let cancelled = false
    const run = async () => {
      const list = await loadPeers()
      if (!cancelled) {
        setPeers(list)
        setPeersError(list === null)
      }
    }
    void run()
    const id = setInterval(run, PEERS_REFRESH_MS)
    return () => {
      cancelled = true
      clearInterval(id)
    }
  }, [isAuthenticated, loadPeers])

  /**
   * Kişi listesi HİYERARŞİSİ: sabitlenen → YAZAN (şu an bana yazıyor) →
   * konuşulanlar (en yeni önce) → favoriler → çevrimiçiler → diğerleri →
   * engellenenler. Sıralama mantığı `lib/chat-peers.ts`te (saf + testli).
   *
   * Local-first presence:
   *   - KENDİMİZ: `localPresenceRef` (sekme odak + aktivite) → anlık, ağsız
   *   - BAŞKALARI: sunucudan `lastSeenAt` + `presenceState` + yerel `now`
   */
  const orderedPeers = useMemo(() => {
    const you = t('chat.you')
    return sortPeers(
      (peers ?? []).map((p): PeerRow => ({
        ...p,
        name: p.id === selfId
          ? `${p.fullName || p.username} (${you})`
          : p.nickname || p.fullName || p.username,
        presence: computePeerPresence(p, now),
        typing: computePeerTyping(p, now),
      })),
      locale,
    )
  }, [peers, now, locale, selfId, t, computePeerPresence, computePeerTyping])

  /**
   * UZUN BASMA (mobil, 2026-10-13 kullanıcı isteği: "Mobilde sağ tık yerine
   * uzun basma aynı menüyü açsın"). Tek kapsayıcıya takılır — satırlar
   * `.map()` ile üretildiği için hook satır başına çağrılamaz; dokunulan
   * öğeden `data-*` ile hangi satır olduğu bulunur. Sağ tık (masaüstü) yolunu
   * etkilemez: `pointerType === 'mouse'` erken çıkar.
   */
  const peerLongPress = useLongPress((x, y, target) => {
    const id = target?.closest<HTMLElement>('[data-peer-id]')?.dataset.peerId
    if (id) {
      // Satır üstünde: kişi menüsü (sağ tık gibi, yalnız yöneticiye açık).
      // Boş alan menüsü satırın üstünde AÇILMAZ — kullanıcı satırı hedefledi.
      const peer = (peers ?? []).find(p => p.id === id)
      if (peer && isAdmin) {
        setMenu({ kind: 'peer', peer, x, y })
      }
      return
    }
    // Boş alan (liste zemini / başlık): "mantıklı" maddeler (kişi ara, yenile…).
    setMenu(areaMenuAt(x, y))
  })
  const messageLongPress = useLongPress((x, y, target) => {
    const id = target?.closest<HTMLElement>('[data-message-id]')?.dataset.messageId
    const message = messages.find(m => m.id === id)
    if (message) {
      setMenu({ kind: 'message', message, x, y })
      return
    }
    setMenu(areaMenuAt(x, y))
  })

  /**
   * YAN PANEL DÜĞMESİ (2026-10-13 kullanıcı isteği: "hamburger listeyi
   * genişletip daraltsın, tam ekran liste açmasın"). Tek davranış, her genişlikte
   * aynı: GENİŞ ↔ KOMPAKT. Panel kaybolmaz, sohbet alanı yerinde kalır.
   */
  function togglePanel() {
    // Kullanıcı seçimi: otomatik katlanma bayrağı düşer, tercih kalıcılaşır.
    autoCollapsed.current = false
    setPanelOpen(v => !v)
  }

  /** "Kişi ara": panel KOMPAKT ise genişletilir ve arama alanı odaklanır. */
  function focusSearch() {
    autoCollapsed.current = false
    setPanelOpen(true)
    requestAnimationFrame(() => searchRef.current?.focus())
  }

  /**
   * Boş alana sağ tık → menü İMLECİN konumunda (kişi/mesaj menüleriyle aynı
   * yüzey). Satır ve balonların kendi `onContextMenu`'sü olayı durdurur.
   */
  function onAreaContextMenu(e: ReactMouseEvent<HTMLElement>) {
    e.preventDefault()
    setMenu({ kind: 'area', ...menuPoint(e) })
  }

  /**
   * KAYDIRMA MESAJ ALANINDA KALIR — sayfa DEĞİL (2026-10-13 kullanıcı isteği:
   * "sohbet sayfasında kayma var, düzelt; [kaydırma] grubun içinde olsun ama o
   * sayfada olmasın"). Öncesinde `endRef.scrollIntoView` kullanılıyordu:
   * `scrollIntoView` belge kaydırılabilirse ATALARIN HEPSİNİ kaydırır → yeni
   * mesaj gelince sayfa da kayıyordu.
   */
  function scrollToBottom(smooth = false) {
    const box = listRef.current
    if (!box) {
      return
    }
    box.scrollTo({ top: box.scrollHeight, behavior: smooth ? 'smooth' : 'auto' })
  }

  /**
   * Yanıtlanan mesaja git — kaydırma yine YALNIZ mesaj alanında.
   *
   * `scrollIntoView` BİLEREK kullanılmaz: belge kaydırılabilirse ATALARIN
   * HEPSİNİ kaydırır (bkz. `scrollToBottom` notu, 2026-10-13 ölçümü) ve sayfa
   * zıplar. Onun yerine hedef, kapsayıcı içinde ORTALANIR — istenen davranış
   * (`block: 'center'`) aynı, yan etkisi yok.
   *
   * Varışta mesaj ~2 sn mavi tona parlar (`msg-flash`, CSS) ve bildirim
   * kaybolur. Mesaj listede yoksa "Mesaj bulunamadı" bildirimi gösterilir.
   */
  function jumpToMessage(id: string) {
    const el = document.getElementById(`msg-${id}`)
    const box = listRef.current
    if (!el || !box) {
      setNotice(t('chat.replyNotFound'))
      return
    }
    const delta = el.getBoundingClientRect().top - box.getBoundingClientRect().top
    box.scrollTo({
      top: box.scrollTop + delta - (box.clientHeight - el.clientHeight) / 2,
      behavior: 'smooth',
    })
    // Aynı mesaja tekrar tıklanınca animasyon YENİDEN oynasın: önce temizle.
    setFlashId(null)
    requestAnimationFrame(() => setFlashId(id))
  }

  /* SABİTLE (2026-11-08, kullanıcı isteği): WhatsApp tarzı. Sabitler üstte
     şerit olur, tıklayınca ilgili mesaja gider ve sıradaki sabit öne geçer;
     ok açılır menüde arama ile seçilir. Süre dolan sabit listede görünmez
     (sunucu `pinned_until`'e bakar). */
  const pinned = messages.filter(m => m.pinned)
  const infoMsg = infoMsgId ? messages.find(m => m.id === infoMsgId) ?? null : null
  /* OKUNMAMIŞLAR (2026-11-08): başkasından gelen, `read_at` damgası OLMAYAN
     mesajlar — WhatsApp'taki "N okunmamış mesaj" bölücüsü ile aynı mantık. */
  const unreadMessages = messages.filter(m => m.sender_id !== myId && !m.read_at)
  const pinActive = pinned.length > 0
    ? pinned[((pinCursor % pinned.length) + pinned.length) % pinned.length]
    : null
  const pinFiltered = pinned.filter(m =>
    (m.text ?? '').toLowerCase().includes(pinSearchQ.trim().toLowerCase()),
  )

  function requestPin(target: UiMessage) {
    if (target.pinned) {
  // eslint-disable-next-line ts/no-use-before-define -- fonksiyon bildirimi; çağrı yalnızca render sonrası (olay anında) olduğu için TDZ riski yok
      void act('pin', { messageId: target.id, pinned: false }).then(() => load())
      return
    }
    setPinChoice('7d')
    setPinCustomAt('')
    setPinDialog(target)
  }

  async function confirmPin() {
    const target = pinDialog
    if (!target) {
      return
    }
    let until: string | null = null
    if (pinChoice === '24h') {
      until = new Date(Date.now() + 86_400_000).toISOString()
    }
    else if (pinChoice === '7d') {
      until = new Date(Date.now() + 7 * 86_400_000).toISOString()
    }
    else if (pinChoice === 'custom') {
      const at = new Date(pinCustomAt).getTime()
      if (!pinCustomAt || Number.isNaN(at) || at <= Date.now()) {
        setNotice('Geçerli bir tarih-saat seçin.')
        return
      }
      until = new Date(at).toISOString()
    }
    setPinDialog(null)
    await act('pin', { messageId: target.id, pinned: true, until })
  // eslint-disable-next-line ts/no-use-before-define -- fonksiyon bildirimi; çağrı yalnızca render sonrası (olay anında) olduğu için TDZ riski yok
    await load()
  }

  /* BİLDİRİM SESSİ (2026-11-08, WhatsApp "Sessize al"): komut satırından "Sohbeti
     dışa aktar" ile aynı aile — sağ tık menüsünden açılır, pin seçici ile aynı
     süre diyaloğunu kullanır; sunucu `chat_participants.muted_until` yazar. */
  async function muteCall(peer: Peer, until: string | null) {
    const opened = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'open', peerId: peer.id }),
    })
    const openJson = await opened.json()
    const cid = openJson?.conversation?.id as string | undefined
    if (!cid) {
      setError(openJson?.message ?? t('chat.error'))
      return
    }
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'mute', conversationId: cid, until }),
    })
    const json = await res.json()
    if (!res.ok || !json.success) {
      setError(json?.message ?? t('chat.error'))
      return
    }
    setPeers(prev => prev?.map(p => (p.id === peer.id ? { ...p, mutedUntil: json.mutedUntil ?? null } : p)) ?? null)
  }

  function isPeerMuted(peer: Peer | null | undefined) {
    return !!peer?.mutedUntil && new Date(peer.mutedUntil).getTime() > Date.now()
  }

  async function toggleMutePeer(peer: Peer) {
    try {
      if (isPeerMuted(peer)) {
        await muteCall(peer, null)
        setNotice('Bildirimler tekrar açık.')
        return
      }
      setMuteChoice('7d')
      setMuteCustomAt('')
      setMutePeer(peer)
    }
    catch {
      setError(t('chat.error'))
    }
  }

  async function confirmMute() {
    const peer = mutePeer
    if (!peer) {
      return
    }
    let until: string | null = null
    if (muteChoice === '24h') {
      until = new Date(Date.now() + 86_400_000).toISOString()
    }
    else if (muteChoice === '7d') {
      until = new Date(Date.now() + 7 * 86_400_000).toISOString()
    }
    else if (muteChoice === 'custom') {
      const at = new Date(muteCustomAt).getTime()
      if (!muteCustomAt || Number.isNaN(at) || at <= Date.now()) {
        setNotice('Geçerli bir tarih-saat seçin.')
        return
      }
      until = new Date(at).toISOString()
    }
    setMutePeer(null)
    await muteCall(peer, until)
    setNotice('Bildirimler sessize alındı.')
  }

  /** Sohbeti dışa aktar: mevcut konuşmayı .txt olarak indirir. */
  function exportChat() {
  // eslint-disable-next-line ts/no-use-before-define -- fonksiyon bildirimi; çağrı yalnızca render sonrası (olay anında) olduğu için TDZ riski yok
    if (!activePeer || messages.length === 0) {
      setNotice('Dışa aktarılacak mesaj yok.')
      return
    }
    const lines = [
  // eslint-disable-next-line ts/no-use-before-define -- fonksiyon bildirimi; çağrı yalnızca render sonrası (olay anında) olduğu için TDZ riski yok
      `Sohbet: ${activePeer.name}`,
      `Dışa aktarım: ${new Date().toLocaleString('tr')}`,
      '',
    ]
    for (const m of messages) {
      const time = new Date(m.created_at).toLocaleString('tr', {
        day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
      })
      const who = m.sender_id === myId ? 'Ben' : (m.sender_name || 'Karşı taraf')
      const body = m.text?.trim()
        || (m.kind === 'image'
          ? '[Fotoğraf]'
          : m.kind === 'audio'
            ? '[Sesli mesaj]'
            : m.kind === 'video'
              ? '[Video]'
              : m.kind === 'poll'
                ? '[Anket]'
                : `[Dosya: ${m.file_name ?? ''}]`)
      lines.push(`[${time}] ${who}: ${body}`)
    }
    const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
  // eslint-disable-next-line ts/no-use-before-define -- fonksiyon bildirimi; çağrı yalnızca render sonrası (olay anında) olduğu için TDZ riski yok
    a.download = `sohbet-${(activePeer.name || 'cikti').replace(/[\\/:*?"<>|\s]+/g, '-')}-${Date.now()}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  const pinLabel = (m: UiMessage) =>
    m.text?.trim()
    || (m.kind === 'image'
      ? '📷 Fotoğraf'
      : m.kind === 'audio'
        ? '🎤 Sesli mesaj'
        : m.kind === 'video'
          ? '🎬 Video'
          : m.kind === 'poll'
            ? '📊 Anket'
            : (m.file_name ?? '📎 Dosya'))

  /** Bir kişiye tıklanınca doğrudan sohbeti açar (idempotent). */
  const openWith = useCallback(async (peerId: string) => {
    // KENDİMLE SOHBET: yalnız YÖNETİCİ açabilir (2026-10-13 kullanıcı isteği:
    // "admin kendisini görsün, kendisiyle konuşa bilsin"). Normal kullanıcı
    // kendisiyle konuşmaz — ayrıca listesinde kendi satırı hiç görünmez.
    // `<id>|<id>` sohbeti sunucuda destekli: katılım satırları her açılışta
    // garanti edilir (chat-db `ensureParticipants`), mesaj okuma 403 dönmez.
    if (peerId === selfId && !isAdmin) {
      return
    }
    setActivePeerId(peerId)
    // SON AÇILAN KİŞİ HATIRLANIR (2026-11-08, kullanıcı isteği): sohbet
    // açıldığında en son açılan kişi kendiliğinden açılır.
    try {
      localStorage.setItem(CHAT_LAST_PEER_KEY, peerId)
    }
    catch {
      // Depolama kapalı — yoksay, sonraki açılışta seçim olmayacak
    }
    /*
      ROZET SIFIRLANIR (kullanıcı isteği: "sohbeti açınca okunmamış sıfırlansın,
      rozet kaysın"). 2026-10-16: okundu damgası artık `GET`te DEĞİL, alıcı
      sohbeti açık + sekme görünür + mesaj görünür alanda iken ayrı bir
      `action: 'read'` isteğiyle atılır (kendi mesajımı okundu yapmaz); buradaki
      sıfırlama yalnız rozetin ANINDA düşmesini sağlar.
    */
    setPeers(prev => prev && prev.some(p => p.id === peerId && p.unread)
      ? prev.map(p => (p.id === peerId ? { ...p, unread: 0 } : p))
      : prev)
    // Liste paneli AÇIK KALIR (kullanıcı isteği: "sohbet seçilince liste
    // kapanmasın, sağdaki alan değişsin") — kaplama modu kaldırıldı.
    setLoading(true)
    setError(null)
    setMessages([])
    setConversationId(null)
    try {
      const res = await fetch('/api/chat', {
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
  }, [t, selfId, isAdmin])

  /*
    SON AÇILAN KİŞİ KENDİLİĞİNDEN AÇILIR (2026-11-08, kullanıcı isteği:
    "en son kimi açtıysam o açılmalı"). Eskiden sohbet yalnız TEK kişi
    varsa açılıyordu; artık kayıtlı son açılan kişi önceliklidir.
    Sıra: (1) kayıtlı son kişi listede varsa (kendim değilse ya da adminse),
    (2) listede tek kişi varsa o, (3) yoksa açılmaz ("soldan bir kişi seç"
    durumu bilinçli seçim olarak kalır). `autoOpened`: aynı oturumda bir kez.
  */
  const autoOpened = useRef(false)
  useEffect(() => {
    if (autoOpened.current || conversationId || !peers) {
      return
    }
    let saved: string | null = null
    try {
      saved = window.localStorage.getItem(CHAT_LAST_PEER_KEY)
    }
    catch {
      saved = null
    }
    const savedPeer = saved ? peers.find(p => p.id === saved) : undefined
    const canOpenSaved = savedPeer && (savedPeer.id !== selfId || isAdmin)
    const single = peers.length === 1 ? peers[0].id : null
    const target = canOpenSaved ? savedPeer!.id : single
    if (!target) {
      return
    }
    autoOpened.current = true
    void openWith(target)
  }, [peers, conversationId, openWith, selfId, isAdmin])

  /* Yan panel genişliği hatırlanır (SSR uyumu: önce varsayılan, sonra oku). */
  useEffect(() => {
    try {
      const saved = Number(localStorage.getItem(CHAT_PANEL_KEY))
      if (Number.isFinite(saved) && saved >= CHAT_PANEL_MIN) {
        setPanelWidth(Math.min(CHAT_PANEL_MAX, saved))
      }
    }
    catch {
      // Depolama kapalı (gizli sekme / test ortamı): varsayılan genişlik yeter.
    }
  }, [])

  useEffect(() => {
    try {
      localStorage.setItem(CHAT_PANEL_KEY, String(panelWidth))
    }
    catch {
      // Yazamıyorsa sessizce geç — genişlik yalnız bu oturumda yaşar.
    }
  }, [panelWidth])

  /**
   * Panel GENİŞ/KOMPAKT seçimi hatırlanır. Kayıt yoksa: dar ekranda KOMPAKT,
   * geniş ekranda GENİŞ başlar (kullanıcı isteği 3).
   *
   * ⚠️ 2026-10-30 (gerçek hata): aşağıdaki yazma effect'i İLK render'da da
   * çalışıp `panelOpen` başlangıç değerini (`true`) kaydediyordu. React Strict
   * Mode geliştirmede effect'leri iki kez çalıştırdığı için ikinci turda bu
   * `true` okunuyor ve **dar ekranda otomatik KOMPAKT hiç uygulanmıyordu**
   * (390px'te panel 72px değil 288px açılıyordu — e2e ölçtü). Çözüm:
   * karar verilene kadar yazma yok (`decided` ref).
   */
  const panelPrefDecided = useRef(false)

  useEffect(() => {
    try {
      const saved = localStorage.getItem(CHAT_PANEL_OPEN_KEY)
      if (isNarrowScreen()) {
        autoCollapsed.current = true
        setPanelOpen(false)
        return
      }
      if (saved === '0' || saved === '1') {
        setPanelOpen(saved === '1')
        return
      }
      setPanelOpen(true)
    }
    catch {
      // Depolama kapalı: dar ekran kuralı yine de uygulanır.
      autoCollapsed.current = isNarrowScreen()
      setPanelOpen(!isNarrowScreen())
    }
  }, [])

  /**
   * EKRAN SONRADAN DARALIRSA panel kendiliğinden katlanır (2026-10-30, gerçek
   * hata): katlanma yalnız ilk açılışta uygulanıyordu. Masaüstünde (1440px)
   * açılmış panel pencere 390px'e küçültülünce GENİŞ kalıyor, sohbet alanına
   * 80px kalıyor ve mesaj balonları 24px genişliğe sıkışıp karakter başına
   * satır kayıyordu (ölçüldü: balon 251px yüksekliğinde). Sohbet alanı asla
   * kullanılamaz genişliğe düşmemeli.
   */
  useEffect(() => {
    const mq = window.matchMedia?.(CHAT_NARROW_QUERY)
    if (!mq)
      return
    const onChange = () => {
      if (mq.matches) {
        autoCollapsed.current = true
        setPanelOpen(false)
      }
    }
    onChange()
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  useEffect(() => {
    // İlk render'ı atla: henüz karar verilmedi, yazarsak yanlış değeri
    // (başlangıç `true`) kalıcılaştırırız.
    if (!panelPrefDecided.current) {
      panelPrefDecided.current = true
      return
    }
    // Otomatik katlanma tercih değil — yazma.
    if (autoCollapsed.current)
      return
    try {
      localStorage.setItem(CHAT_PANEL_OPEN_KEY, panelOpen ? '1' : '0')
    }
    catch {
      // Yazamıyorsa sessizce geç — seçim yalnız bu oturumda yaşar.
    }
  }, [panelOpen])

  /** Panel sürüklemesi (pointer) — desen: `components/sidebar.tsx`. */
  const startResize = useCallback((e: ReactPointerEvent<HTMLDivElement>) => {
    e.preventDefault()
    // Katlanmış (KOMPAKT 72px) panelde de tutamaç aktiftir: sürükleme paneli
    // açar ve başlangıç GÖRÜNÜR genişlik (72px) üzerinden hesaplar.
    if (!panelOpen)
      setPanelOpen(true)
    const startX = e.clientX
    const startWidth = panelOpen ? panelWidth : 72
    const isMobile = window.innerWidth < 768
    const minW = isMobile ? 72 : CHAT_PANEL_MIN
    const maxW = isMobile ? 300 : CHAT_PANEL_MAX
    const move = (ev: PointerEvent) => {
      setPanelWidth(
        Math.min(maxW, Math.max(minW, startWidth + ev.clientX - startX)),
      )
    }
    const up = () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
  }, [panelOpen, panelWidth])

  /** Klavye erişimi: ayraç odaklıyken ok tuşları ±16 px. */
  function resizeByKey(e: ReactKeyboardEvent<HTMLDivElement>) {
    const step = e.key === 'ArrowLeft' ? -16 : e.key === 'ArrowRight' ? 16 : 0
    if (!step) {
      return
    }
    e.preventDefault()
    // Katlanmış panelde ok tuşu da paneli açar.
    if (!panelOpen)
      setPanelOpen(true)
    const isMobile = window.innerWidth < 768
    const minW = isMobile ? 72 : CHAT_PANEL_MIN
    const maxW = isMobile ? 300 : CHAT_PANEL_MAX
    setPanelWidth(w => Math.min(maxW, Math.max(minW, w + step)))
  }

  /*
    Yönetici eylemi çalıştırır (sağ tık menüsü). Sohbet gerektiren
    eylemler için önce sohbeti bulundurur — `open` idempotent olduğu için
    var olan sohbeti silmez, yalnızca yoksa oluşturur.
  */
  async function runAdmin(
    action: 'favorite' | 'important' | 'block' | 'clear' | 'deleteConversation' | 'nickname' | 'profile',
    peer: Peer,
    extra: Record<string, unknown> = {},
  ) {
    try {
      let conversationId = ''
      if (action !== 'nickname' && action !== 'profile') {
        const open = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'open', peerId: peer.id }),
        })
        const openJson = await open.json()
        if (openJson?.code === 'CHAT_SCHEMA_MISSING') {
          setSchemaMissing(true)
          return
        }
        conversationId = openJson?.conversation?.id ?? ''
        if (!conversationId) {
          setError(openJson?.message ?? t('chat.error'))
          return
        }
      }
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, conversationId, userId: peer.id, ...extra }),
      })
      const json = await res.json()
      if (!res.ok || !json.success) {
        setError(json?.message ?? t('chat.error'))
      }
    }
    catch {
      setError(t('chat.error'))
    }
  }

  const load = useCallback(async () => {
    if (!conversationId) {
      setLoading(false)
      return
    }
    try {
      const res = await fetch(`/api/chat?conversationId=${encodeURIComponent(conversationId)}`)
      const json = await res.json()
      if (json.code === 'CHAT_SCHEMA_MISSING') {
        setError(t('chat.schemaMissing'))
        return
      }
      if (!res.ok || !json.success) {
        setError(json.message ?? 'Sohbet yüklenemedi.')
        return
      }
      /*
        BİLDİRİM (2026-10-30): yoklama yeni mesaj getirdiyse ve sekme arka
        plandaysa masaüstü bildirimi gösterilir. İLK yüklemede mevcut mesajlar
        "yeni" sayılmaz (geçmiş bildirim yağmuru olmasın) — `firstLoad` kapısı.
      */
      const server = (json.messages ?? []) as UiMessage[]
      const seen = seenIdsRef.current
      const firstLoad = seen.size === 0
      const incoming = server.filter(
        m => !seen.has(m.id) && m.sender_id !== (myId || selfId),
      )
      for (const m of server) seen.add(m.id)
      if (!firstLoad && incoming.length > 0 && !mutedRef.current) {
        const last = incoming[incoming.length - 1]
        showBrowserNotification(
          last.sender_name?.trim() || t('chat.newMessage'),
          last.text?.trim() || '…',
          conversationId ?? undefined,
        )
      }
      /*
        Sunucu listesi YEREL (iyimser) satırlarla birleştirilir: gönderim
        sürerken gelen yoklama, "saat" durumundaki mesajı ekrandan DÜŞÜRMESİN
        (sunucu onu ancak POST bitince döndürür).
      */
      setMessages((prev) => {
        const local = prev.filter(m => (m._pending || m._failed) && !server.some(s => s.id === m.id))
        return local.length ? [...server, ...local] : server
      })
      /* Anket verisini `text` JSON'dan ayrıştır ve `polls` state'ine yaz. */
      for (const m of server) {
        if (m.kind === 'poll' && m.text) {
          try {
            const payload = JSON.parse(m.text)
            if (payload.question && Array.isArray(payload.options)) {
              setPolls(prev => ({
                ...prev,
                [m.id]: {
                  question: payload.question,
                  options: payload.options.map((o: { text: string, votes?: number, voter_ids?: string[] }) => ({
                    text: o.text,
                    votes: o.votes ?? 0,
                    voter_ids: o.voter_ids ?? [],
                  })),
                  is_closed: !!payload.is_closed,
                  user_vote: payload.options.findIndex((o: { voter_ids?: string[] }) => o.voter_ids?.includes(myId ?? '')),
                },
              }))
            }
          }
 catch {
            // Bozuk anket verisi sessizce atlanır
          }
        }
      }
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

  /* Sesiz sohbet: ref'i tazele — `load()` bildirim kapısı buradan okur (early
     return'lerden ÖNCE burada durmalı ki hook sayısı kararsız olmasın). */
  useEffect(() => {
    const me = (peers ?? []).find(p => p.id === activePeerId)
    mutedRef.current = !!me?.mutedUntil && new Date(me.mutedUntil).getTime() > Date.now()
  }, [peers, activePeerId])

  /**
   * "Sohbeti yenile" (boş alan menüsü): liste 2 sn'de bir kendiliğinden
   * tazelenir; bu madde anında tazeleme isteyen kullanıcı içindir.
   */
  async function refresh() {
    const list = await loadPeers()
    setPeers(list)
    setPeersError(list === null)
    await load()
  }

  // basit yoklama: yeni mesajda ✓ durumu güncellensin (okundu bilgisi).
  // `POLL_MS`: karşı tarafın mesajı ~2 sn içinde düşsün (eskiden 5 sn).
  useEffect(() => {
    if (!conversationId || !isAuthenticated) {
      return
    }
    const id = setInterval(load, POLL_MS)
    return () => clearInterval(id)
  }, [conversationId, isAuthenticated, load])

  useEffect(() => {
    scrollToBottom(true)
  }, [messages.length])

  /*
    ── OKUNDU DAMGASI (2026-10-16) ──────────────────────────────────────────
    Kullanıcı isteği: "readAt yalnızca alıcı o sohbeti açıkken, pencere odakta
    ve mesaj görünür alana girdiğinde set edilsin. Sekme arka plandaysa okundu
    sayılmasın."

    Sunucu artık mesaj çekilirken okundu İŞARETLEMEZ; damga buradan istenir.
    Üç kapı: (1) sohbet açık, (2) sekme görünür, (3) mesaj listesi görünür
    alanda. Karşı taraftan okunmamış mesaj YOKSA istek hiç gönderilmez →
    yoklama her 2 sn'de bir boşa POST atmaz (kendini sınırlar: `read_at`
    dönünce koşul kendiliğinden kapanır).
  */
  useEffect(() => {
    if (!conversationId || !isAuthenticated || !listVisible) {
      return
    }
    const pending = messages.some(m => m.sender_id !== myId && !m.read_at)
    if (!pending) {
      return
    }
    const report = () => {
      if (document.visibilityState !== 'visible') {
        return
      }
      void fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'read', conversationId }),
      })
    }
    report()
    document.addEventListener('visibilitychange', report)
    return () => document.removeEventListener('visibilitychange', report)
  }, [conversationId, isAuthenticated, listVisible, messages, myId])

  /** Mesaj listesi görünür alanda mı — okundu damgasının üçüncü kapısı. */
  useEffect(() => {
    const box = listRef.current
    if (!box || typeof IntersectionObserver === 'undefined') {
      setListVisible(true)
      return
    }
    const obs = new IntersectionObserver(
      entries => setListVisible(entries.some(e => e.isIntersecting)),
      { threshold: 0.1 },
    )
    obs.observe(box)
    return () => obs.disconnect()
  }, [conversationId])

  /** Vurgu animasyonu biter → sınıf kalkar (aynı mesaja tekrar tıklanınca yeniden oynar). */
  useEffect(() => {
    if (!flashId) {
      return
    }
    const id = setTimeout(() => setFlashId(null), FLASH_MS)
    return () => clearTimeout(id)
  }, [flashId])

  /** Bilgi bildirimi kendiliğinden kaybolur. */
  useEffect(() => {
    if (!notice) {
      return
    }
    const id = setTimeout(() => setNotice(null), 2_500)
    return () => clearTimeout(id)
  }, [notice])

  /**
   * Esc → yanıtlamayı iptal et (kullanıcı isteği). Menülerin kendi Esc
   * dinleyicisi ayrıdır; ikisi birlikte kapanabilir (zararsız).
   */
  useEffect(() => {
    if (!replyTo) {
      return
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setReplyTo(null)
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [replyTo])

  /** Sohbet değişince yanıt hedefi TEMİZLENİR (kullanıcı isteği). */
  useEffect(() => {
    setReplyTo(null)
  }, [conversationId])

  /**
   * Emojiyi metin alanında İMLECİN bulunduğu yere ekler, odak alanda kalır
   * (2026-10-12 kullanıcı isteği). Taslağın sonuna eklemek imleci bozardı.
   */
  function insertEmoji(unicode: string) {
    const el = inputRef.current
    if (!el) {
      setDraft(d => d + unicode)
      return
    }
    const start = el.selectionStart ?? el.value.length
    const end = el.selectionEnd ?? start
    setDraft(el.value.slice(0, start) + unicode + el.value.slice(end))
    const caret = start + unicode.length
    // Kontrollü alan: yeni değer bir sonraki karede yazılır → imleç o zaman konur.
    requestAnimationFrame(() => {
      el.focus()
      el.setSelectionRange(caret, caret)
    })
  }

  /**
   * Mesaj gönderir. `override` verilirse taslak yerine o metin gider (boş
   * sohbetteki "Merhaba de!" düğmesi bunu kullanır — AYRI gönderme mantığı
   * yazılmaz).
   *
   * İYİMSER (2026-10-16 kullanıcı isteği): mesaj önce YEREL olarak "saat"
   * durumunda listeye girer, sunucu yanıtı gelince gerçek satırla değiştirilir;
   * hata olursa kırmızı ünlem + "Tekrar dene" olur. Böylece tik HİÇBİR ZAMAN
   * doğrudan çift tikle başlamaz (kullanıcının şikâyeti: hiç görülmemiş mesajda
   * çift mavi tik).
   */
  /**
   * Tepki ver/geri al (2026-11-08, WhatsApp tarzı). İyimser: satır anında
   * güncellenir; `POST /api/chat` `react` aksiyonu sunucuya kaydeder ve
   * GÜNCEL listeyi döner. Her kullanıcı x mesaj için TEK tepki: başka
   * emojiye tıklama değiştirir, aynı emojiye tıklama kaldırır.
   */
  async function reactTo(messageId: string, emoji: string) {
    const mineEntry = (m: UiMessage) => m.reactions?.find(r => r.userId === myId)
    const myPeer = peers?.find(p => p.id === myId)
    setMessages((prev) => {
      return prev.map((m) => {
        if (m.id !== messageId) {
          return m
        }
        const current = m.reactions ?? []
        const mine = mineEntry(m)
        const next: typeof current = mine && mine.emoji === emoji
          ? current.filter(r => r.userId !== myId)
          : [
              ...current.filter(r => r.userId !== myId),
              {
                emoji,
                userId: myId,
                username: myPeer?.username ?? null,
                fullName: myPeer?.fullName ?? null,
                nickname: myPeer?.nickname ?? null,
                avatarUrl: myPeer?.avatarUrl ?? null,
              },
            ]
        return { ...m, reactions: next }
      })
    })
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'react', messageId, emoji }),
      })
      const json = await res.json().catch(() => null)
      if (res.ok && json?.success && Array.isArray(json.reactions)) {
        setMessages(prev => prev.map(m => (m.id === messageId ? { ...m, reactions: json.reactions } : m)))
      }
    }
    catch {
      // Bir sonraki yoklama sunucudan doğru listeyi getirir
    }
  }

  // Tepki şeridi/seçici/panel dışarı tıklanınca kapanır.
  useEffect(() => {
    if (!stripFor && !pickerFor && !reactionPanelFor) {
      return
    }
    const onDoc = (e: MouseEvent) => {
      const el = e.target as HTMLElement | null
      if (el?.closest('[data-reaction-popover]')) {
        return
      }
      setStripFor(null)
      setPickerFor(null)
      setReactionPanelFor(null)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [stripFor, pickerFor, reactionPanelFor])

  /** Anket seçeneğine oy ver/geri al: messageId + seçenek indeksi. Kendi oyunu yeniden tıklayınca geri alır. */
  function togglePollVote(messageId: string, optionIndex: number) {
    setPolls((prev) => {
      const poll = prev[messageId]
      if (!poll || poll.is_closed)
return prev
      const options = poll.options.map((opt, i) => {
        if (i !== optionIndex)
return opt
        const alreadyVoted = opt.voter_ids.includes(myId)
        return {
          ...opt,
          votes: alreadyVoted ? opt.votes - 1 : opt.votes + 1,
          voter_ids: alreadyVoted
            ? opt.voter_ids.filter(id => id !== myId)
            : [...opt.voter_ids, myId],
        }
      })
      const userVote = poll.user_vote === optionIndex ? null : optionIndex
      return {
        ...prev,
        [messageId]: { ...poll, options, user_vote: userVote },
      }
    })
  }

  /** Anket taslağına seçenek ekler (en az 2 seçenek gerekli). */
  function addPollOption() {
    setPollDraft(d => d ? { ...d, options: [...d.options, ''] } : null)
  }

  /** Anket taslağından seçenek çıkar (en az 2 kalmalı). */
  function removePollOption(index: number) {
    setPollDraft((d) => {
      if (!d || d.options.length <= 2)
return d
      return { ...d, options: d.options.filter((_, i) => i !== index) }
    })
  }

  /** Anket taslağındaki seçenek metnini günceller. */
  function setPollOption(index: number, value: string) {
    setPollDraft((d) => {
      if (!d)
return null
      const options = [...d.options]
      options[index] = value
      return { ...d, options }
    })
  }

  /** Anket sorusu metnini günceller. */
  function setPollQuestion(value: string) {
    setPollDraft(d => d ? { ...d, question: value } : null)
  }

  /** Anketi gönder: soru + seçenekleri JSON olarak `text` alanına yazar, kind = 'poll'. */
  async function sendPoll() {
    if (!pollDraft || !conversationId)
return
    const { question, options } = pollDraft
    if (!question.trim() || options.some(o => !o.trim()))
return
    const tmpId = `tmp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
    const payload = { question, options: options.map(o => ({ text: o.trim(), votes: 0, voter_ids: [] as string[] })) }
    const optimistic: UiMessage = {
      id: tmpId,
      conversation_id: conversationId,
      sender_id: myId,
      sender_name: '',
      text: JSON.stringify(payload),
      kind: 'poll',
      file_url: null,
      file_name: null,
      file_type: null,
      file_size: null,
      audio_duration: null,
      reply_to_id: null,
      reply_to: null,
      delivered_at: null,
      read_at: null,
      pinned: false,
      pinned_at: null,
      deleted_for_all: false,
      deleted_by: null,
      deleted_at: null,
      created_at: new Date().toISOString(),
      _pending: true,
    }
    setMessages(prev => [...prev, optimistic])
    setPollDraft(null)
    setSending(true)
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversationId, text: JSON.stringify(payload), kind: 'poll', replyToId: undefined }),
      })
      const json = await res.json()
      if (res.ok && json.success) {
        setMessages(prev => prev.map(m => (m.id === tmpId ? { ...json.data } : m)))
        stopTyping()
      }
 else {
        fail(tmpId, json.message)
      }
    }
 catch {
      fail(tmpId)
    }
 finally {
      setSending(false)
    }
  }

  async function send(override?: string) {
    const text = (override ?? draft).trim()
    const target = replyLive
    /*
      2026-11-08 (kullanıcı isteği): aşamadaki dosyalar HEPSİ BİRDEN önce gönderilir
      (altyazısıyla); metin yanında varsa aşamaya bitişik mesaj kutusuna girer, ayrı
      mesaj oluşmaz. Yalnız metin geliyorsa eski yanıt akışı çalışır.
    */
    if (staged.length > 0) {
      const toSend = staged
      const caption = text || undefined
      setStaged([])
      setSending(true)
      for (const item of toSend) {
        // eslint-disable-next-line no-await-in-loop -- WhatsApp gibi sıralı gönderim
        await uploadFile(item.file, caption)
      }
      if (!override) {
        setDraft('')
      }
      setReplyTo(null)
      setSending(false)
      return
    }
    // Boş metin GÖNDERİLMEZ: yanıt hedefi seçili olsa bile içeriksiz bir mesaj
    // yazılmaz (medya `uploadFile` yolundan gider).
    if (!text || sending || !conversationId) {
      return
    }
    const tmpId = `tmp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
    const optimistic: UiMessage = {
      id: tmpId,
      conversation_id: conversationId,
      sender_id: myId,
      sender_name: '',
      text: text || null,
      kind: 'text',
      file_url: null,
      file_name: null,
      file_type: null,
      file_size: null,
      audio_duration: null,
      reply_to_id: target?.id ?? null,
      reply_to: target ? toReplyPreview(target) : null,
      delivered_at: null,
      read_at: null,
      pinned: false,
      pinned_at: null,
      deleted_for_all: false,
      deleted_by: null,
      deleted_at: null,
      created_at: new Date().toISOString(),
      _pending: true,
    }
    setMessages(prev => [...prev, optimistic])
    if (!override) {
      setDraft('')
    }
    setReplyTo(null)
    setSending(true)
    await deliver(tmpId, text, target?.id)
    setSending(false)
  }

  /**
   * Tek bir metin mesajının sunucuya teslimi. İlk gönderim ile "Tekrar dene"
   * AYNI yolu kullanır (ikinci bir gönderme mantığı yazılmaz).
   */
  async function deliver(tmpId: string, text: string, replyToId?: string) {
    if (!conversationId) {
      return
    }
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversationId, text, replyToId }),
      })
      const json = await res.json()
      if (res.ok && json.success) {
        setMessages(prev => prev.map(m => (m.id === tmpId
          ? { ...json.data, reply_to: m.reply_to ?? null }
          : m)))
        stopTyping()
        return
      }
      fail(tmpId, json.message)
    }
    catch {
      fail(tmpId)
    }
  }

  /** Teslim edilemeyen mesajı "başarısız" işaretle (silinmez; tekrar denenebilir). */
  function fail(tmpId: string, message?: string) {
    setMessages(prev => prev.map(m => (m.id === tmpId ? { ...m, _pending: false, _failed: true } : m)))
    setError(message ?? t('chat.sendFailed'))
  }

  /** Başarısız mesajı yeniden gönder (kullanıcı isteği: "kırmızı ünlem + Tekrar dene"). */
  async function retry(m: UiMessage) {
    setMessages(prev => prev.map(x => (x.id === m.id ? { ...x, _failed: false, _pending: true } : x)))
    await deliver(m.id, m.text ?? '', m.reply_to_id ?? undefined)
  }

  /** Dosya yükle + gönder. `text` verilirse mesaj kutusuna ALTYAZI olarak girer
      (WhatsApp mantığı) — upload sonrası POST'a `text` eklenir. */
  async function uploadFile(file: File, text?: string) {
    if (!conversationId) {
      return
    }
    localPresenceRef.current.presenceState = 'uploading'
    syncToServer()
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
      /*
        Tür kararı SUNUCUNUN döndürdüğü türe göre verilir (istemcideki dosya
        adına göre DEĞİL): desteklenmeyen veya içeriği uzantısıyla uyuşmayan
        dosya sunucuda `.bin` olarak saklanır ve `application/octet-stream`
        döner → sohbet onu görsel/ses diye RENDER ETMEZ, indirilebilir dosya
        olarak gösterir (dosya "yalnız var olur", çalışmaz).
      */
      const savedType = String(upJson.file?.type ?? '')
      const isAudio = savedType.startsWith('audio/')
      const isImage = savedType.startsWith('image/')
      const isVideo = savedType.startsWith('video/')
      const target = replyLive
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId,
          kind: isAudio ? 'audio' : isVideo ? 'video' : isImage ? 'image' : 'file',
          file: upJson.file,
          // Medya da YANITLANABİLİR (2026-10-16) — taslakta bekleyen yanıt düşmez.
          replyToId: target?.id,
          // Altyazı (WhatsApp mantığı): aşamadaki dosyalar metinle gönderilebilir.
          ...(text?.trim() ? { text: text.trim() } : {}),
        }),
      })
      const json = await res.json()
      if (res.ok && json.success) {
        setMessages(prev => [...prev, { ...json.data, reply_to: target ? toReplyPreview(target) : null }])
        setReplyTo(null)
      }
      else {
        // Hata BANT olarak görünür (sohbet kapanmaz) — 2026-10-12.
        setError(json.message ?? t('chat.error'))
      }
    }
    finally {
      setSending(false)
      localPresenceRef.current.presenceState = null
      syncToServer()
    }
  }

  async function act(action: string, extra: Record<string, unknown> = {}) {
    if (!conversationId) {
      return
    }
    await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, conversationId, ...extra }),
    })
  }

  async function remove(mode: 'me' | 'all') {
    if (!confirmMsg) {
      return
    }
    const res = await fetch(`/api/chat?messageId=${confirmMsg.id}&mode=${mode}`, { method: 'DELETE' })
    const json = await res.json()
    if (json.success) {
      setMessages(prev => prev.filter(m => m.id !== confirmMsg.id))
    }
    setConfirmMsg(null)
    setMenu(null)
  }

  function copy(text: string) {
    navigator.clipboard?.writeText(text)
    setMenu(null)
  }

  /**
   * İLET (forward, 2026-10-13): eldeki mesajın içeriğini BAŞKA bir kişiye
   * gönderir. Yeni sunucu ucu GEREKMEZ: önce hedefle doğrudan sohbet açılır
   * (`action:'open'`, yoksa oluşturur), sonra mesaj o sohbete yazılır. Dosya
   * ve görseller de taşınır (URL zaten `/uploads/chat/` altında yüklü).
   * Kendi mesaj listemiz DEĞİŞMEZ — iletilen mesaj hedef sohbete gider.
   */
  async function forwardTo(peer: Peer, message: ChatMessageRow) {
    try {
      const opened = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'open', peerId: peer.id }),
      })
      const openJson = await opened.json()
      if (openJson?.code === 'CHAT_SCHEMA_MISSING') {
        setSchemaMissing(true)
        return
      }
      const target = openJson?.conversation?.id
      if (!target) {
        setError(openJson?.message ?? t('chat.error'))
        return
      }
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'send',
          conversationId: target,
          text: message.text ?? '',
          kind: message.kind,
          file: message.file_url
            ? {
                url: message.file_url,
                name: message.file_name ?? 'dosya',
                type: message.file_type ?? 'application/octet-stream',
                size: message.file_size ?? 0,
              }
            : undefined,
        }),
      })
      const json = await res.json()
      if (!json?.success) {
        setError(json?.message ?? t('chat.error'))
      }
    }
    catch {
      setError(t('chat.error'))
    }
  }

  /* ── durumlar ─────────────────────────────────────────────────────── */
  if (!sessionChecked) {
    // Oturum sorgusu sürerken ekranı kaplayan "Sohbet yükleniyor…" yerine
    // iskelet (kullanıcı isteği 2026-10-12: "Sohbet yükleniyor öyle olmasın").
    return (
      <div className="w-full rounded-2xl border border-foreground/10 bg-background p-6">
        <ChatSkeleton label={t('chat.loading')} />
      </div>
    )
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
    /*
      Giriş kapısı — dikey ORTALAMA (2026-10-20 kullanıcı isteği): "kart
      havada duruyor, altı boş". Kartın 4 kenarı zaten çerçeveliydi; sorun
      kartın kendi yüksekliği değil, sarmalayıcıda (chat-slot: `flex-1
      items-stretch`) üstte kalmasıydı. Artık kart `flex-1` kapsayıcı içinde
      `place-items-center` ile ortalanır (admin ChatPanel'in boş durumu da
      `justify-center` kullanır — aynı görsel dil). `max-w-md` + çerçeve +
      `p-10` AYNEN korunur.
    */
    return (
      <div className="grid w-full flex-1 place-items-center">
        <div className="flex w-full max-w-md flex-col items-center gap-4 rounded-2xl border border-foreground/10 bg-background p-10 text-center">
          <LockIcon size={24} className="text-foreground-400" />
          <p className="text-sm text-foreground-500">{t('chat.loginRequired')}</p>
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
      </div>
    )
  }

  /*
    TEK EKRANDA YAN PANEL + SOHBET (kullanıcı isteği 2026-10-12).
      "önce kime yazcamızı seçiyoruz sonra onunla olduğumuz sohbet açılıyor ama
       yanlış — ikisi yan yana tek bir hâlde olacak, yan panel gibi duracak; kime
       yazmak istiyorum bölümü ve büyütüp küçülte bileceğim. Diğer kısımda
       tıkladığım kişiyle sohbetim olacak. 'Kime yazmak istiyorsun?' yazısını
       kaldır, tam ekranı kaplasın."
    · SOL: kişi listesi — başlık yazısı YOK, sürükleyerek veya ok tuşlarıyla
      genişlet/daralt (`md` altında sohbet açıkken gizlenir),
    · SAĞ: seçili kişiyle sohbet; hiç seçim yoksa "soldan bir kişi seç" der.
    Genişlik sayfanın tamamı, yükseklik üst bar + başlık altındaki alan (eski
    `max-w-3xl` / `max-h-[760px]` / `68svh` sınırları kaldırıldı).
    Yükleme ve hata artık TAM EKRANI KAPLAMAZ: sohbetin içinde gösterilir —
    "erişim yok" gibi bir yanıt sohbeti kapatmaz.
  */
  const q = peerQuery.trim().toLocaleLowerCase('tr')
  /*
    "Henüz başka kullanıcı yok" YOK (2026-10-11): kayıtlı herkes listelenir.
    Takma ad, kullanıcı adı VE gerçek ad birlikte aranır — takma ad konulsa
    bile gerçek ad kaybolmaz (kullanıcı isteği).

    PANEL SÜZGECİ (2026-10-13; 2026-10-16 kullanıcı isteğiyle DEĞİŞTİ):
      · YÖNETİCİ (site sahibi/admin) → kayıtlı HERKES görünür, sohbeti olmayan
      kayıtlar DA. Kullanıcı: "ben adminim neden bütün herkesi görmüyorum ve
      bütün kullanıcıları görebilmeliyim sonuçta adminim". Eski kural ("kayıt
      olup hiç yazmayan kişi paneli doldurmaz") admin için kaldırıldı: satır ilk
      tıklamada sohbeti açar (`openWith`). Sunucu zaten admin'e tüm profilleri
      döner (`api/chat/users`) — gizleyen yer BURASIYDI.
      · NORMAL KULLANICI → yalnız kendisiyle konuşabileceği kişi (site sahibi,
      sunucu süzer). Kendi satırı görünmez: kendisiyle konuşamaz
      (`openWith` kapısı) ve "Siz" satırı ona bir şey ifade etmez.
  */
  const visiblePeers = orderedPeers
    .filter(p => (isAdmin ? true : p.id !== selfId && !!p.hasConversation))
    .filter((p) => {
      if (!q) {
        return true
      }
      return [p.nickname, p.username, p.fullName].some(
        v => !!v && v.toLocaleLowerCase('tr').includes(q),
      )
    })
  const activePeer = orderedPeers.find(p => p.id === activePeerId) ?? null
  /**
   * KENDİMLE SOHBET mi (2026-10-16 kullanıcı şikâyeti)? Açık sohbetin karşı
   * tarafı BENİMSEM: alıcı da ben olduğum için tik kararı yerel olarak "okundu"
   * kabul eder (bkz. `lib/chat-ticks.ts` → `TickOverride.selfChat`).
   */
  const selfChat = !!selfId && activePeerId === selfId
  const threadOpen = !!conversationId
  /*
    KENDİM DIŞINDA KİMSE YOKSA SOL PANEL HİÇ GÖZÜKMESİN (2026-11-08,
    kullanıcı isteği): "bir gruba eklemediğim kullanıcılarda sadece ben
    gözüküyom, öyle olanlar için yan panel bile gözükmesin". Normal
    kullanıcı yalnız site sahibini görür → tek satırlık liste anlamsız
    → panel ve tutamaç gizlenir, sohbet alanı tam genişlik kaplar.
    Admin her zaman listede kalır (kişileri yönetebilir). Yükleniyor
    (`peers === null`) iken `null` döner ve panel iskeletle GÖRÜNÜR —
    gizleme yalnız YÜKLENDİKTEN sonra.
  */
  const hasOthers = peers === null ? null : isAdmin || peers.length > 1
  /**
   * Yazma alanı doluluk kararı (2026-10-13): yalnız BOŞLUK yazmak "yazdı"
   * sayılmaz → sağdaki düğme mikrofon olarak kalır. Tek kaynak burasıdır.
   */
  const hasDraft = draft.trim().length > 0
  /**
   * Selamlama dili: sitenin seçili dili; yoksa tarayıcı dili (SSR'da
   * `navigator` yok → boş dize, saf fonksiyon İngilizce'ye düşer).
   */
  const helloLocale = locale
    || (typeof navigator === 'undefined' ? '' : navigator.language)
  /**
   * Sağ uçtaki düğmenin sınıfları (2026-10-13). Dolu → yeşil (WhatsApp
   * gönder, `#25D366` SABİT marka rengi) zemin + beyaz ikon; boş → nötr
   * mikrofon. Sabit renk tema ile değişmediği için beyaz ikon her iki temada
   * da okunur (theme-contrast guard'ının "sabit zemin" istisnası).
   */
  const sendBtnClass = hasDraft
    ? 'bg-[#25D366] text-white hover:brightness-95'
    : 'text-foreground/60 hover:bg-foreground/10 hover:text-foreground'

  // "Konu (thread) görünümü" KALDIRILDI (2026-11-08, kullanıcı isteği):
  // "konuyu görüntüle özelliğini kaldır".

  return (
    <div
      /*
        YÜKSEKLİK (2026-11-08, kullanıcı isteği: "sayfa kendisi kaydırılamaz
        olmalı, grup kaydırılır olacak" + "chat kutusunun altında boş kutu var").
        Kart artık SABİT hesap değil, TÜM ekranlarda `h-full` — yüksekliği
        `/chat` sarmalayıcısı (`100vh - var(--header-height)`, overflow-hidden)
        verir. Böylece kart bitişerek satırı kaplar, altta boş alan kalmaz;
        sayfanın kendisi kaydırılamaz, yalnız İÇERİK (mesaj listesi) kaydırılır.
      */
      className="relative flex h-full min-h-[260px] w-full overflow-hidden rounded-2xl border border-foreground/10 bg-background"
      style={{ '--chat-panel-w': `${panelWidth}px` } as CSSProperties}
      onDragEnter={(e) => {
        if ([...e.dataTransfer.types].includes('Files')) {
          e.preventDefault()
          setDropActive(true)
        }
      }}
      onDragOver={(e) => {
        e.preventDefault()
      }}
      onDragLeave={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) {
          setDropActive(false)
        }
      }}
      onDrop={(e) => {
        e.preventDefault()
        setDropActive(false)
        void collectDroppedFiles(e.dataTransfer).then((files) => {
          if (files.length > 0) {
            queueFiles(files.slice(0, 20))
          }
        })
      }}
    >
      {/* Sürükle-bırak overlay: bırakılınca aşamaya girer */}
      {dropActive && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 z-[60] flex items-center justify-center rounded-2xl border-2 border-dashed border-primary/60 bg-primary/10"
        >
          <p className="rounded-full bg-background/90 px-4 py-2 text-sm font-medium text-primary shadow">
            {t('chat.dropFiles')}
          </p>
        </div>
      )}
      {/*
        BİLDİRİM İZİN ŞERİDİ (2026-10-30, kullanıcı: "chat kısmına girince
        bildirim açmayı istesin"). İzin `default` iken görünür; "Aç" gerçek
        izin isteğini tetikler, × bir daha sormaz.
      */}
      {notifyBanner && (
        <div className="absolute inset-x-2 top-2 z-40 mx-auto flex max-w-md items-center gap-2 rounded-xl border border-primary/40 bg-background/95 px-3 py-2 shadow-lg backdrop-blur">
          <BellIcon size={16} className="shrink-0 text-primary" />
          <p className="min-w-0 flex-1 text-xs leading-snug">
            <span className="font-semibold text-foreground">{t('chat.notifyTitle')}</span>
            <span className="hidden text-foreground/60 sm:inline">
              {' — '}
              {t('chat.notifyBody')}
            </span>
          </p>
          <button
            type="button"
            onClick={enableNotifications}
            className="shrink-0 rounded-lg bg-primary px-2.5 py-1 text-xs font-medium text-primary-fg transition-colors hover:bg-primary/90"
          >
            {t('chat.notifyAllow')}
          </button>
          <button
            type="button"
            onClick={hideNotifyBanner}
            aria-label={t('chat.notifyLater')}
            className="shrink-0 rounded-lg p-1 text-foreground/50 transition-colors hover:text-foreground"
          >
            <CloseIcon size={14} />
          </button>
        </div>
      )}
      {/* ── SOL: kime yazmak istiyorum (kişi listesi) ──
          İKİ PANEL HER GENİŞLİKTE YAN YANA (2026-10-13 kullanıcı isteği: "tam
          ekran liste görünümü tamamen kaldırılsın"). Genişlik:
            · TÜM ekranlarda → `--chat-panel-w` (sürüklenebilir, kullanıcı ayarı).
              Mobilde (<md) sınırlar 72–300px, masada 240–560px (startResize/
              resizeByKey içinde viewport'a göre uygulanır).
          KOMPAKT modda genişlik 72px'e iner; genişlik geçişi 200ms animasyonlu. */}
      {hasOthers !== false && (
      <aside
        className={cn(
          'flex min-h-0 shrink-0 flex-col overflow-hidden border-r border-foreground/10 bg-background transition-[width] duration-200 ease-out',
        )}
        /*
          GENİŞLİK INLINE (2026-10-30, gerçek hata): eskiden iki Tailwind
          sınıfı yarışıyordu — `w-[var(--chat-panel-w)]` / `w-[72px]`. Üretilen
          CSS'te `var(...)` kuralı `72px`'ten SONRA geldiği için panel
          katlandığında bile `--chat-panel-w` (140px) kazanıyordu → "yan panel
          düğmesi listeyi daraltır" özelliği ÇALIŞMIYORDU (e2e ölçtü: 72
          beklenirken 140). Inline stil tek kazanandır, sıraya bağlı değildir.

          `min(..., 55%)` (2026-10-30): dar ekranda kullanıcı paneli elle
          açarsa sohbet alanına yine de yer kalsın. 390px'te 288px'lik panel
          sohbete 80px bırakıyordu; balonlar 24px'e sıkışıp karakter başına
          satıra düşüyordu (ölçüldü). Panel artık kartın %55'ini geçemez.
        */
        style={{ width: panelOpen ? 'min(var(--chat-panel-w), 55%)' : '72px' }}
      >
        {/* Arama kutusu yalnız GENİŞ modda. KOMPAKT modda gizlenir (kullanıcı
            isteği 3: "arama kutusu gizlensin"); "Kişi ara" menü maddesi paneli
            genişletip odağı verir (`focusSearch`). */}
        {panelOpen && (
          <div className="flex items-center gap-2 border-b border-foreground/10 p-2">
            <input
              ref={searchRef}
              type="search"
              value={peerQuery}
              onChange={e => setPeerQuery(e.target.value)}
              placeholder={t('chat.searchPeople')}
              aria-label={t('chat.searchPeople')}
              className="w-full min-w-0 flex-1 rounded-lg border border-foreground/10 bg-transparent px-3 py-2 text-sm outline-none focus-visible:border-primary"
            />
            <button
              type="button"
              aria-label={t('chat.panelOptions')}
              title={t('chat.panelOptions')}
              aria-expanded={menu?.kind === 'panel'}
              onClick={(e) => {
                const r = e.currentTarget.getBoundingClientRect()
                setMenu({ kind: 'panel', x: r.right - 220, y: r.bottom + 4 })
              }}
              className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-lg text-foreground/70 transition-colors hover:bg-foreground/10 hover:text-foreground"
            >
              <MoreVerticalIcon size={18} />
            </button>
          </div>
        )}

        <div
          className={cn(
            'relative min-h-0 flex-1 overflow-y-auto',
            panelOpen ? 'p-2' : 'p-1',
          )}
          onClick={() => setMenu(null)}
          onContextMenu={onAreaContextMenu}
          {...peerLongPress}
        >
          {peers === null && !peersError && <ChatSkeleton label={t('chat.loading')} />}
          {peers === null && peersError && <p className="p-4 text-sm text-danger">{t('chat.error')}</p>}
          {peers !== null && visiblePeers.length === 0 && panelOpen && (
            /* KOMPAKT modda yer 72px: metin sığmaz, mesaj gösterilmez. */
            <p className="p-4 text-sm text-foreground-500">{t('chat.noMatch')}</p>
          )}
          {visiblePeers.map(p => (
            <div key={p.id} className="relative">
              <button
                type="button"
                data-peer-id={p.id}
                title={panelOpen ? undefined : p.name}
                onClick={() => openWith(p.id)}
                onContextMenu={isAdmin
                  ? (e) => {
                      // Sağ tık menüsü (favori/takma ad/profil/engelle...) yalnız
                      // yöneticiye açık; normal kullanıcıya "Yetki yok." hatası
                      // göstermenin anlamı yok. Menü İMLECİN konumunda açılır.
                      e.preventDefault()
                      e.stopPropagation()
                      setMenu({ kind: 'peer', peer: p, ...menuPoint(e) })
                    }
                  : undefined}
                className={cn(
                  'flex w-full cursor-pointer items-center gap-3 rounded-lg text-left transition-colors hover:bg-foreground/5',
                  panelOpen ? 'px-3 py-2' : 'justify-center p-1.5',
                  // SEÇİLİ satır (2026-10-13 kullanıcı isteği: "seçili kişinin
                  // arka planı bi tık daha koyu olsun / seçili olduğu
                  // anlaşılmalı"): mavi jeton tonu — sitedeki `bg-primary/15`
                  // diliyle aynı, koyu temada da okunur.
                  p.id === activePeerId && 'bg-primary/15 hover:bg-primary/20',
                )}
              >
                {/* profil fotoğrafı + durum noktası (yeşil/kırmızı/sarı) */}
                <span className="relative size-9 shrink-0">
                  <span className="flex size-9 items-center justify-center overflow-hidden rounded-full bg-primary/15 text-xs font-semibold text-primary">
                    {p.avatarUrl
                      ? <img src={p.avatarUrl} alt="" className="size-full object-cover" />
                      : p.name.slice(0, 2).toUpperCase()}
                  </span>
                  <PresenceDot presence={p.presence} t={t} />
                </span>
                {/* KOMPAKT modda isim/son mesaj YOK — yalnız avatar (istek 3). */}
                {panelOpen && (
                  <>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium">
                        {p.name}
                      </span>
                      {/* Yazan kişide son mesaj satırı yerine MAVİ "@kullanıcı
                          yazıyor…" görünür (2026-10-12 kullanıcı isteği). Kendi
                          satırımızda gösterilmez — insan kendi yazdığını görmez. */}
                      {p.typing && p.id !== selfId
                        ? (
                            <span className="block truncate text-xs text-primary">
                              {typingLabel([p.username], t)}
                            </span>
                          )
                        : (
                            <span className="block truncate text-xs text-foreground-500">
                              {/*
                                ÖNİZLEME (2026-10-13 kullanıcı isteği): satır eskiden
                                her zaman KARŞI TARAFIN adını (`@kullanıcı`) gösterip
                                sonra mesajı ekliyordu — mesajı ben yazsam bile
                                "@tarikelertr · Merhaba 👋" görünüyordu. Artık gönderen
                                `last_sender_name`den gelir (sunucu her gönderimde
                                yazar); hiç mesaj yoksa boş durum metni gösterilir.
                              */}
                              {/*
                                LİSTE TİKİ (2026-10-16 kullanıcı isteği: "sohbet
                                listesindeki tikler de aynı kaynaktan türesin").
                                Son mesaj BENİMSEM durumu `tickForFlags` ile AYNI
                                karardan geçer — balondaki tikle asla çelişmez.
                              */}
                              {p.lastMessage?.mine && (
                                <ListTick
                                  tick={tickForFlags(p.lastMessage, { selfChat: p.id === selfId })}
                                  t={t}
                                />
                              )}
                              {p.preview
                                ? `${p.previewSender ? `@${p.previewSender} · ` : ''}${p.preview}`
                                : t('chat.empty')}
                            </span>
                          )}
                    </span>
                    {(p.important || p.favorite || p.blocked
                      || (!!p.mutedUntil && new Date(p.mutedUntil).getTime() > Date.now())) && (
                      <span className="ml-auto shrink-0 text-xs" aria-hidden="true">
                      {!!p.mutedUntil && new Date(p.mutedUntil).getTime() > Date.now()
                        ? <BellOffIcon size={12} className="text-foreground-400" />
                        : p.blocked ? (
                          <BanIcon size={12} className="text-foreground-400" />
                        ) : p.important ? (
                          <PinIcon size={12} className="text-foreground-400" />
                        ) : (
                          <StarIcon size={12} className="text-foreground-400" />
                        )}
                      </span>
                    )}
                  </>
                )}
              </button>
            </div>
          ))}
        </div>

        {profilePeer && (
          <ProfileSheet peer={profilePeer} t={t} onClose={() => setProfilePeer(null)} />
        )}
      </aside>
      )}

      {hasOthers !== false && (
      <div
        role="separator"
        aria-orientation="vertical"
        aria-label={t('chat.resizePanel')}
        tabIndex={0}
        onPointerDown={startResize}
        onKeyDown={resizeByKey}
        className="w-1 shrink-0 cursor-ew-resize bg-foreground/10 transition-colors hover:bg-primary/40"
      />
      )}

      {/* ── SAĞ: seçili kişiyle sohbet ──
          Her genişlikte GÖRÜNÜR (`flex`): liste kaplaması kaldırıldı, iki panel
          yan yana durur (kullanıcı isteği: "geniş ekrandaki iki panelli düzen
          korunsun"). Kişi seçilmemişse içeride boş durum metni çıkar. */}
      <section className="flex min-h-0 min-w-0 flex-1 flex-col">
        {/* başlık: seçili kişinin adı + durum noktası. Sağ tık / uzun basma →
            KİŞİ menüsü (kullanıcı isteği: "üstte ismi oluyor ya, ordaki kısma
            da sağ tıklayabilelim"); seçili kişi yoksa boş alan menüsü. */}
        <div
          data-peer-id={activePeer?.id}
          onContextMenu={(e) => {
            if (activePeer && isAdmin) {
              // Satırdakiyle AYNI menü (profil/takma ad/favori/engelle/…).
              e.preventDefault()
              e.stopPropagation()
              setMenu({ kind: 'peer', peer: activePeer, ...menuPoint(e) })
              return
            }
            onAreaContextMenu(e)
          }}
          {...peerLongPress}
          className="flex items-center gap-2 border-b border-foreground/10 px-4 py-3"
        >
          {/* YAN PANEL düğmesi (2026-10-13 kullanıcı isteği: "hamburger tam
              ekran liste açmasın, paneli genişletip daraltsın"). HER genişlikte
              ve kişi seçilmemişken de görünür — liste artık kaplama değil, hep
              yan yana duran bir sütundur. */}
          <button
            type="button"
            data-testid="chat-panel-toggle"
            onClick={togglePanel}
            title={t('chat.togglePanel')}
            aria-label={t('chat.togglePanel')}
            aria-expanded={panelOpen}
            className="grid h-9 w-9 shrink-0 cursor-pointer place-items-center rounded-lg transition-colors hover:bg-foreground/10"
          >
            <MenuIcon size={20} />
          </button>
          {activePeer
            ? (
                <>
                  <span className="relative size-8 shrink-0">
                    <span className="flex size-8 items-center justify-center overflow-hidden rounded-full bg-primary/15 text-[10px] font-semibold text-primary">
                      {activePeer.avatarUrl
                        ? <img src={activePeer.avatarUrl} alt="" className="size-full object-cover" />
                        : activePeer.name.slice(0, 2).toUpperCase()}
                    </span>
                    <PresenceDot presence={activePeer.presence} t={t} />
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-sm font-semibold">{activePeer.name}</span>
                    {/* Adın ALTINDA aynı mavi "yazıyor…" satırı (2026-10-12). */}
                    {activePeer.typing && activePeer.id !== selfId && (
                      <span className="truncate text-xs text-primary">
                        {typingLabel([activePeer.username], t)}
                      </span>
                    )}
                  </span>
                </>
              )
            : <span className="min-w-0 flex-1 truncate text-sm font-semibold">{t('chat.pageTitle')}</span>}
          {/* ⋮ — açık sohbetin SAĞ ÜSTÜNDE üç nokta (2026-11-08, WhatsApp tarzı):
              sağ tıktaki kişi menüsüyle aynı seçenekler burada da olur. */}
          {activePeer && (
            <button
              type="button"
              aria-label={t('chat.options')}
              title={t('chat.options')}
              aria-expanded={menu?.kind === 'peer' && menu.peer.id === activePeer.id}
              onClick={(e) => {
                const r = e.currentTarget.getBoundingClientRect()
                setMenu({ kind: 'peer', peer: activePeer, x: r.right - 240, y: r.bottom + 4 })
              }}
              className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-lg text-foreground/70 transition-colors hover:bg-foreground/10 hover:text-foreground"
            >
              <MoreVerticalIcon size={19} />
            </button>
          )}
          {/*
            "Önemli kişi olarak işaretle" ARTIK BURADA DEĞİL (2026-10-13 kullanıcı
            isteği): o kişiye SAĞ TIK menüsünde durur (bkz. PeerMenu).
          */}
        </div>
        {/*
          HATA ARTIK TAM EKRANI KAPLAMAZ (kullanıcı isteği 2026-10-12:
          "erişim yok ekranı diye bişey olmaz") — sohbetin üstünde bant olur.
        */}
        {error && (
          <p role="alert" className="border-b border-foreground/10 bg-red-500/10 px-4 py-2 text-xs text-danger">
            {error}
          </p>
        )}
        {/* KISA BİLDİRİM (2026-10-16): "Mesaj bulunamadı" gibi — kendiliğinden
            kaybolur (`notice` zamanlayıcısı yukarıda). */}
        {notice && (
          <p role="status" className="border-b border-foreground/10 bg-foreground/5 px-4 py-2 text-xs text-foreground-500">
            {notice}
          </p>
        )}

        {/* SABİTLENENLER ŞERİDİ (2026-11-08): WhatsApp tarzı — tıklayınca ilgili
            mesaja kayar, sıradaki sabit öne geçer; sağdaki ok arama listesi açar;
            raptiye İKONU RENGİSİZ (kullanıcı isteği). */}
        {threadOpen && pinActive && (
          <div
            className="relative border-b border-foreground/10 bg-foreground/[0.06]"
            onContextMenu={(e) => {
              e.preventDefault()
              setPinBannerMenu({ x: e.clientX, y: e.clientY })
            }}
          >
            <div className="flex items-center gap-2 px-3 py-1.5">
              <PinIcon size={15} className="shrink-0 text-foreground-500" aria-hidden />
              <button
                type="button"
                className="min-w-0 flex-1 cursor-pointer truncate text-left text-[12px] leading-snug text-foreground-600 hover:text-foreground"
                onClick={() => {
                  jumpToMessage(pinActive.id)
                  setPinCursor(c => (pinned.length ? (c + 1) % pinned.length : 0))
                }}
                title={pinLabel(pinActive)}
              >
                {pinLabel(pinActive)}
              </button>
              <span className="shrink-0 text-[10px] tabular-nums text-foreground-500">
                {(((pinCursor % pinned.length) + pinned.length) % pinned.length) + 1}
                /
                {pinned.length}
              </span>
              <button
                type="button"
                aria-label="Sabitlenmiş mesajlar"
                title="Sabitlenmiş mesajlar"
                aria-expanded={pinListOpen}
                onClick={() => {
                  setPinListOpen(o => !o)
                  setPinSearchQ('')
                }}
                className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-full text-foreground-500 transition-colors hover:bg-foreground/10 hover:text-foreground"
              >
                <ChevronDownIcon size={18} />
              </button>
            </div>
            {pinListOpen && (
              <div
                className="absolute right-2 top-full z-40 mt-1 w-72 overflow-hidden rounded-xl border border-foreground/15 bg-background shadow-2xl shadow-black/40"
                onClick={e => e.stopPropagation()}
              >
                <div className="flex items-center gap-1.5 border-b border-foreground/10 px-2.5 py-2">
                  <SearchIcon size={14} className="shrink-0 text-foreground-500" />
                  <input
                    autoFocus
                    value={pinSearchQ}
                    onChange={e => setPinSearchQ(e.target.value)}
                    placeholder="Sabitlenmiş mesajlarda ara…"
                    aria-label="Sabitlenmiş mesajlarda ara"
                    className="h-7 w-full bg-transparent text-xs outline-none placeholder:text-foreground-500"
                  />
                </div>
                <ul className="max-h-64 overflow-y-auto py-1">
                  {pinFiltered.length === 0 && (
                    <li className="px-3 py-3 text-center text-[11px] text-foreground-500">Sonuç yok</li>
                  )}
                  {pinFiltered.map(m => (
                    <li key={m.id}>
                      <button
                        type="button"
                        onClick={() => {
                          const i = pinned.findIndex(p => p.id === m.id)
                          setPinCursor(i >= 0 ? i : 0)
                          jumpToMessage(m.id)
                          setPinListOpen(false)
                        }}
                        className="flex w-full cursor-pointer items-start gap-2 px-3 py-2 text-left transition-colors hover:bg-foreground/5"
                      >
                        <PinIcon size={13} className="mt-0.5 shrink-0 text-foreground-400" />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-xs">{pinLabel(m)}</span>
                          <span className="block text-[10px] text-foreground-500">
                            {new Date(m.created_at).toLocaleString('tr', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* OKUNMAMIŞ BÖLÜCÜ (2026-11-08, WhatsApp): pin şeridinin ALTINDA;
            başkasından gelen okunmamışları sayar, tıklayınca İLK okunmamışa kayar.
            Görünce 'read' işlenir → sayı düşer ve bölücü kaybolur. */}
        {threadOpen && unreadMessages.length > 0 && (
          <div className="flex items-center justify-center border-b border-foreground/10 py-1.5">
            <button
              type="button"
              className="flex cursor-pointer items-center gap-1.5 rounded-full border border-foreground/10 bg-foreground/10 px-3 py-1 text-[11px] font-semibold text-foreground-600 shadow-sm transition-colors hover:bg-foreground/20 hover:text-foreground"
              onClick={() => jumpToMessage(unreadMessages[0].id)}
            >
              <ChevronDownIcon size={14} />
              {t('chat.unreadCount').replace('{n}', String(unreadMessages.length))}
            </button>
          </div>
        )}

        {/* ADMIN "Sohbeti Temizle" GERİ AL (2026-11-08, kullanıcı isteği): sıradan
            kullanıcı için geri dönüş yoktur; admin kendi temizliğini geri sarabilir. */}
        {isAdmin && undoClear && (
          <div role="status" className="flex items-center justify-between gap-3 border-b border-foreground/10 bg-foreground/5 px-4 py-2 text-xs">
            <span>Sohbet senin için temizlendi.</span>
            <button
              type="button"
              className="cursor-pointer rounded-md px-2 py-1 font-semibold text-primary transition-colors hover:bg-primary/10"
              onClick={() => {
                void (async () => {
                  try {
                    await fetch('/api/chat', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ action: 'unhide', conversationId: undoClear.conversationId }),
                    })
                    setUndoClear(null)
                    await load()
                  }
                  catch {
                    setError(t('chat.error'))
                  }
                })()
              }}
            >
              Geri al
            </button>
          </div>
        )}

        {/* mesajlar — kaydırma BURADA olur, sayfada değil (bkz. scrollToBottom).
            `touch-pan-y`: yatay jest tarayıcıya bırakılmaz (kaydırarak yanıtla
            için), dikey kaydırma normal çalışır (kullanıcı isteği). İki olay
            kaynağı (uzun basma menüsü + kaydırarak yanıtla) TEK kapsayıcıda
            elle birleştirilir — spread sırası birini ezerdi. */}
        <div
          ref={listRef}
          className="min-h-0 flex-1 touch-pan-y space-y-2 overflow-y-auto px-4 py-4"
          onContextMenu={onAreaContextMenu}
          onPointerDown={(e) => {
            messageLongPress.onPointerDown(e)
            swipeReply.onPointerDown(e)
          }}
          onPointerMove={(e) => {
            messageLongPress.onPointerMove(e)
            swipeReply.onPointerMove(e)
          }}
          onPointerUp={(e) => {
            // uzun basma iptali argümansız; kaydırma "bıraktı mı?" kararına bakar
            messageLongPress.onPointerUp()
            swipeReply.onPointerUp(e)
          }}
          onPointerCancel={() => {
            messageLongPress.onPointerCancel()
            swipeReply.onPointerCancel()
          }}
          onPointerLeave={() => {
            messageLongPress.onPointerLeave()
            swipeReply.onPointerLeave()
          }}
          onClickCapture={messageLongPress.onClickCapture}
        >
          {/*
            "Soldan bir kişi seç" boş-durum satırı KALDIRILDI (2026-11-08,
            kullanıcı isteği): "yenilerken o olmasın kaldır çünkü saten
            her türlü biri seçili olacak". Sohbet sayfası açılınca son
            açılan kişi zaten kendiliğinden açılır; boş durum asla çizilmez.
          */}
          {/* Yüklenirken iskelet — ekranı kaplayan "Sohbet yükleniyor…" yok */}
          {threadOpen && loading && <ChatSkeleton label={t('chat.loading')} />}
          {/* Boş sohbet: metin TIKLANABİLİR (2026-10-12 kullanıcı isteği) —
              kullanıcının dilinde "Merhaba 👋" gönderilir. Gönderim sürerken
              devre dışı: çift tıklamada iki mesaj gitmez. */}
          {threadOpen && !loading && messages.length === 0 && (
            <div className="pt-8 text-center">
              <button
                type="button"
                onClick={() => {
                  void send(helloMessage(helloLocale))
                }}
                disabled={sending}
                className={cn(
                  'inline-flex items-center justify-center gap-1.5 cursor-pointer rounded-lg border border-primary-fg bg-primary px-4 py-2 text-sm font-semibold text-primary-fg transition-colors hover:bg-primary/90',
                  sending && 'cursor-not-allowed opacity-60',
                )}
              >
                <SendIcon size={16} />
                {t('chat.emptyThread')}
              </button>
            </div>
          )}
          {/* KONU (THREAD) BAŞLIĞI KALDIRILDI (2026-11-08, kullanıcı isteği) */}
          {threadOpen && messages.map((m, i) => {
            const mine = m.sender_id === myId
          const replied = replyTo?.id === m.id
          const tick = mine
            ? tickFor(m, { pending: m._pending, failed: m._failed, selfChat })
            : null
          /*
            GÖNDEREN SATIRI (2026-10-13 kullanıcı isteği): balonun üstünde küçük
            "@kullanıcı" satırı durur. ART ARDA gelen aynı gönderenin mesajlarında
            TEKRARLANMAZ (gruplama). Kendi mesajlarımda gösterilmez: sağdaki mavi
            hizalama zaten kimin yazdığını söyler ve tek kişilik sohbette
            kendi adını okumak gürültüdür.
          */
          const showSender = !mine && (i === 0 || messages[i - 1]?.sender_id !== m.sender_id)
          /*
            ALINTI BLOĞU (2026-10-16 kullanıcı isteği): balonun içinde, mesaj
            metninin ÜSTÜNDE. Metin sunucudan `reply_to` özetiyle gelir; silinmiş
            mesajın metni hiç gönderilmez → "Bu mesaj silindi" yazılır.
            Renk gönderene göre SABİT (kendi mesajımda mavi).
          */
          const quote = m.reply_to ?? null
          const quoteMine = !!quote && quote.sender_id === myId
          const quoteAcc = quote ? quoteAccent(quote.sender_id, quoteMine, mine) : null
          const quoteText = quote
            ? (quote.deleted
                ? t('chat.deletedMessage')
                : quote.text || t(replyPlaceholderKey(quote.kind)))
            : ''

          /* TARİH AYIRICI (2026-11-02): önceki mesaj farklı gündeyse ayırıcı göster.
             2026-11-08 kullanıcı isteği: "8.11.2026 (Bugün)" biçimi — gün adı yerine
             sayısal tarih; bugün/dün/dünün öncesi aynı gündeyse parantez eklenir. */
          const prevDay = i > 0 ? new Date(messages[i - 1].created_at).toDateString() : null
          const currDay = new Date(m.created_at).toDateString()
          const showDateSeparator = i === 0 || prevDay !== currDay

          const dateLabel = (() => {
            const d = new Date(m.created_at)
            const now = new Date()
            const dayDiff = Math.floor(
              (new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
                - new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()) / 86400000,
            )
            const dateStr = `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}`
            if (dayDiff === 0)
return `${dateStr} (${t('chat.today')})`
            if (dayDiff === 1)
return `${dateStr} (${t('chat.yesterday')})`
            if (dayDiff === 2)
return `${dateStr} (${t('chat.twoDaysAgo')})`
            return dateStr
          })()

          return (
            <React.Fragment key={m.id}>
              {showDateSeparator && (
                <div className="mb-2 flex w-full items-center gap-3">
                  {/* Tarihten ÖNCE ve SONRA çizgi (2026-11-08, kullanıcı isteği) */}
                  <span aria-hidden className="h-px min-w-0 flex-1 bg-foreground/15" />
                  <span
                    className="shrink-0 rounded-full border border-foreground/10 bg-foreground/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-foreground-500 shadow-sm"
                  >
                    {dateLabel}
                  </span>
                  <span aria-hidden className="h-px min-w-0 flex-1 bg-foreground/15" />
                </div>
              )}
              <div
                key={m.id}
                data-replied={replied || undefined}
                className={cn(
                'relative flex w-full flex-col rounded-xl group/msg',
                mine ? 'items-end' : 'items-start',
                // Vurgu: alıntıya tıklanınca kaydırılan mesaj ~2 sn parlar.
                flashId === m.id && 'msg-flash',
              )}
              >
              {/* Kaydırma sırasında beliren yanıt oku (mobil) — `useSwipeReply`
                  opacity/scale'i doğrudan yazar (her karede render olmasın). */}
              <span
                data-reply-hint=""
                aria-hidden="true"
                className="pointer-events-none absolute top-1/2 left-0 -translate-y-1/2 text-primary opacity-0"
              >
                <ReplyIcon size={18} />
              </span>
              {showSender && (
                <span className="mb-0.5 px-1 text-[10px] text-foreground-500">
                  @
                  {m.sender_name}
                </span>
              )}
              <div
                className={cn(
                  'flex min-w-0 max-w-[80%] items-center gap-1',
                  mine ? 'flex-row-reverse' : 'flex-row',
                )}
              >
                <div
                  id={`msg-${m.id}`}
                  data-message-id={m.id}
                  data-class={cn(
                    'min-w-0 max-w-full rounded-2xl px-3 py-2 text-sm',
                    mine ? 'bg-primary text-primary-fg' : 'bg-foreground/10 text-foreground',
                    replied && 'ring-2 ring-primary',
                  )}
                  onContextMenu={(e) => {
                    // Menü İMLECİN konumunda (eskiden tam ekran ortalanmış diyalogdu).
                    // `stopPropagation`: kapsayıcının BOŞ ALAN menüsü üzerine yazmasın.
                    e.preventDefault()
                    e.stopPropagation()
                    setMenu({ kind: 'message', message: m, ...menuPoint(e) })
                  }}
                  onClick={() => {
                    if (replied)
jumpToMessage(m.id)
                    // Bir mesaja tıklanınca değeri metin alanına düşür (admin düzenleme için).
                    const configValue = m.kind === 'image' || m.kind === 'audio' || m.kind === 'video' || m.kind === 'file'
                      ? `${m.file_name || 'dosya'}: ${m.file_url}`
                      : m.text || ''
                    onConfigUpdate?.(configValue)
                    // Tıklanan mesajın id ve class bilgisini döndür
                    const el = document.getElementById(`msg-${m.id}`)
                    if (el) {
                      onMessageClick?.({ id: m.id, className: el.className })
                    }
                  }}
                  className={cn(
                    'min-w-0 max-w-full rounded-2xl px-3 py-2 text-sm',
                    mine ? 'bg-primary text-primary-fg' : 'bg-foreground/10 text-foreground',
                    replied && 'ring-2 ring-primary',
                  )}
                >
                  {quote && quoteAcc && (
                    <button
                      type="button"
                      role="button"
                      aria-label={t('chat.replyJump')}
                      title={t('chat.replyJump')}
                      onClick={(e) => {
                        // Balonun kendi tıklaması (vurgu halkası) ile karışmasın.
                        e.stopPropagation()
                        jumpToMessage(quote.id)
                      }}
                      className={cn(
                        'mb-1 flex w-full min-w-0 cursor-pointer items-stretch gap-2 overflow-hidden rounded-md border-l-2 py-1 pr-1 pl-2 text-left transition-colors',
                        quoteAcc.bar,
                        mine ? 'bg-black/20 hover:bg-black/30' : 'bg-foreground/10 hover:bg-foreground/20',
                      )}
                    >
                      <span className="min-w-0 flex-1">
                        <span className={cn('block truncate text-[11px] font-semibold', quoteAcc.text)}>
                          {/*
                            Gönderen adı SİLİNMİŞ alıntıda da yazılır: gizlenmesi
                            gereken İÇERİKTİR, kimin yazdığı değil. Aksi hâlde
                            alıntının üstünde boş bir satır kalırdı.
                          */}
                          {replySenderLabel(quote, myId, t('chat.you'))}
                        </span>
                        <span className={cn(
                          'line-clamp-2 text-[11px] break-words',
                          quote.deleted ? 'italic opacity-70' : 'opacity-90',
                        )}
                        >
                          {quoteText}
                        </span>
                      </span>
                      {!quote.deleted && quote.kind === 'image' && quote.file_url && (
                        <img src={quote.file_url} alt="" className="size-9 shrink-0 rounded-sm object-cover" />
                      )}
                    </button>
                  )}
                  {!m.deleted_for_all && mediaKindOf(m) === 'image' && m.file_url && (
                    <>
                      <MediaCaption fileName={m.file_name ?? null} mine={mine} />
                      {/* Sohbet görselleri kullanıcı yüklemesi; next/image gerekmez.
                          Tıklanınca lightbox açılır (ad/benzeri, ok tuşları, zoom, tekerlek). */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          openGallery(m)
                        }}
                        className="shrink-0 cursor-pointer hover:opacity-80 transition-opacity"
                      >
                        <img
                          src={m.file_url}
                          alt={m.file_name ?? ''}
                          className="mb-1 max-h-48 rounded-lg object-cover"
                        />
                      </button>
                    </>
                  )}
                  {!m.deleted_for_all && mediaKindOf(m) === 'audio' && m.file_url && (
                    <>
                      <MediaCaption fileName={m.file_name ?? null} mine={mine} />
                      <AudioMessage src={m.file_url} fileName={m.file_name} mine={mine} />
                    </>
                  )}
                  {!m.deleted_for_all && mediaKindOf(m) === 'video' && m.file_url && (
                    <>
                      <MediaCaption fileName={m.file_name ?? null} mine={mine} />
                      <VideoMessage src={m.file_url} fileName={m.file_name} mine={mine} onOpen={() => openGallery(m)} />
                    </>
                  )}
                  {!m.deleted_for_all && m.kind === 'file' && m.file_url && (
                    <a href={m.file_url} target="_blank" rel="noopener noreferrer" className="mb-1 underline">
                      <PaperclipIcon size={14} className="text-foreground-400" />
                      {' '}
                      {m.file_name}
                    </a>
                  )}
                  {!m.deleted_for_all && m.kind === 'poll' && polls[m.id] && (
                    <div className="mb-2 mt-1 p-3 rounded-lg border border-foreground/10 bg-foreground/5">
                      <div className="mb-2 text-xs font-semibold text-foreground">
                        {t('chat.poll')}
:
{polls[m.id].question}
                      </div>
                      {polls[m.id].options.map((opt, i) => {
                        const voted = polls[m.id].user_vote === i
                        return (
                          <button
                            key={i}
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              togglePollVote(m.id, i)
                            }}
                            disabled={polls[m.id].is_closed}
                            className={cn(
                              'w-full flex items-center justify-between gap-2 rounded px-2 py-1.5 text-sm transition-colors',
                              voted ? 'bg-primary text-primary-fg' : 'hover:bg-foreground/10',
                              polls[m.id].is_closed ? 'opacity-60 cursor-not-allowed' : '',
                            )}
                          >
                            <span className="flex-1 truncate">{opt.text}</span>
                            <span className="shrink-0 text-[10px]">
                              {opt.votes}
{' '}
{t('chat.pollVote')}
                            </span>
                          </button>
                        )
                      })}
                      <div className="mt-2 flex items-center gap-1 text-[10px] text-foreground-500">
                        {polls[m.id].is_closed ? (
                          <span className="text-danger">{t('chat.pollClosed')}</span>
                        ) : polls[m.id].user_vote !== null ? (
                          <span className="text-primary">{t('chat.pollVoted')}</span>
                        ) : (
                          <span>{t('chat.pollVote')}</span>
                        )}
                      </div>
                    </div>
                  )}
                  {m.deleted_for_all
                    ? <em className="opacity-70">{t('chat.deletedByYou')}</em>
                    : (
                        <>
                          {m.pinned && <PinIcon size={12} className="mr-1 inline-block text-foreground-400 align-[-1px]" />}
                          <span className="break-words">{m.text}</span>
                        </>
                      )}
                  {/* tikler — durum kararı `lib/chat-ticks.ts`te (saf + testli):
                      soluk tek tik = gönderildi · soluk çift tik = iletildi
                      (alıcı çevrimdışıysa BURADA KALIR) · mavi çift tik = okundu.
                      Saat = gönderiliyor, kırmızı ünlem = başarısız (tekrar dene). */}
                  <span className="ml-2 inline-flex items-center gap-0.5 align-middle text-[10px]">
                    <span>{new Date(m.created_at).toLocaleTimeString('tr', { hour: '2-digit', minute: '2-digit' })}</span>
                    {tick && (m._failed
                      ? (
                          <button
                            type="button"
                            data-testid="chat-retry"
                            onClick={(e) => {
                              e.stopPropagation()
                              void retry(m)
                            }}
                            title={t('chat.retrySend')}
                            aria-label={t('chat.retrySend')}
                            className={cn('inline-flex shrink-0 cursor-pointer items-center', tick.color)}
                          >
                            <ErrorIcon size={14} />
                          </button>
                        )
                      : (
                          <span
                            className={cn('inline-flex shrink-0', tick.color)}
                            role="img"
                            title={t(tick.labelKey)}
                            aria-label={t(tick.labelKey)}
                          >
                            {m._pending
                              ? <ClockIcon size={12} />
                              : tick.double ? <TickReadIcon size={14} /> : <TickSentIcon size={14} />}
                          </span>
                        ))}
                  </span>
                </div>
                {/* Mesaj menüsü (yanıt) — HER ZAMAN görünmez; yalnız satırın
                    üzerindeyken (y ve x genişliği: yan panele kadar) belirir. */}
                <button
                  type="button"
                  data-testid="chat-reply-button"
                  aria-label={t('chat.reply')}
                  title={t('chat.reply')}
                  onClick={(e) => {
                    e.stopPropagation()
                    startReply(m.id)
                  }}
                  className="pointer-events-none shrink-0 cursor-pointer rounded-full p-1.5 text-foreground-500 opacity-0 transition-opacity duration-150 hover:bg-foreground/10 hover:text-foreground focus-visible:pointer-events-auto focus-visible:opacity-100 group-hover/msg:pointer-events-auto group-hover/msg:opacity-100"
                >
                  <ReplyIcon size={16} />
                </button>
                {/* TEPKİ DÜĞMESİ (2026-11-08, WhatsApp tarzı): şeridi açar. */}
                <button
                  type="button"
                  aria-label={t('chat.react')}
                  title={t('chat.react')}
                  onClick={(e) => {
                    e.stopPropagation()
                    setStripFor(prev => (prev === m.id ? null : m.id))
                    setPickerFor(null)
                    setReactionPanelFor(null)
                  }}
                  className="pointer-events-none shrink-0 cursor-pointer rounded-full p-1.5 text-foreground-500 opacity-0 transition-opacity duration-150 hover:bg-foreground/10 hover:text-foreground focus-visible:pointer-events-auto focus-visible:opacity-100 group-hover/msg:pointer-events-auto group-hover/msg:opacity-100"
                >
                  <SmileFaceIcon size={16} />
                </button>
                {/* Tepki: şerit + picker "+"ya bitişik açılır (2026-11-08, kullanıcı isteği) */}
                {(stripFor === m.id || pickerFor === m.id) && (
                  <div
                    data-reaction-popover
                    className={cn(
                      'absolute top-full z-30 mt-1 flex flex-col overflow-hidden rounded-2xl border border-foreground/10 bg-background shadow-xl',
                      mine ? 'right-0 items-end' : 'left-0 items-start',
                    )}
                    onClick={e => e.stopPropagation()}
                  >
                    <div className="flex items-center gap-0.5 px-1.5 py-1">
                      {QUICK_REACTIONS.map(emoji => (
                        <button
                          key={emoji}
                          type="button"
                          onClick={() => {
                            void reactTo(m.id, emoji)
                            setStripFor(null)
                            setPickerFor(null)
                          }}
                          aria-label={emoji}
                          className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full text-lg transition-transform hover:scale-125"
                        >
                          {emoji}
                        </button>
                      ))}
                      <button
                        type="button"
                        onClick={() => setPickerFor(prev => (prev === m.id ? null : m.id))}
                        aria-pressed={pickerFor === m.id}
                        aria-label={t('chat.addReaction')}
                        title={t('chat.addReaction')}
                        className={cn(
                          'flex h-9 w-9 cursor-pointer items-center justify-center rounded-full text-foreground-500 transition-colors hover:bg-foreground/10 hover:text-foreground',
                          pickerFor === m.id && 'bg-foreground/10 text-foreground',
                        )}
                      >
                        <PlusIcon size={16} />
                      </button>
                    </div>
                    {/* Tam seçici — her zaman "+"nın hemen altında, bitişik */}
                    {pickerFor === m.id && (
                      <div className="w-[320px] border-t border-foreground/10 bg-surface-1">
                        <EmojiPicker
                          locale={locale}
                          onPick={(emoji) => {
                            void reactTo(m.id, emoji)
                            setPickerFor(null)
                            setStripFor(null)
                          }}
                          onClose={() => setPickerFor(null)}
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>
                {/* Tepki pill'leri — balonun altında (sayı yalnız 1+) */}
                {(m.reactions?.length ?? 0) > 0 && (
                  <div
                    className={cn('mt-1 flex flex-wrap gap-1', mine ? 'justify-end' : 'justify-start')}
                    onClick={e => e.stopPropagation()}
                  >
                    {groupReactions(m.reactions ?? []).map(({ emoji, users }) => {
                      const mineReacted = users.some(u => u.userId === myId)
                      return (
                        <button
                          key={emoji}
                          type="button"
                          onClick={() => setReactionPanelFor(prev => (prev === m.id ? null : m.id))}
                          aria-label={t('chat.react')}
                          className={cn(
                            'inline-flex cursor-pointer items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] leading-5 transition-colors',
                            mineReacted
                              ? 'border-primary/50 bg-primary/15 text-primary'
                              : 'border-foreground/10 bg-foreground/10 text-foreground hover:bg-foreground/15',
                          )}
                        >
                          <span>{emoji}</span>
                          {users.length > 1 && (
                            <span className="text-[10px] font-semibold tabular-nums">{users.length}</span>
                          )}
                        </button>
                      )
                    })}
                  </div>
                )}
                {/* "Kim tepki verdi" paneli — avatar + ad + emoji; benimki "Siz" + kaldır */}
                {reactionPanelFor === m.id && (
                  <div
                    data-reaction-popover
                    className={cn(
                      'absolute top-full z-30 mt-1 w-64 overflow-hidden rounded-xl border border-foreground/10 bg-background shadow-xl',
                      mine ? 'right-0' : 'left-0',
                    )}
                    onClick={e => e.stopPropagation()}
                  >
                    <div className="border-b border-foreground/10 px-3 py-2 text-xs font-semibold text-foreground">
                      {t('chat.reactors', { count: m.reactions?.length ?? 0 })}
                    </div>
                    <div className="max-h-56 overflow-y-auto p-1">
                      {groupReactions(m.reactions ?? []).map(({ emoji, users }) => (
                        users.map(u => (
                          <button
                            key={`${emoji}-${u.userId}`}
                            type="button"
                            onClick={() => {
                              // Yalnızca kendi satırım tıklanabilir: tepkiyi kaldırır
                              if (u.userId === myId) {
                                void reactTo(m.id, emoji)
                              }
                            }}
                            aria-label={u.userId === myId ? t('chat.removeReaction') : undefined}
                            className={cn(
                              'flex w-full cursor-pointer items-center gap-2.5 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-foreground/5',
                              u.userId === myId && 'bg-foreground/5',
                            )}
                          >
                            <span className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-foreground/10 text-[11px] font-semibold text-foreground-500">
                              {u.avatarUrl
                                ? <img src={u.avatarUrl} alt="" className="h-full w-full object-cover" />
                                : initialsOf(u.nickname || u.fullName || u.username)}
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-xs font-medium text-foreground">
                                {u.userId === myId ? t('chat.you') : (u.nickname || u.fullName || u.username || '—')}
                              </span>
                              {u.userId === myId && (
                                <span className="block truncate text-[10px] text-foreground-500">
                                  {t('chat.removeReaction')}
                                </span>
                              )}
                            </span>
                            <span className="shrink-0 text-base leading-none">{emoji}</span>
                          </button>
                        ))
                      ))}
                    </div>
                  </div>
                )}
            </div>
            </React.Fragment>
          )
          })}
        </div>

        {/* yazma alanı — kişi seçilmeden gösterilmez.
            `shrink-0` + `env(safe-area-inset-bottom)`: klavye açıldığında
            (kart `dvh` ile küçülür) giriş alanı kırpılmaz, çentikli ekranda
            alt güvenli alan kadar içeriden boşluk bırakır. */}
        {threadOpen && (
          <div className="shrink-0 border-t border-foreground/10 px-3 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
        {/* YANIT ÖNİZLEMESİ (2026-10-16 kullanıcı isteği). Giriş çubuğunun
            ÜSTÜNDE, onunla AYNI genişlikte/hizada (aynı kapsayıcı içinde).
            Sol renkli dikey çizgi gönderene göre sabittir; kendi mesajım için
            "Sen" yazar. Medya varsa küçük önizleme/etiket çıkar. Esc, ✕ veya
            gönderim kapatır; sohbet değişince temizlenir. */}
        {replyLive && (
          <div
            data-testid="chat-reply-preview"
            className={cn(
              'mb-2 flex items-center gap-2 rounded-lg border-l-2 py-1.5 pr-1 pl-3 text-xs',
              quoteAccent(replyLive.sender_id, replyLive.sender_id === myId, false).bar,
              'bg-foreground/10',
            )}
          >
            <div className="min-w-0 flex-1">
              <p className="truncate text-[11px] font-semibold text-primary">
                {replySenderLabel(replyLive, myId, t('chat.you'))}
              </p>
              <p className={cn(
                'line-clamp-2 text-[11px] break-words text-foreground-500',
                replyLive.deleted_for_all && 'italic',
              )}
              >
                {replyLive.deleted_for_all
                  ? t('chat.deletedMessage')
                  : (replyLive.text || t(replyPlaceholderKey(replyLive.kind)))}
              </p>
            </div>
            {!replyLive.deleted_for_all && replyLive.kind === 'image' && replyLive.file_url && (
              <img src={replyLive.file_url} alt="" className="size-9 shrink-0 rounded-sm object-cover" />
            )}
            <button
              type="button"
              onClick={() => setReplyTo(null)}
              aria-label={t('chat.cancelReply')}
              title={t('chat.cancelReply')}
              className="shrink-0 cursor-pointer rounded-full px-2 py-1 text-foreground-500 hover:bg-foreground/10 hover:text-foreground"
            >
              ✕
            </button>
          </div>
        )}
        {/* AŞAMALI DOSYALAR (2026-11-08, kullanıcı isteği): eklenen/bırakılan dosyalar
            hemen gönderilmez; gönder butonuna basmadan önce ✕ ile çıkarılabilir;
            metin, altyazı olur (WhatsApp). */}
        {staged.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-1.5">
            {staged.map(({ id, file }) => (
              <span
                key={id}
                className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-foreground/15 bg-foreground/10 py-1 pr-1 pl-2 text-[11px] text-foreground-600"
              >
                {file.type.startsWith('image/')
                  ? (
                      <img
                        src={URL.createObjectURL(file)}
                        alt=""
                        className="h-6 w-6 shrink-0 rounded object-cover"
                      />
                    )
                  : <PaperclipIcon size={12} className="shrink-0 text-foreground-400" />}
                <span className="max-w-40 truncate" title={file.name}>{file.name}</span>
                <button
                  type="button"
                  onClick={() => setStaged(prev => prev.filter(x => x.id !== id))}
                  aria-label={t('common.remove')}
                  title={t('common.remove')}
                  className="flex h-5 w-5 shrink-0 cursor-pointer items-center justify-center rounded-full text-foreground-500 transition-colors hover:bg-foreground/15 hover:text-foreground"
                >
                  <CloseIcon size={11} />
                </button>
              </span>
            ))}
          </div>
        )}
        <div className="shrink-0 flex min-h-12 items-center gap-1 rounded-full bg-foreground/10 px-3 py-1 transition-colors focus-within:bg-foreground/15">
          {/* WhatsApp tarzı tek parça "hap" yazma alanı (2026-10-13, kullanıcı):
              ikonlar ve giriş aynı kutunun içinde; sağ uç boşken MİKROFON, yazınca GÖNDER. */}
          <input
            ref={fileRef}
            type="file"
            hidden
            multiple
            onChange={(e) => {
              const files = [...(e.target.files ?? [])].slice(0, 20)
              if (files.length > 0) {
                queueFiles(files)
              }
              e.target.value = ''
            }}
          />
          {/* Klasör seçimi — içindeki tüm dosyalar kuyruğa girer; sırayla gönderilir. */}
          <input
            ref={folderRef}
            type="file"
            hidden
            multiple
            {...({ webkitdirectory: '' } as any)}
            onChange={(e) => {
              const files = [...(e.target.files ?? [])].slice(0, 20)
              if (files.length > 0) {
                queueFiles(files)
              }
              e.target.value = ''
            }}
          />
          <div className="relative shrink-0" ref={attachMenuRef}>
            <button
              type="button"
              onClick={() => setAttachMenuOpen(o => !o)}
              aria-label={t('chat.attachMenu')}
              aria-expanded={attachMenuOpen}
              title={t('chat.attachMenu')}
              className="grid h-9 w-9 cursor-pointer place-items-center rounded-full text-foreground/60 transition-colors hover:bg-foreground/10 hover:text-foreground"
            >
              <PaperclipIcon size={20} />
            </button>
            {attachMenuOpen && (
              <div className="absolute bottom-full left-0 z-30 mb-2 w-48 overflow-hidden rounded-xl border border-foreground/10 bg-background shadow-lg">
                <button
                  type="button"
                  onClick={() => { setAttachMenuOpen(false); fileRef.current?.click() }}
                  className="flex w-full cursor-pointer items-center gap-2.5 px-3 py-2.5 text-left text-sm text-foreground/80 transition-colors hover:bg-foreground/5"
                >
                  <FileIcon size={16} />
                  {t('chat.attachFile')}
                </button>
                <button
                  type="button"
                  onClick={() => { setAttachMenuOpen(false); folderRef.current?.click() }}
                  className="flex w-full cursor-pointer items-center gap-2.5 px-3 py-2.5 text-left text-sm text-foreground/80 transition-colors hover:bg-foreground/5"
                >
                  <FolderIcon size={16} />
                  {t('chat.attachFolder')}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAttachMenuOpen(false)
                    setPollDraft(p => (p ? null : { question: '', options: ['', ''], multiple: false }))
                  }}
                  className="flex w-full cursor-pointer items-center gap-2.5 px-3 py-2.5 text-left text-sm text-foreground/80 transition-colors hover:bg-foreground/5"
                >
                  <PollIcon size={16} className="shrink-0 text-foreground-500" />
                  {t('chat.attachPoll')}
                </button>
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={() => setShowEmoji(v => !v)}
            aria-label={t('chat.emoji')}
            title={t('chat.emoji')}
            aria-expanded={showEmoji}
            className="grid h-9 w-9 shrink-0 cursor-pointer place-items-center rounded-full text-foreground/60 transition-colors hover:bg-foreground/10 hover:text-foreground"
          >
            <StickerIcon size={20} />
          </button>
          {pollDraft && (
            <div className="flex w-full flex-col gap-2 pt-2 max-h-72 overflow-y-auto">
              <div className="flex items-center gap-2">
                <span className="shrink-0 text-xs font-semibold uppercase tracking-wider text-foreground-500">
                  {t('chat.pollQuestion')}
                </span>
                <input
                  value={pollDraft.question}
                  onChange={e => setPollQuestion(e.target.value)}
                  placeholder={t('chat.pollQuestionPlaceholder')}
                  className="min-w-0 flex-1 rounded-md border border-foreground/10 bg-transparent px-3 py-2 text-sm outline-none focus-visible:border-primary"
                />
              </div>
              <div className="flex w-full flex-col gap-1.5">
                <span className="shrink-0 text-xs font-semibold uppercase tracking-wider text-foreground-500">
                  {t('chat.pollOptions')}
                </span>
                {pollDraft.options.map((opt, i) => (
                  <div key={i} className="flex items-center gap-1.5">
                    <input
                      value={opt}
                      onChange={e => setPollOption(i, e.target.value)}
                      placeholder={t('chat.pollOptionPlaceholder', { n: i + 1 })}
                      className="min-w-0 flex-1 rounded-md border border-foreground/10 bg-transparent px-3 py-2 text-sm outline-none focus-visible:border-primary"
                    />
                    <button
                      type="button"
                      onClick={() => removePollOption(i)}
                      disabled={pollDraft.options.length <= 2}
                      className="shrink-0 rounded-md p-1 text-foreground/50 transition-colors hover:bg-foreground/10 disabled:opacity-40 disabled:cursor-not-allowed"
                      title={t('chat.pollRemove')}
                    >
                      <CloseIcon size={14} />
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={addPollOption}
                  className="self-start rounded-md px-3 py-1 text-xs font-medium text-foreground/70 transition-colors hover:bg-foreground/10 hover:text-foreground"
                >
                  +
{' '}
{t('chat.pollAddOption')}
                </button>
              </div>
              <div className="flex items-center justify-between gap-2">
                <label className="flex cursor-pointer items-center gap-2 text-sm text-foreground-700">
                  <input
                    type="checkbox"
                    checked={pollDraft.multiple}
                    onChange={e => setPollDraft(d => d ? { ...d, multiple: e.target.checked } : null)}
                    className="rounded border-foreground/20"
                  />
                  {t('chat.pollMultiple')}
                </label>
                <button
                  type="button"
                  onClick={sendPoll}
                  disabled={sending || !pollDraft.question.trim() || pollDraft.options.some(o => !o.trim())}
                  className="h-9 shrink-0 cursor-pointer rounded-md bg-primary px-4 text-sm font-semibold text-primary-fg transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {t('chat.pollCreate')}
                </button>
              </div>
            </div>
          )}
          <input
            ref={inputRef}
            value={draft}
            onChange={(e) => {
              setDraft(e.target.value)
              // "yazıyor" → karşı tarafta MAVİ satır (en fazla ~2 sn'de bir sinyal)
              signalTyping()
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                send()
              }
            }}
            placeholder={t('chat.placeholder')}
            aria-label={t('chat.placeholder')}
            className="chat-composer-field min-w-0 flex-1 bg-transparent px-1 text-sm outline-none placeholder:text-foreground/40"
          />
          <button
            type="button"
            data-testid="chat-send-btn"
            onClick={() => send()}
            disabled={sending || !hasDraft}
            aria-label={t('chat.send')}
            title={t('chat.send')}
            className={`grid h-10 w-10 shrink-0 cursor-pointer place-items-center rounded-full transition-colors duration-200 disabled:cursor-not-allowed disabled:opacity-60 ${sendBtnClass}`}
          >
            <SendIcon size={18} />
          </button>
        </div>
        </div>
      )}
        {/* Emoji seçici (2026-10-12): aramalı, kaydırılabilir, koyu tema —
            `emoji-picker-element`. Eski 16 emojili şerit kaldırıldı. */}
        {showEmoji && (
          <EmojiPicker
            locale={locale}
            onPick={insertEmoji}
            onClose={() => setShowEmoji(false)}
          />
        )}

      {/* Mesaj Bilgisi paneli: Okundu · Teslim edildi · Tarih (GG.AA.YYYY) */}
      {infoMsg && (
        <MessageInfo
          message={infoMsg}
          onClose={() => setInfoMsgId(null)}
          labels={{
            title: t('chat.info'),
            read: t('chat.readAt'),
            delivered: t('chat.deliveredAt'),
            notRead: t('chat.notRead'),
            notDelivered: t('chat.notDelivered'),
          }}
        />
      )}

      </section>

      {/* ── BAĞLAM MENÜLERİ: imleç konumunda; aynı anda YALNIZ BİRİ açık ── */}
      {menu?.kind === 'peer' && (
        <PeerMenu
          peer={menu.peer}
          x={menu.x}
          y={menu.y}
          t={t}
          isAdmin={isAdmin}
          onClose={() => setMenu(null)}
          onNicknameSave={async (nickname) => {
            const peer = menu.peer
            await runAdmin('nickname', peer, { nickname })
            setPeers(prev =>
              (prev ?? []).map(x => (x.id === peer.id ? { ...x, nickname: nickname || null } : x)))
            setMenu(null)
          }}
          onProfile={() => {
            setProfilePeer(menu.peer)
            setMenu(null)
          }}
          onToggle={async (action, next) => {
            const peer = menu.peer
            setMenu(null)
            await runAdmin(action, peer, { [action]: next })
            // 20 sn'lik tazelemeyi bekleme — menü hemen yeni durumu göstersin.
            setPeers(prev =>
              (prev ?? []).map((x) => {
                if (x.id !== peer.id) {
                  return x
                }
                return action === 'favorite' || action === 'important' || action === 'block'
                  ? { ...x, [action]: next }
                  : x
              }))
          }}
          onClear={async () => {
            const peer = menu.peer
            setMenu(null)
            try {
              const opened = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'open', peerId: peer.id }),
              })
              const openJson = await opened.json()
              const cid = openJson?.conversation?.id as string | undefined
              if (!cid) {
                setError(openJson?.message ?? t('chat.error'))
                return
              }
              const res = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'clear', conversationId: cid, userId: peer.id }),
              })
              if (!res.ok) {
                setError(t('chat.error'))
                return
              }
              await load()
              if (isAdmin) {
                setUndoClear({ conversationId: cid })
              }
            }
            catch {
              setError(t('chat.error'))
            }
          }}
          onDelete={async () => {
            const peer = menu.peer
            setMenu(null)
            await runAdmin('deleteConversation', peer)
          }}
          canExport={menu.peer.id === activePeerId}
          onToggleMute={() => {
            const peer = menu.peer
            setMenu(null)
            void toggleMutePeer(peer)
          }}
          onExport={() => {
            setMenu(null)
            exportChat()
          }}
        />
      )}

      {menu?.kind === 'message' && (
        <MessageMenu
          message={menu.message}
          x={menu.x}
          y={menu.y}
          onClose={() => setMenu(null)}
          onReply={() => { startReply(menu.message.id); setMenu(null) }}
          onCopy={() => copy(menu.message.text ?? '')}
          onForward={() => { setForwardMsg(menu.message); setMenu(null) }}
          onPin={() => { const msg = menu.message; setMenu(null); requestPin(msg) }}
          onInfo={() => { setInfoMsgId(menu.message.id); setMenu(null) }}
          onDelete={() => { setConfirmMsg(menu.message); setMenu(null) }}
          onReact={() => {
            // "Tepki Ekle" → şeridi aç (2026-11-08: tepki artık çalışır)
            setStripFor(menu.message.id)
            setPickerFor(null)
            setReactionPanelFor(null)
            setMenu(null)
          }}
          labels={{
            header: menu.message.text || menu.message.file_name || '',
            reply: t('chat.reply'),
            copy: t('chat.copy'),
            forward: t('chat.forward'),
            pin: menu.message.pinned ? t('chat.unpin') : t('chat.pin'),
            info: t('chat.info'),
            delete: t('chat.delete'),
            close: t('common.close'),
          }}
        />
      )}

      {/* PIN ŞERİDİ sağ tık menüsü (2026-11-08): sabitlemeyi kaldır / süresini değiştir */}
      {pinBannerMenu && pinActive && (
        <MenuSurface x={pinBannerMenu.x} y={pinBannerMenu.y} onClose={() => setPinBannerMenu(null)} label="Sabit">
          <MenuItem
            icon={<PinIcon size={14} className="text-foreground-400" />}
            label="Sabitlemeyi kaldır"
            onSelect={() => {
              const id = pinActive.id
              setPinBannerMenu(null)
              void act('pin', { messageId: id, pinned: false }).then(() => load())
            }}
          />
          <MenuItem
            icon={<ClockIcon size={14} className="text-foreground-400" />}
            label="Süresini değiştir"
            onSelect={() => {
              setPinBannerMenu(null)
              setPinChoice('7d')
              setPinCustomAt('')
              setPinDialog(pinActive)
            }}
          />
        </MenuSurface>
      )}

      {/*
        BOŞ ALAN MENÜSÜ (2026-10-13 kullanıcı isteği: "boş bir yere sağ
        tıkladığımda da bir şeyler çıksın — mantıklı konulabilecek şeyler").
        Bugün ÇALIŞAN maddeler konuldu; "grup oluştur" sunucuda karşılığı
        olmadığı için yok (grup ucu gelince buraya eklenir).
      */}
      {/* Yan panel üç nokta menüsü (2026-11-08): Yeni Grup, Yıldızlı Mesajlar, Kişileri Seç, Bildirimleri Sessize Al, Sohbeti Sıfırla, Grup Oluştur */}
      {menu?.kind === 'panel' && (
        <MenuSurface x={menu.x} y={menu.y} onClose={() => setMenu(null)} label={t('chat.panelOptions')}>
          <MenuItem icon="🆕" label={t('chat.panelNewGroup')} onSelect={() => { setMenu(null) }} />
          <MenuItem icon="⭐" label={t('chat.panelStarred')} onSelect={() => { setMenu(null) }} />
          <MenuItem icon="👥" label={t('chat.panelSelectContacts')} onSelect={() => { setMenu(null) }} />
          <MenuItem icon="🔕" label={t('chat.panelMuteNotifications')} onSelect={() => { setMenu(null) }} />
          <MenuItem icon="🔄" label={t('chat.panelResetChat')} onSelect={() => { setMenu(null) }} />
          <MenuItem icon="👥" label={t('chat.panelCreateGroup')} onSelect={() => { setMenu(null) }} />
        </MenuSurface>
      )}
      {menu?.kind === 'area' && (
        <MenuSurface x={menu.x} y={menu.y} onClose={() => setMenu(null)} label={t('chat.chats')}>
          <MenuItem
            icon="🔎"
            label={t('chat.findPerson')}
            onSelect={() => {
              setMenu(null)
              focusSearch()
            }}
          />
          <MenuItem
            icon="🔄"
            label={t('chat.refresh')}
            onSelect={() => {
              setMenu(null)
              void refresh()
            }}
          />
          {threadOpen && (
            <MenuItem
              icon="⬇️"
              label={t('chat.scrollBottom')}
              onSelect={() => {
                setMenu(null)
                scrollToBottom(true)
              }}
            />
          )}
        </MenuSurface>
      )}

      {/* "İLET": mesajı başka bir kişiye gönder (yeni sunucu ucu gerekmez) */}
      {forwardMsg && (
        <ForwardPicker
          peers={peers ?? []}
          labels={{
            title: t('chat.forwardTitle'),
            cancel: t('chat.cancel'),
            empty: t('chat.noMatch'),
            search: t('chat.findPerson'),
          }}
          onCancel={() => setForwardMsg(null)}
          onPick={async (peer) => {
            const message = forwardMsg
            setForwardMsg(null)
            await forwardTo(peer, message)
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

      {/* SABİTLE DİYALOĞU (2026-11-08, kullanıcı isteği): WhatsApp tarzı
          süre seçici — 24 saat · 7 gün · Her zaman · özel tarih-saat. */}
      {pinDialog && (
        <DurationDialog
          ariaLabel="Sabitleme süresi"
          title="Sabitlemenizin ne kadar süre kalacağını seçin"
          subtitle="Dilediğiniz zaman sabitlemeyi kaldırabilirsiniz."
          confirmLabel="Sabitle"
          radioName="pin-choice"
          choice={pinChoice}
          onChoice={setPinChoice}
          customAt={pinCustomAt}
          onCustomAt={setPinCustomAt}
          onConfirm={() => void confirmPin()}
          onCancel={() => setPinDialog(null)}
        />
      )}
      {/* BİLDİRİM SESSİ diyaloğu (2026-11-08, WhatsApp "Sessize al"): pin ile aynı seçici */}
      {mutePeer && (
        <DurationDialog
          ariaLabel="Bildirim sessizliği"
          title="Bildirimleri ne kadar süre sessize alacağınızı seçin"
          subtitle="Dilediğiniz zaman sessizliği kaldırabilirsiniz."
          confirmLabel="Sessize al"
          radioName="mute-choice"
          choice={muteChoice}
          onChoice={setMuteChoice}
          customAt={muteCustomAt}
          onCustomAt={setMuteCustomAt}
          onConfirm={() => void confirmMute()}
          onCancel={() => setMutePeer(null)}
        />
      )}

      {/* MEDYA LIGHTBOX (2026-11-08, kullanıcı isteği): WhatsApp tarzı —
          tekerlekle büyüt, ileri/geri gizlenir, altta thumbnail şeridi,
          üst bar: büyüt · yanıtla · sabitle · tepki · ilet · indir · mesaja git. */}
      {gallery && (
        <MediaLightbox
          items={gallery.items}
          index={gallery.index}
          onIndexChange={i => setGallery(g => (g ? { ...g, index: i } : null))}
          onClose={closeGallery}
          onReply={(id) => {
            startReply(id)
            closeGallery()
          }}
          onPin={(id) => {
            const target = messages.find(x => x.id === id)
            if (target) {
              requestPin(target)
            }
            setGallery(g => (g
              ? { ...g, items: g.items.map(it => (it.id === id ? { ...it, pinned: !it.pinned } : it)) }
              : null))
          }}
          onReact={(id, emoji) => {
            void reactTo(id, emoji)
          }}
          onForward={(id) => {
            const target = messages.find(x => x.id === id)
            if (target) {
              setForwardMsg(target)
            }
            closeGallery()
          }}
          onGoToMessage={(id) => {
            closeGallery()
            jumpToMessage(id)
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
      <p className="text-sm text-foreground-500">{text}</p>
    </div>
  )
}

/**
 * İskelet (yükleme) — ekranı kaplayan "Sohbet yükleniyor…" yerine (kullanıcı
 * isteği 2026-10-12: "Sohbet yükleniyor… değiştir, öyle olmasın o").
 * `role="status"` + `aria-label`: ekran okuyucu yüklemeyi duyurur.
 */
function ChatSkeleton({ label }: { label: string }) {
  return (
    <div role="status" aria-label={label} className="space-y-2">
      {[0, 1, 2].map(i => (
        <div
          key={i}
          className={cn(
            'h-10 animate-pulse rounded-2xl bg-foreground/10',
            i % 2 === 1 ? 'ml-auto w-1/2' : 'w-2/3',
          )}
        />
      ))}
    </div>
  )
}

/**
 * LİSTE TİKİ (2026-10-16). Karar `tickForFlags`ten gelir — balondaki tikle aynı
 * kaynak. Renk ise `TICK_LIST_COLORS`ten seçilir: balon mavi olduğu için
 * oradaki renkler şeffaf liste zemininde okunmaz.
 */
function ListTick({ tick, t }: {
  tick: TickStyle
  t: (key: string) => string
}) {
  const label = t(tick.labelKey)
  return (
    <span
      role="img"
      title={label}
      aria-label={label}
      className={cn('mr-1 inline-flex shrink-0 align-middle', TICK_LIST_COLORS[tick.state])}
    >
      {tick.state === 'sending'
        ? <ClockIcon size={11} />
        : tick.double ? <TickReadIcon size={13} /> : <TickSentIcon size={13} />}
    </span>
  )
}

/**
 * Durum noktası (2026-10-11; SARİ 2026-10-12'de KALDIRILDI): profil
 * fotoğrafının köşesinde
 *   · yeşil → çevrimiçi (nabız taze),
 *   · kırmızı → çevrimdışı (nabız eski / hiç yok).
 * "Yazıyor" artık nokta DEĞİL: listede ve başlıkta mavi metin (bkz.
 * `lib/chat-peers.ts:typingLabel`). Karar `presenceOf`te; bileşen yalnız RENDER eder.
 */
function PresenceDot({ presence, t }: {
  presence: Presence
  t: (key: string) => string
}) {
  const ui = PRESENCE_UI[presence]
  const tip = t(ui.labelKey)
  return (
    <span
      title={tip}
      aria-label={tip}
      className={cn('absolute -bottom-0.5 -right-0.5 size-3 rounded-full ring-2 ring-background', ui.dot)}
    />
  )
}

/**
 * Mesaj Bilgisi (kullanıcı isteği): "Okundu", "Teslim edildi" ve tarih
 * (GG.AA.YYYY biçiminde, Türkçe gün/ay).
 * "Okundu" = `m.read_at` dolu; "Teslim edildi" = `m.delivered_at` dolu.
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

/**
 * Admin için kullanıcı sağ tık menüsü (2026-10-11 kullanıcı isteği).
 * Sohbet düzeyinde: sabitle/favori, engelle, temizle, sil + takma ad + profil.
 *
 * 2026-10-13 (kullanıcı isteği: "menü sağ tıklanan noktada açılmalı"): menü
 * artık `MenuSurface` içinde — imleç konumunda açılır, ekran kenarına taşarsa
 * içeri kayar, Esc / dışarı tıklama / kaydırma kapatır, ok tuşlarıyla gezilir.
 * Önceden `absolute top-2 right-2` ile satırın sağ üst köşesine çakılıydı ve
 * kaydırılan listenin İÇİNDE render edildiği için uzun listede kırpılabiliyordu.
 */
function PeerMenu({ peer, x, y, t, isAdmin, onClose, onNicknameSave, onProfile, onToggle, onClear, onDelete, onToggleMute, onExport, canExport = true }: {
  peer: Peer
  x: number
  y: number
  t: (key: string) => string
  /** Admin → "Sohbeti Sıfırla" (tamamını sil) görünür; normal kullanıcı yalnız "Sohbeti Temizle" (kendisi için) görür. */
  isAdmin: boolean
  onClose: () => void
  onNicknameSave: (nickname: string) => void | Promise<void>
  onProfile: () => void
  onToggle: (action: 'favorite' | 'important' | 'block', next: boolean) => void | Promise<void>
  onClear: () => void | Promise<void>
  onDelete: () => void | Promise<void>
  onToggleMute: () => void
  onExport: () => void
  /** Yalnız açık sohbet (export içeriği anlık listeden üretilir). */
  canExport?: boolean
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(peer.nickname ?? '')
  const mutedNow = !!peer.mutedUntil && new Date(peer.mutedUntil).getTime() > Date.now()

  return (
    <MenuSurface x={x} y={y} onClose={onClose} label={t('chat.chats')}>
      {editing
        ? (
            <form
              onSubmit={(e) => {
                e.preventDefault()
                onNicknameSave(draft.trim())
              }}
              className="p-2"
            >
              <input
                autoFocus
                value={draft}
                maxLength={40}
                onChange={e => setDraft(e.target.value)}
                placeholder={t('chat.nicknamePlaceholder')}
                aria-label={t('chat.setNickname')}
                className="w-full rounded-lg border border-foreground/10 bg-transparent px-2 py-1.5 text-sm outline-none focus-visible:border-primary"
              />
              <div className="mt-2 flex gap-2">
                <button type="submit" className="flex-1 cursor-pointer rounded-lg bg-primary px-2 py-1.5 text-xs font-medium text-primary-fg">
                  {t('chat.save')}
                </button>
                <button type="button" onClick={() => setEditing(false)} className="cursor-pointer rounded-lg border border-foreground/10 px-2 py-1.5 text-xs">
                  {t('chat.cancel')}
                </button>
              </div>
            </form>
          )
        : (
            <>
              <MenuHeader
                text={peer.nickname || peer.fullName || peer.username}
                onClose={onClose}
                closeLabel={t('common.close')}
              />
              <MenuItem icon={<UserIcon size={14} className="text-foreground-400" />} label={t('chat.viewProfile')} onSelect={() => onProfile()} />
              <MenuItem icon={<EditIcon size={14} className="text-foreground-400" />} label={t('chat.setNickname')} onSelect={() => setEditing(true)} />
              <MenuItem
                icon={<StarIcon size={14} className="text-foreground-400" />}
                label={peer.favorite ? t('chat.unfavorite') : t('chat.favorite')}
                onSelect={() => onToggle('favorite', !peer.favorite)}
              />
              <MenuItem
                icon={<PinIcon size={14} className="text-foreground-400" />}
                label={peer.important ? t('chat.unmarkImportant') : t('chat.markImportant')}
                onSelect={() => onToggle('important', !peer.important)}
              />
              <MenuItem
                icon={<BanIcon size={14} className="text-foreground-400" />}
                label={peer.blocked ? t('chat.unblock') : t('chat.block')}
                onSelect={() => onToggle('block', !peer.blocked)}
              />
              {/* Bildirimleri sessize al + Sohbeti dışa aktar (2026-11-08) */}
              <MenuItem
                icon={<BellOffIcon size={14} className="text-foreground-400" />}
                label={mutedNow ? t('chat.unmuteNotifications') : t('chat.muteNotifications')}
                onSelect={() => onToggleMute()}
              />
              {canExport && (
                <MenuItem
                  icon={<DownloadIcon size={14} className="text-foreground-400" />}
                  label={t('chat.exportChat')}
                  onSelect={() => onExport()}
                />
              )}
              {/* Sohbeti Temizle — KENDİ görünümünü temizler, karşı taraf etkilenmez;
                  (i) ne yaptığını yazar. Sohbeti Sıfırla yalnızda ADMINDE: tümüyle siler. */}
              <div className="flex items-center gap-1">
                <MenuItem
                  icon={<TrashIcon size={14} className="text-foreground-400" />}
                  label={t('chat.clearConversation')}
                  onSelect={() => onClear()}
                />
                <button
                  type="button"
                  title={t('chat.clearConversationDesc')}
                  aria-label={t('chat.clearConversationDesc')}
                  className="shrink-0 cursor-help rounded-full p-1.5 text-foreground-400 transition-colors hover:bg-foreground/10 hover:text-foreground"
                  onClick={e => e.stopPropagation()}
                >
                  <InfoIcon size={13} />
                </button>
              </div>
              {isAdmin && (
                <MenuItem
                  icon={<TrashIcon size={14} className="text-danger" />}
                  label={t('chat.deleteConversation')}
                  danger
                  onSelect={() => onDelete()}
                />
              )}
            </>
          )}
    </MenuSurface>
  )
}

/**
 * "Profilini incele" (2026-10-11 kullanıcı isteği).
 *
 * GÜVENLİK: yalnız sunucunun beyaz listeyle döndürdüğü alanlar gösterilir.
 * Şifre, e-posta/gmail ve telefon uçtan HİÇ gelmez; burada da gösterilmez.
 */
function ProfileSheet({ peer, t, onClose }: {
  peer: Peer
  t: (key: string) => string
  onClose: () => void
}) {
  const [profile, setProfile] = useState<{
    fullName: string | null
    nickname: string | null
    username: string | null
    bio: string | null
    githubHandle: string | null
    website: string | null
    role: string | null
    isOwner: boolean
    createdAt: string | null
    messageCount: number
    groups: Array<{ conversationId: string, title: string | null }>
  } | null>(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'profile', userId: peer.id }),
      })
      const json = await res.json()
      if (!cancelled) {
        if (json?.success && json.profile) {
          setProfile(json.profile)
        }
        else {
          setError(true)
        }
      }
    })().catch(() => {
      if (!cancelled) {
        setError(true)
      }
    })
    return () => {
      cancelled = true
    }
  }, [peer.id])

  const rows: Array<[string, string | null | undefined]> = profile
    ? [
        [t('chat.nickname'), profile.nickname],
        [t('chat.fullName'), profile.fullName],
        ['@username', profile.username],
        [t('chat.role'), profile.role],
        [t('chat.github'), profile.githubHandle],
        [t('chat.website'), profile.website],
        [t('chat.memberSince'), profile.createdAt ? profile.createdAt.slice(0, 10) : null],
      ]
    : []

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div className="max-h-full w-full max-w-md overflow-y-auto rounded-2xl border border-foreground/10 bg-background p-5" onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-3">
          <span className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary/15 text-sm font-semibold text-primary">
            {peer.avatarUrl
              ? <img src={peer.avatarUrl} alt="" className="size-full object-cover" />
              : (peer.nickname || peer.fullName || peer.username).slice(0, 2).toUpperCase()}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold">{peer.nickname || peer.fullName || peer.username}</p>
            <p className="truncate text-xs text-foreground-500">
@
{peer.username}
</p>
          </div>
          <button type="button" onClick={onClose} aria-label={t('common.close')} className="cursor-pointer rounded-lg px-2 py-1 text-sm transition-colors hover:bg-foreground/10">
            ✕
          </button>
        </div>

        {error && <p className="mt-4 text-sm text-foreground-500">{t('chat.profileFailed')}</p>}
        {/* Yükleme metni yerine iskelet (2026-10-12): "Sohbet yükleniyor" ekranda YAZI olarak görünmez. */}
        {!error && !profile && <div className="mt-4"><ChatSkeleton label={t('chat.loading')} /></div>}

        {profile && (
          <>
            <dl className="mt-4 space-y-2 text-sm">
              {rows.map(([label, value]) => (
                <div key={label} className="flex justify-between gap-3 border-b border-foreground/5 pb-1.5">
                  <dt className="shrink-0 text-foreground-500">{label}</dt>
                  <dd className="truncate text-right">{value || '—'}</dd>
                </div>
              ))}
              <div className="flex justify-between gap-3 border-b border-foreground/5 pb-1.5">
                <dt className="text-foreground-500">{t('chat.messageCount')}</dt>
                <dd>{profile.messageCount}</dd>
              </div>
              <div className="flex justify-between gap-3 pb-1.5">
                <dt className="shrink-0 text-foreground-500">{t('chat.groups')}</dt>
                {/*
                  2026-10-19 (kullanici raporu: grup listesi kaydirilamiyor):
                  tum basliklar tek satirda `join(', ')` + `truncate` ediliyordu
                  -> 2+ gruptan sonrasi HIC gorunmuyordu (kaydirma yok).
                  Coklu durumda kendi kaydirma kabi; tek grupta satir ici kaliyor.
                */}
                {profile.groups.length > 1
                  ? (
                      <dd className="max-h-24 min-w-0 flex-1 space-y-0.5 overflow-y-auto text-right">
                        {profile.groups.map(g => (
                          <div key={g.conversationId} className="truncate">{g.title}</div>
                        ))}
                      </dd>
                    )
                  : <dd className="min-w-0 truncate text-right">{profile.groups[0]?.title ?? '—'}</dd>}
              </div>
            </dl>
            {profile.bio && <p className="mt-3 text-sm text-foreground-500">{profile.bio}</p>}

            {/*
              Kullanıcı isteği: e-posta (gmail), telefon ve ŞİFRE canlıda
              GÖSTERİLMEZ. Sunucu bu alanları hiç göndermiyor; burada da
              hiçbir yerde yer almıyorlar.
            */}
            <p className="mt-4 rounded-lg bg-foreground/5 px-3 py-2 text-xs text-foreground-500">
              <LockIcon size={14} className="text-foreground-400" />
              {' '}
              {t('chat.privacyNote')}
            </p>
          </>
        )}
      </div>
    </div>
  )
}

/**
 * Mesaj bağlam menüsü (2026-10-13 kullanıcı isteği).
 * Eskiden tam ekran karartma + EKRANIN ORTASINDA sabit bir diyalogdu; artık
 * balonun sağ tıklandığı NOKTADA `MenuSurface` ile açılır (aynı stil, aynı
 * kapatma kuralları, ok tuşlarıyla gezinme).
 * Maddeler: Kopyala · Yanıtla · İlet · Sabitle · Bilgi · Sil.
 *
 * NOT: "Düzenle" (mesaj düzenleme) BİLEREK YOK — metni değiştirmek için
 * `chat_messages.edited_at` kolonu gerekir, o kolon şemada ve canlı veritabanında
 * YOKTUR (`supabase/chat.sql`). Kolonsuz düzenleme "düzenlendi" işareti
 * koyamaz → kullanıcıya sessizce değiştirilmiş geçmiş gösterirdi.
 */
function MessageMenu({ message, x, y, onClose, onReply, onCopy, onForward, onPin, onInfo, onDelete, onReact, labels }: {
  message: ChatMessageRow
  x: number
  y: number
  onClose: () => void
  onReply: () => void
  onCopy: () => void
  onForward: () => void
  onPin: () => void
  onInfo: () => void
  onDelete: () => void
  onReact: () => void
  labels: Record<string, string>
}) {
  return (
    <MenuSurface x={x} y={y} onClose={onClose} label={labels.header || labels.info}>
      {labels.header && (
        <MenuHeader text={labels.header} onClose={onClose} closeLabel={labels.close} />
      )}
      <MenuItem icon={<SmileFaceIcon size={14} className="text-foreground-400" />} label={labels.react || 'Tepki Ekle'} onSelect={onReact} />
      <MenuItem icon={<ReplyIcon size={14} className="text-foreground-400" />} label={labels.reply} onSelect={onReply} />
      {message.file_url && (
        <MenuItem
          icon={<DownloadIcon size={14} className="text-foreground-400" />}
          label={labels.download || 'İndir'}
          onSelect={() => {
            // Gerçek indirme (2026-11-08): <a download> programatik olarak
            // tıklanır — buton içinde link yuvalaması yok.
            const a = document.createElement('a')
            a.href = message.file_url!
            a.download = message.file_name ?? ''
            a.click()
            onClose()
          }}
        />
      )}
      <MenuItem icon={<PinIcon size={14} className="text-foreground-400" />} label={labels.pin} onSelect={onPin} />
      <MenuItem icon={<CopyIcon size={14} className="text-foreground-400" />} label={labels.copy} disabled={!message.text} onSelect={onCopy} />
      <MenuItem icon={<InfoIcon size={14} className="text-foreground-400" />} label={labels.info} onSelect={onInfo} />
      <MenuItem icon={<ForwardIcon size={14} className="text-foreground-400" />} label={labels.forward} onSelect={onForward} />
      <MenuItem icon={<TrashIcon size={14} className="text-foreground-400" />} label={labels.delete} danger onSelect={onDelete} />
    </MenuSurface>
  )
}

/**
 * "İlet" hedef seçimi (2026-10-13).
 * Bağlam menüsü DEĞİL: seçim yapılana kadar açık kalan ortalanmış diyalogdur —
 * Esc, dışarı tıklama veya "İptal" kapatır.
 */
function ForwardPicker({ peers, labels, onCancel, onPick }: {
  peers: Peer[]
  labels: { title: string, cancel: string, empty: string, search: string }
  onCancel: () => void
  onPick: (peer: Peer) => void | Promise<void>
}) {
  /** Arama metni — kullanıcı `@username`, ad, takma ad ile süzebilir (2026-11-08). */
  const [query, setQuery] = useState('')

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onCancel()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onCancel])

  const normalized = query.trim().toLocaleLowerCase('tr')
  const visible = normalized
    ? peers.filter((p) => {
        const hay = `${p.username} ${p.nickname ?? ''} ${p.fullName ?? ''}`.toLocaleLowerCase('tr')
        return hay.includes(normalized)
      })
    : peers

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4"
      onClick={onCancel}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={labels.title}
        className="w-full max-w-sm overflow-hidden rounded-xl border border-foreground/10 bg-background shadow-xl"
        onClick={e => e.stopPropagation()}
      >
        <p className="border-b border-foreground/10 px-4 py-3 text-sm font-semibold">
          {labels.title}
        </p>
        <div className="border-b border-foreground/10 p-2">
          <input
            type="search"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder={labels.search}
            aria-label={labels.search}
            autoFocus
            className="w-full rounded-lg border border-foreground/10 bg-transparent px-3 py-2 text-sm outline-none placeholder:text-foreground-500 focus-visible:border-primary"
          />
        </div>
        <div className="max-h-72 overflow-y-auto">
          {visible.length === 0 && (
            <p className="px-4 py-3 text-sm text-foreground-500">{labels.empty}</p>
          )}
          {visible.map(p => (
            <button
              key={p.id}
              type="button"
              onClick={() => onPick(p)}
              className="block w-full cursor-pointer px-4 py-2.5 text-left text-sm hover:bg-foreground/10"
            >
              @
              {p.username}
              {p.nickname || p.fullName ? ` · ${p.nickname || p.fullName}` : ''}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={onCancel}
          className="block w-full cursor-pointer border-t border-foreground/10 px-4 py-2.5 text-left text-sm hover:bg-foreground/10"
        >
          {labels.cancel}
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

/**
 * Süre seçici diyaloğu (2026-11-08, WhatsApp "Sessize al" paritesi): sabitleme
 * ve bildirim sessizliğinin ORTAK seçicisi — 24 saat · 7 gün · Her zaman ·
 * özel tarih-saat. Seçilen süre ISO damgasına dönüştürülür (null = süresiz).
 */
function DurationDialog({
  ariaLabel,
  title,
  subtitle,
  confirmLabel,
  radioName,
  choice,
  onChoice,
  customAt,
  onCustomAt,
  onConfirm,
  onCancel,
}: {
  ariaLabel: string
  title: string
  subtitle: string
  confirmLabel: string
  radioName: string
  choice: '24h' | '7d' | 'forever' | 'custom'
  onChoice: (c: '24h' | '7d' | 'forever' | 'custom') => void
  customAt: string
  onCustomAt: (v: string) => void
  onConfirm: () => void
  onCancel: () => void
}) {
  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60"
      role="dialog"
      aria-modal="true"
      aria-label={ariaLabel}
      onClick={onCancel}
    >
      <div
        className="w-[min(92vw,420px)] overflow-hidden rounded-2xl border border-foreground/15 bg-background text-foreground shadow-2xl shadow-black/50"
        onClick={e => e.stopPropagation()}
      >
        <div className="px-5 pt-4 pb-1">
          <p className="text-[17px] font-semibold leading-snug">{title}</p>
          <p className="mt-1 text-[13px] text-foreground-500">{subtitle}</p>
        </div>
        <ul className="flex flex-col gap-0.5 px-3 py-2" role="radiogroup" aria-label={ariaLabel}>
          {([
            { key: '24h', label: '24 saat' },
            { key: '7d', label: '7 gün' },
            { key: 'forever', label: 'Her zaman' },
          ] as const).map(opt => (
            <li key={opt.key}>
              <label className="flex cursor-pointer items-center gap-3 rounded-xl px-2 py-2.5 transition-colors hover:bg-foreground/5">
                <input
                  type="radio"
                  name={radioName}
                  checked={choice === opt.key}
                  onChange={() => onChoice(opt.key)}
                  className="size-[18px] accent-primary"
                />
                <span className="text-sm">{opt.label}</span>
              </label>
            </li>
          ))}
          <li>
            <label className="flex cursor-pointer items-center gap-3 rounded-xl px-2 py-2.5 transition-colors hover:bg-foreground/5">
              <input
                type="radio"
                name={radioName}
                checked={choice === 'custom'}
                onChange={() => onChoice('custom')}
                className="size-[18px] accent-primary"
              />
              <span className="flex-1 text-sm">Özel tarih-saat</span>
              <input
                type="datetime-local"
                value={customAt}
                min={new Date(Date.now() + 60_000).toISOString().slice(0, 16)}
                onChange={(e) => {
                  onCustomAt(e.target.value)
                  onChoice('custom')
                }}
                onClick={e => e.stopPropagation()}
                aria-label="Özel tarih-saat"
                className="rounded-md border border-foreground/15 bg-background px-2 py-1 text-xs outline-none focus:border-primary"
              />
            </label>
          </li>
        </ul>
        <div className="flex items-center justify-end gap-1 px-4 pt-1 pb-4">
          <button
            type="button"
            className="cursor-pointer rounded-full px-4 py-2 text-sm font-semibold text-primary transition-colors hover:bg-primary/10"
            onClick={onCancel}
          >
            İptal
          </button>
          <button
            type="button"
            className="cursor-pointer rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-fg transition-colors hover:bg-primary/90"
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
