'use client'

import type { CSSProperties, KeyboardEvent as ReactKeyboardEvent, PointerEvent as ReactPointerEvent } from 'react'
import type { ChatMessageRow } from '@/lib/chat-db'
import type { Presence, PresenceState } from '@/lib/chat-peers'
import Link from 'next/link'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { EmojiPicker } from '@/components/chat/emoji-picker'
import { useT } from '@/components/locale-provider'
import { cn } from '@/components/ui/cn'
import {
  MicIcon,
  PaperclipIcon,
  SendIcon,
  StickerIcon,
  TickReadIcon,
  TickSentIcon,
  UsersIcon,
} from '@/components/ui/icons'
import {
  isTyping,
  PRESENCE_UI,
  presenceOf,
  sortPeers,
  TYPING_TTL_MS,
  typingLabel,
} from '@/lib/chat-peers'
import { tickFor } from '@/lib/chat-ticks'
import { helloMessage } from '@/lib/greeting'

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
}

/**
 * Yan panel (kişi listesi) genişliği — sürükleyerek veya ok tuşlarıyla değişir,
 * `localStorage`ta hatırlanır (desen: `components/sidebar.tsx`).
 */
const CHAT_PANEL_MIN = 240
const CHAT_PANEL_MAX = 560
const CHAT_PANEL_DEFAULT = 288
const CHAT_PANEL_KEY = 'chat-panel-width'

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
  /** Liste öğesindeki son mesaj özeti. */
  preview?: string | null
  previewSender?: string | null
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
export function Chat({ nextPath = '/chat' }: ChatProps) {
  const { t, locale } = useT()
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
  /**
   * KÜÇÜK EKRANDA kişi listesi (2026-10-13 kullanıcı isteği): sohbet açıkken
   * liste gizlenir; bu düğmeyle üstte KAPLAMA olarak geri gelir. `md` ve
   * üstünde etkisi yok — orada liste sabit sütundur (CSS `md:static` sıfırlar).
   */
  const [listOpen, setListOpen] = useState(false)
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
  const [menuPeer, setMenuPeer] = useState<Peer | null>(null)
  const [profilePeer, setProfilePeer] = useState<Peer | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  /** Metin alanı: emoji imlecin olduğu yere eklensin diye ref gerekir. */
  const inputRef = useRef<HTMLInputElement>(null)
  const endRef = useRef<HTMLDivElement>(null)
  /** Liste saatini tazele — nokta rengi yeni veri gelmeden de eskisin (yeşil → kırmızı). */
  const [now, setNow] = useState(() => Date.now())

  const isAuthenticated = !!session
  const currentUserId = session?.id ?? ''
  const isAdmin = session?.role === 'admin'

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
      const other = c.direct_key?.split('|').find(part => part !== me)
      if (other) {
        byPeer.set(other, c)
      }
    }
    return ((usersJson.users ?? []) as Peer[]).map((u): Peer => {
      const conv = byPeer.get(u.id)
      return {
        ...u,
        important: !!conv?.important,
        favorite: !!conv?.favorite,
        blocked: !!conv?.blocked,
        lastMessageAt: conv?.updated_at ?? null,
        preview: conv?.last_preview ?? null,
        previewSender: conv?.last_sender_name ?? null,
      }
    })
  }, [currentUserId])

  /*
    ÇEVRİMİÇİ NABZI + YAZMA SİNYALİ. Sohbet sayfası açıkken 20 sn'de bir nabız
    gider → karşı taraf YEŞİL nokta görür. Yazarken durum `typing` yazılır →
    karşı tarafta MAVİ "@kullanıcı yazıyor…" satırı görünür (nokta DEĞİL,
    2026-10-12 kullanıcı isteği). Durum sinyalle tazelenmezse `TYPING_TTL_MS`
    sonunda kendiliğinden söner (ağ/sleep durumunda sonsuz "yazıyor" kalmaz).
  */
  const presenceRef = useRef<PresenceState | null>(null)
  const presenceClear = useRef<ReturnType<typeof setTimeout> | null>(null)
  /** Yazma sinyalinin son gönderim zamanı (throttle) + "durdu" zamanlayıcısı. */
  const typingSentAt = useRef(0)
  const typingIdle = useRef<ReturnType<typeof setTimeout> | null>(null)

  const beat = useCallback(() => {
    void fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'presence', state: presenceRef.current }),
    }).catch(() => {})
  }, [])

  const signalPresence = useCallback((state: PresenceState | null) => {
    const changed = presenceRef.current !== state
    presenceRef.current = state
    if (changed) {
      beat()
    }
    if (presenceClear.current) {
      clearTimeout(presenceClear.current)
      presenceClear.current = null
    }
    if (state) {
      presenceClear.current = setTimeout(() => {
        presenceRef.current = null
        beat()
      }, TYPING_TTL_MS)
    }
  }, [beat])

  /**
   * Yazı yazıldı: sinyal en fazla `TYPING_THROTTLE_MS`'de bir gider (throttle),
   * yazma durunca `TYPING_IDLE_MS` sonra "durdu" bildirilir (debounce).
   */
  const signalTyping = useCallback(() => {
    const at = Date.now()
    if (at - typingSentAt.current >= TYPING_THROTTLE_MS) {
      typingSentAt.current = at
      signalPresence('typing')
    }
    if (typingIdle.current) {
      clearTimeout(typingIdle.current)
    }
    typingIdle.current = setTimeout(() => {
      typingIdle.current = null
      typingSentAt.current = 0
      signalPresence(null)
    }, TYPING_IDLE_MS)
  }, [signalPresence])

  /** Yazma bitti (mesaj gönderildi / sohbet kapandı): durum HEMEN temizlenir. */
  const stopTyping = useCallback(() => {
    if (typingIdle.current) {
      clearTimeout(typingIdle.current)
      typingIdle.current = null
    }
    typingSentAt.current = 0
    signalPresence(null)
  }, [signalPresence])

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
   * Nokta rengi ve "yazıyor" METNİ yeni veri gelmeden de eskisin diye listenin
   * saatini tazele. Aralık `POLL_MS`: `TYPING_TTL_MS` (5 sn) dolduğunda satır
   * gecikmeden son mesaja döner.
   */
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), POLL_MS)
    return () => clearInterval(id)
  }, [])

  /*
    KİŞİ LİSTESİ: giriş yapmış HERKES için ilk yükleme + `POLL_MS`'de bir
    tazeleme (yeni sohbet, son mesaj özeti, karşı tarafın çevrimiçi nabzı VE
    yazma durumu). Aralık 20 sn'den 2 sn'ye indirildi: yazma durumu o kadar
    gecikmeyle görünüyordu (2026-10-12 kullanıcı: "gecikme çok uzun"). Sunucu
    listeyi yetkiye göre süzer; istemcide rol kapısı YOK.
  */
  useEffect(() => {
    if (!isAuthenticated) {
      return
    }
    let cancelled = false
    const run = async () => {
      const list = await loadPeers()
      if (!cancelled) {
        // null → sorgu başarısız: "yükleniyor"da takılı kalma, hatayı göster.
        setPeers(list)
        setPeersError(list === null)
      }
    }
    void run()
    const id = setInterval(run, POLL_MS)
    return () => {
      cancelled = true
      clearInterval(id)
    }
  }, [isAuthenticated, loadPeers])

  /* Nabız: sohbet sayfası açıkken 20 sn'de bir "buradayım" (yeşil nokta). */
  useEffect(() => {
    if (!isAuthenticated) {
      return
    }
    beat()
    const id = setInterval(beat, 20_000)
    return () => clearInterval(id)
  }, [isAuthenticated, beat])

  /**
   * Kişi listesi HİYERARŞİSİ: sabitlenen → YAZAN (şu an bana yazıyor) →
   * konuşulanlar (en yeni önce) → favoriler → çevrimiçiler → diğerleri →
   * engellenenler. Sıralama mantığı `lib/chat-peers.ts`te (saf + testli).
   */
  const orderedPeers = useMemo(() => {
    return sortPeers(
      (peers ?? []).map((p): PeerRow => ({
        ...p,
        name: p.nickname || p.fullName || p.username,
        presence: presenceOf(p.lastSeenAt, now),
        typing: isTyping(p.lastSeenAt, p.presenceState, now),
      })),
      locale,
    )
  }, [peers, now, locale])

  /** Bir kişiye tıklanınca doğrudan sohbeti açar (idempotent). */
  const openWith = useCallback(async (peerId: string) => {
    setActivePeerId(peerId)
    // Mobil kaplama liste: kişi seçilince kapanır, sohbet görünür.
    setListOpen(false)
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
  }, [t])

  /*
    TEK KİŞİ VARSA SOHBET KENDİLİĞİNDEN AÇILIR (2026-10-12): normal kullanıcının
    listesinde yalnız site sahibi vardır — "listeden seç" adımı gereksiz olurdu.
    Sahip birden fazla kişi görür, seçim onda kalır (sağ panel "soldan bir kişi
    seç" der). `autoOpened`: kullanıcı geri dönerse bir daha zorla açma.
  */
  const autoOpened = useRef(false)
  useEffect(() => {
    if (autoOpened.current || conversationId || !peers || peers.length !== 1) {
      return
    }
    autoOpened.current = true
    void openWith(peers[0].id)
  }, [peers, conversationId, openWith])

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

  /** Panel sürüklemesi (pointer) — desen: `components/sidebar.tsx`. */
  const startResize = useCallback((e: ReactPointerEvent<HTMLDivElement>) => {
    e.preventDefault()
    const startX = e.clientX
    const startWidth = panelWidth
    const move = (ev: PointerEvent) => {
      setPanelWidth(
        Math.min(CHAT_PANEL_MAX, Math.max(CHAT_PANEL_MIN, startWidth + ev.clientX - startX)),
      )
    }
    const up = () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
  }, [panelWidth])

  /** Klavye erişimi: ayraç odaklıyken ok tuşları ±16 px. */
  function resizeByKey(e: ReactKeyboardEvent<HTMLDivElement>) {
    const step = e.key === 'ArrowLeft' ? -16 : e.key === 'ArrowRight' ? 16 : 0
    if (!step) {
      return
    }
    e.preventDefault()
    setPanelWidth(w => Math.min(CHAT_PANEL_MAX, Math.max(CHAT_PANEL_MIN, w + step)))
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
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length])

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
   * yazılmaz). Gönderim başarılı olunca yazma durumu HEMEN temizlenir.
   */
  async function send(override?: string) {
    const text = (override ?? draft).trim()
    if ((!text && !replyTo) || sending || !conversationId) {
      return
    }
    setSending(true)
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversationId, text, replyToId: replyTo?.id }),
      })
      const json = await res.json()
      if (res.ok && json.success) {
        setMessages(prev => [...prev, json.data])
        if (!override) {
          setDraft('')
        }
        setReplyTo(null)
        stopTyping()
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
    signalPresence('uploading')
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
      const res = await fetch('/api/chat', {
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
      else {
        // Hata BANT olarak görünür (sohbet kapanmaz) — 2026-10-12.
        setError(json.message ?? t('chat.error'))
      }
    }
    finally {
      setSending(false)
      signalPresence(null)
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
    setMenuMsg(null)
  }

  function copy(text: string) {
    navigator.clipboard?.writeText(text)
    setMenuMsg(null)
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
    return (
      <div className="flex w-full max-w-md flex-col items-center gap-4 rounded-2xl border border-foreground/10 bg-background p-10 text-center">
        <span className="text-3xl">🔒</span>
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
  // "Henüz başka kullanıcı yok" YOK (2026-10-11): kayıtlı herkes listelenir.
  // Takma ad, kullanıcı adı VE gerçek ad birlikte aranır — takma ad konulsa
  // bile gerçek ad kaybolmaz (kullanıcı isteği).
  const visiblePeers = orderedPeers.filter((p) => {
    if (!q) {
      return true
    }
    return [p.nickname, p.username, p.fullName].some(
      v => !!v && v.toLocaleLowerCase('tr').includes(q),
    )
  })
  const activePeer = orderedPeers.find(p => p.id === activePeerId) ?? null
  const threadOpen = !!conversationId
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

  return (
    <div
      className="relative flex h-[calc(100svh-11rem)] min-h-[260px] w-full overflow-hidden rounded-2xl border border-foreground/10 bg-background"
      style={{ '--chat-panel-w': `${panelWidth}px` } as CSSProperties}
    >
      {/* ── SOL: kime yazmak istiyorum (kişi listesi) ── */}
      <aside
        className={cn(
          'min-h-0 w-full shrink-0 flex-col border-r border-foreground/10 bg-background md:static md:flex md:w-[var(--chat-panel-w)]',
          // Sohbet açık değilken liste her ekranda görünür.
          !threadOpen && 'flex',
          // Sohbet açıkken: md'de sabit sütun, küçükte gizli — "aç" düğmesi
          // (bkz. başlık) listeyi KAPLAMA olarak getirir.
          threadOpen && (listOpen ? 'absolute inset-0 z-40 flex' : 'hidden md:flex'),
        )}
      >
        <div className="flex items-center gap-2 border-b border-foreground/10 p-2">
          <input
            type="search"
            value={peerQuery}
            onChange={e => setPeerQuery(e.target.value)}
            placeholder={t('chat.searchPeople')}
            aria-label={t('chat.searchPeople')}
            className="w-full min-w-0 flex-1 rounded-lg border border-foreground/10 bg-transparent px-3 py-2 text-sm outline-none focus-visible:border-primary"
          />
          {/* Kaplama modunda kapatma (md ve üstünde panel sabittir → gizli). */}
          {listOpen && (
            <button
              type="button"
              onClick={() => setListOpen(false)}
              aria-label={t('common.close')}
              className="grid h-9 w-9 shrink-0 cursor-pointer place-items-center rounded-lg transition-colors hover:bg-foreground/10 md:hidden"
            >
              ✕
            </button>
          )}
        </div>

        <div
          className="relative min-h-0 flex-1 overflow-y-auto p-2"
          onClick={() => setMenuPeer(null)}
          onContextMenu={e => e.preventDefault()}
        >
          {peers === null && !peersError && <ChatSkeleton label={t('chat.loading')} />}
          {peers === null && peersError && <p className="p-4 text-sm text-danger">{t('chat.error')}</p>}
          {peers !== null && visiblePeers.length === 0 && (
            <p className="p-4 text-sm text-foreground-500">{t('chat.noMatch')}</p>
          )}
          {visiblePeers.map(p => (
            <div key={p.id} className="relative">
              <button
                type="button"
                onClick={() => openWith(p.id)}
                onContextMenu={isAdmin
                  ? (e) => {
                      // Sağ tık menüsü (favori/takma ad/profil/engelle...) yalnız
                      // yöneticiye açık; normal kullanıcıya "Yetki yok." hatası
                      // göstermenin anlamı yok.
                      e.preventDefault()
                      e.stopPropagation()
                      setMenuPeer(p)
                    }
                  : undefined}
                className="flex w-full cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors hover:bg-foreground/5"
              >
                {/* profil fotoğrafı + durum noktası (yeşil/kırmızı/sarı) */}
                <span className="relative size-9 shrink-0">
                  <span className="flex size-9 items-center justify-center overflow-hidden rounded-full bg-primary/15 text-xs font-semibold text-primary">
                    {p.avatarUrl
                      ? <img src={p.avatarUrl} alt="" className="size-full object-cover" />
                      : (p.nickname || p.fullName || p.username).slice(0, 2).toUpperCase()}
                  </span>
                  <PresenceDot presence={p.presence} t={t} />
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium">
                    {p.nickname || p.fullName || p.username}
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
                          {p.nickname && p.fullName
                            ? `${p.fullName} · @${p.username}`
                            : `@${p.username}`}
                          {p.preview && (
                            <>
                              {' '}
                              ·
                              {' '}
                              {p.preview}
                            </>
                          )}
                        </span>
                      )}
                </span>
                {(p.important || p.favorite || p.blocked) && (
                  <span className="ml-auto shrink-0 text-xs" aria-hidden="true">
                    {p.blocked ? '🚫' : p.important ? '📌' : '⭐'}
                  </span>
                )}
              </button>

              {menuPeer?.id === p.id && (
                <PeerMenu
                  peer={p}
                  t={t}
                  onClose={() => setMenuPeer(null)}
                  onNicknameSave={async (nickname) => {
                    await runAdmin('nickname', p, { nickname })
                    setPeers(prev =>
                      (prev ?? []).map(x => (x.id === p.id ? { ...x, nickname: nickname || null } : x)))
                    setMenuPeer(null)
                  }}
                  onProfile={() => {
                    setProfilePeer(p)
                    setMenuPeer(null)
                  }}
                  onToggle={async (action, next) => {
                    setMenuPeer(null)
                    await runAdmin(action, p, { [action]: next })
                    // 20 sn'lik tazelemeyi bekleme — menü hemen yeni durumu göstersin.
                    setPeers(prev =>
                      (prev ?? []).map((x) => {
                        if (x.id !== p.id) {
                          return x
                        }
                        return action === 'favorite' || action === 'important' || action === 'block'
                          ? { ...x, [action]: next }
                          : x
                      }))
                  }}
                  onClear={async () => {
                    setMenuPeer(null)
                    await runAdmin('clear', p)
                  }}
                  onDelete={async () => {
                    setMenuPeer(null)
                    await runAdmin('deleteConversation', p)
                  }}
                />
              )}
            </div>
          ))}
        </div>

        {profilePeer && (
          <ProfileSheet peer={profilePeer} t={t} onClose={() => setProfilePeer(null)} />
        )}
      </aside>

      {/* ── SÜRÜKLEME TUTAMAĞI: panel genişliği (fare + ok tuşları) ── */}
      <div
        role="separator"
        aria-orientation="vertical"
        aria-label={t('chat.resizePanel')}
        tabIndex={0}
        onPointerDown={startResize}
        onKeyDown={resizeByKey}
        className="hidden w-1 shrink-0 cursor-ew-resize bg-foreground/10 transition-colors hover:bg-primary/40 md:block"
      />

      {/* ── SAĞ: seçili kişiyle sohbet ── */}
      <section
        className={cn(
          'min-h-0 min-w-0 flex-1 flex-col',
          threadOpen ? 'flex' : 'hidden md:flex',
        )}
      >
        {/* başlık: seçili kişinin adı + durum noktası */}
        <div className="flex items-center gap-2 border-b border-foreground/10 px-4 py-3">
          {threadOpen && (
            <>
              {/* Küçük ekranda liste gizliyken AÇMA düğmesi: "←" (listeye dön)
                  okundan ÖNCE durur — panel kapalı olsa da açılabilir. */}
              <button
                type="button"
                onClick={() => setListOpen(true)}
                title={t('chat.openPeopleList')}
                aria-label={t('chat.openPeopleList')}
                className="cursor-pointer rounded-lg px-2 py-1 transition-colors hover:bg-foreground/10 md:hidden"
              >
                <UsersIcon size={18} />
              </button>
              <button
                type="button"
                onClick={() => {
                  setConversationId(null)
                  setActivePeerId(null)
                  setMessages([])
                  setError(null)
                }}
                title={t('chat.backToList')}
                aria-label={t('chat.backToList')}
                className="cursor-pointer rounded-lg px-2 py-1 text-sm transition-colors hover:bg-foreground/10 md:hidden"
              >
                ←
              </button>
            </>
          )}
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

        {/* mesajlar */}
        <div className="min-h-0 flex-1 space-y-2 overflow-y-auto px-4 py-4">
          {!threadOpen && (
            <p className="pt-10 text-center text-sm text-foreground-500">{t('chat.selectPerson')}</p>
          )}
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
                className="cursor-pointer rounded-lg px-3 py-2 text-sm font-medium text-primary transition-colors hover:bg-primary/10 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {t('chat.emptyThread')}
              </button>
            </div>
          )}
          {threadOpen && messages.map((m) => {
            const mine = m.sender_id === (selfId || currentUserId)
          const replied = replyTo?.id === m.id
          const tick = mine ? tickFor(m) : null
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
                {/* tikler — ikon/renk kararı `lib/chat-ticks.ts`te (saf + testli) */}
                <span className="ml-2 inline-flex items-center gap-0.5 align-middle text-[10px]">
                  <span>{new Date(m.created_at).toLocaleTimeString('tr', { hour: '2-digit', minute: '2-digit' })}</span>
                  {tick && (
                    <span className={cn('inline-flex shrink-0', tick.color)} role="img" aria-label={t(tick.labelKey)}>
                      {tick.double ? <TickReadIcon size={14} /> : <TickSentIcon size={14} />}
                    </span>
                  )}
                </span>
              </div>
            </div>
          )
          })}
          <div ref={endRef} />
        </div>

        {/* yazma alanı — kişi seçilmeden gösterilmez */}
        {threadOpen && (
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
        {/* WhatsApp tarzı tek parça "hap" yazma alanı (2026-10-13, kullanıcı).
            İkonlar ve giriş AYNI kutunun içinde; girişin kendi kenarlığı,
            odak halkası ve arka planı YOK — bar tek kutu gibi görünür. Sağ
            uçtaki düğme boşken MİKROFON, yazı varken yeşil GÖNDER olur
            (karar: `hasDraft`, bkz. yukarısı). */}
        <div className="flex min-h-12 items-center gap-1 rounded-full bg-foreground/10 px-3 py-1 transition-colors focus-within:bg-foreground/15">
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
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            aria-label={t('chat.attach')}
            title={t('chat.attach')}
            className="grid h-9 w-9 shrink-0 cursor-pointer place-items-center rounded-full text-foreground/60 transition-colors hover:bg-foreground/10 hover:text-foreground"
          >
            <PaperclipIcon size={20} />
          </button>
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
            onClick={() => {
              if (hasDraft) {
                send()
              }
            }}
            disabled={sending}
            aria-label={hasDraft ? t('chat.send') : t('chat.voiceSoon')}
            title={hasDraft ? t('chat.send') : t('chat.voiceSoon')}
            className={`grid h-10 w-10 shrink-0 cursor-pointer place-items-center rounded-full transition-colors duration-200 disabled:cursor-not-allowed disabled:opacity-60 ${sendBtnClass}`}
          >
            {/* İki ikon üst üste durur; 200ms fade + scale ile yer değiştirir. */}
            <span className="relative grid h-5 w-5 place-items-center">
              <MicIcon
                size={20}
                className={`absolute transition-all duration-200 ${hasDraft ? 'scale-50 opacity-0' : 'scale-100 opacity-100'}`}
              />
              <SendIcon
                size={18}
                className={`absolute transition-all duration-200 ${hasDraft ? 'scale-100 opacity-100' : 'scale-50 opacity-0'}`}
              />
            </span>
          </button>
        </div>
        {/* Emoji seçici (2026-10-12): aramalı, kaydırılabilir, koyu tema —
            `emoji-picker-element`. Eski 16 emojili şerit kaldırıldı. */}
        {showEmoji && (
          <EmojiPicker
            locale={locale}
            onPick={insertEmoji}
            onClose={() => setShowEmoji(false)}
          />
        )}
          </div>
        )}

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
      </section>
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
 */
function PeerMenu({ peer, t, onClose, onNicknameSave, onProfile, onToggle, onClear, onDelete }: {
  peer: Peer
  t: (key: string) => string
  onClose: () => void
  onNicknameSave: (nickname: string) => void | Promise<void>
  onProfile: () => void
  onToggle: (action: 'favorite' | 'important' | 'block', next: boolean) => void | Promise<void>
  onClear: () => void | Promise<void>
  onDelete: () => void | Promise<void>
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(peer.nickname ?? '')
  const item = 'block w-full cursor-pointer px-4 py-2.5 text-left text-sm hover:bg-foreground/10'

  return (
    <div className="absolute top-2 right-2 z-50 min-w-56 overflow-hidden rounded-xl border border-foreground/10 bg-background shadow-xl" onClick={e => e.stopPropagation()}>
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
                  {t('cancel')}
                </button>
              </div>
            </form>
          )
        : (
            <>
              <div className="flex items-center justify-between border-b border-foreground/10 px-4 py-2">
                <p className="min-w-0 truncate text-xs text-foreground-500">
                  {peer.nickname || peer.fullName || peer.username}
                </p>
                <button
                  type="button"
                  onClick={onClose}
                  aria-label={t('common.close')}
                  className="cursor-pointer rounded px-1 text-xs hover:bg-foreground/10"
                >
                  ✕
                </button>
              </div>
              <button type="button" className={item} onClick={() => onProfile()}>
👤
{t('chat.viewProfile')}
</button>
              <button type="button" className={item} onClick={() => setEditing(true)}>
✏️
{t('chat.setNickname')}
</button>
              <button type="button" className={item} onClick={() => onToggle('favorite', !peer.favorite)}>
                ⭐
{' '}
{peer.favorite ? t('chat.unfavorite') : t('chat.favorite')}
              </button>
              <button type="button" className={item} onClick={() => onToggle('important', !peer.important)}>
                📌
{' '}
{peer.important ? t('chat.unmarkImportant') : t('chat.markImportant')}
              </button>
              <button type="button" className={item} onClick={() => onToggle('block', !peer.blocked)}>
                🚫
{' '}
{peer.blocked ? t('chat.unblock') : t('chat.block')}
              </button>
              <button type="button" className={item} onClick={() => onClear()}>
🧹
{t('chat.clearConversation')}
</button>
              <button type="button" className={`${item} text-red-500`} onClick={() => onDelete()}>
🗑
{t('chat.deleteConversation')}
</button>
            </>
          )}
    </div>
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
          <button type="button" onClick={onClose} aria-label={t('common.close')} className="cursor-pointer rounded-lg px-2 py-1 text-sm hover:bg-foreground/10">
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
                <dt className="text-foreground-500">{t('chat.groups')}</dt>
                <dd className="truncate text-right">
                  {profile.groups.length ? profile.groups.map(g => g.title).join(', ') : '—'}
                </dd>
              </div>
            </dl>
            {profile.bio && <p className="mt-3 text-sm text-foreground-500">{profile.bio}</p>}

            {/*
              Kullanıcı isteği: e-posta (gmail), telefon ve ŞİFRE canlıda
              GÖSTERİLMEZ. Sunucu bu alanları hiç göndermiyor; burada da
              hiçbir yerde yer almıyorlar.
            */}
            <p className="mt-4 rounded-lg bg-foreground/5 px-3 py-2 text-xs text-foreground-500">
              🔒
{' '}
{t('chat.privacyNote')}
            </p>
          </>
        )}
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
          <p className="max-h-20 overflow-y-auto border-b border-foreground/10 px-4 py-2 text-xs text-foreground-500">
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
