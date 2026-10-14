'use client'

import type { CSSProperties, KeyboardEvent as ReactKeyboardEvent, MouseEvent as ReactMouseEvent, PointerEvent as ReactPointerEvent } from 'react'
import type { ChatMessageRow } from '@/lib/chat-db'
import type { Presence, PresenceState } from '@/lib/chat-peers'
import Link from 'next/link'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { EmojiPicker } from '@/components/chat/emoji-picker'
import { useT } from '@/components/locale-provider'
import { cn } from '@/components/ui/cn'
import {
  MenuIcon,
  MicIcon,
  PaperclipIcon,
  SendIcon,
  StickerIcon,
  TickReadIcon,
  TickSentIcon,
} from '@/components/ui/icons'
import {
  isTyping,
  PRESENCE_UI,
  presenceOf,
  sortPeers,
  typingLabel,
} from '@/lib/chat-peers'
import { tickFor } from '@/lib/chat-ticks'
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
 * YEREL ÇEVRIMİÇİ DURUMU (local-first, 2026-10-14).
 *
 * Sunucudan gelen `lastSeenAt` yerine, SEKME ODAĞI + KULLANICI ETKILEŞİMİ
 * ile yerel olarak hesaplanır. Sunucuya senkron:
 *   - Sekme kapanırken / gizlenirken (pagehide, visibilitychange)
 *   - Periyodik (5 dk bir) — sadece "hala buradayım" demek için
 *   - Yazma durumu değiştiğinde (typing start/stop)
 *
 * Bu sayede:
 *   - 2 sn'de bir `/api/chat/users` çekmek YOK (liste POLL_MS kaldırıldı)
 *   - Yeşil nokta anında tepki verir (ağ gecikmesi yok)
 *   - Sunucu yükü %90+ azalır
 */
const LOCAL_ONLINE_TTL_MS = 30_000 // yerel "çevrimiçi" sayılma penceresi (30 sn)
const SYNC_INTERVAL_MS = 5 * 60 * 1000 // sunucuya periyodik senkron (5 dk)

interface LocalPresenceState {
  isOnline: boolean
  lastActivity: number
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
export function Chat({ nextPath = '/chat' }: ChatProps) {
  const { t, locale } = useT()
  const [messages, setMessages] = useState<ChatMessageRow[]>([])
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
    /** Boş alana sağ tık / uzun basma (2026-10-13 kullanıcı isteği). */
    | { kind: 'area', x: number, y: number }
    /** Kişi listesi süzgeci (filtre düğmesi — arama kutusunun yanı). */
    | { kind: 'filter', x: number, y: number }
    | null
  >(null)
  /** "İlet" (forward) hedef seçimi — mesajı başka bir kişiye gönderir. */
  const [forwardMsg, setForwardMsg] = useState<ChatMessageRow | null>(null)
  const [infoMsg, setInfoMsg] = useState<ChatMessageRow | null>(null)
  const [confirmMsg, setConfirmMsg] = useState<ChatMessageRow | null>(null)
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
  /** Metin alanı: emoji imlecin olduğu yere eklensin diye ref gerekir. */
  const inputRef = useRef<HTMLInputElement>(null)
  /** Mesaj alanı: kaydırma BURADA olur, sayfada değil (bkz. `scrollToBottom`). */
  const listRef = useRef<HTMLDivElement>(null)
  /** Kişi arama alanı — "Kişi ara" menü maddesi odağı buraya verir. */
  const searchRef = useRef<HTMLInputElement>(null)
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
        hasConversation: !!conv,
        important: !!conv?.important,
        favorite: !!conv?.favorite,
        blocked: !!conv?.blocked,
        kind: conv?.kind ?? null,
        lastMessageAt: conv?.updated_at ?? null,
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
    YEREL ÇEVRIMİÇİ DURUMU + YAZMA SİNYALİ (local-first, 2026-10-14).

    Sunucudan gelen `lastSeenAt` yerine, SEKME ODAĞI + KULLANICI ETKILEŞİMİ
    ile yerel olarak hesaplanır. Sunucuya senkron:
      - Sekme kapanırken / gizlenirken (pagehide, visibilitychange)
      - Periyodik (5 dk bir) — sadece "hala buradayım" demek için
      - Yazma durumu değiştiğinde (typing start/stop)

    Bu sayede:
      - 2 sn'de bir `/api/chat/users` çekmek YOK (liste POLL_MS kaldırıldı)
      - Yeşil nokta anında tepki verir (ağ gecikmesi yok)
      - Sunucu yükü %90+ azalır
  */
  const localPresenceRef = useRef<LocalPresenceState>({
    isOnline: true,
    lastActivity: Date.now(),
    presenceState: null,
  })
  const syncTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const activityTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  /** Yazma sinyalinin son gönderim zamanı (throttle) + "durdu" zamanlayıcısı. */
  const typingSentAt = useRef(0)
  const typingIdle = useRef<ReturnType<typeof setTimeout> | null>(null)

  /** Yerel aktiviteyi tazeler (fare/klavye/odak). */
  const markActivity = useCallback(() => {
    const now = Date.now()
    localPresenceRef.current.lastActivity = now
    localPresenceRef.current.isOnline = true
    if (activityTimerRef.current) {
      clearTimeout(activityTimerRef.current)
    }
    // 30 sn aktivite yoksa yerel olarak offline say
    activityTimerRef.current = setTimeout(() => {
      localPresenceRef.current.isOnline = false
    }, LOCAL_ONLINE_TTL_MS)
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
    const onFocus = () => markActivity()
    const onUserActivity = () => markActivity()

    document.addEventListener('visibilitychange', onVisibilityChange)
    window.addEventListener('pagehide', onPageHide)
    window.addEventListener('focus', onFocus)
    // Kullanıcı etkileşimleri: tıklama, tuş basma, dokunma, kaydırma
    window.addEventListener('click', onUserActivity, { passive: true })
    window.addEventListener('keydown', onUserActivity, { passive: true })
    window.addEventListener('touchstart', onUserActivity, { passive: true })
    window.addEventListener('scroll', onUserActivity, { passive: true })

    // Başlangıçta online olarak işaretle ve senkron başlat
    markActivity()
    startSyncTimer()

    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange)
      window.removeEventListener('pagehide', onPageHide)
      window.removeEventListener('focus', onFocus)
      window.removeEventListener('click', onUserActivity)
      window.removeEventListener('keydown', onUserActivity)
      window.removeEventListener('touchstart', onUserActivity)
      window.removeEventListener('scroll', onUserActivity)
      stopSyncTimer()
      if (activityTimerRef.current) {
        clearTimeout(activityTimerRef.current)
      }
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
    setPanelOpen(v => !v)
  }

  /** "Kişi ara": panel KOMPAKT ise genişletilir ve arama alanı odaklanır. */
  function focusSearch() {
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

  /** Yanıtlanan mesaja git — kaydırma yine yalnız mesaj alanında. */
  function scrollToMessage(id: string) {
    const el = document.getElementById(`m-${id}`)
    const box = listRef.current
    if (!el || !box) {
      return
    }
    const delta = el.getBoundingClientRect().top - box.getBoundingClientRect().top
    box.scrollTo({ top: box.scrollTop + delta - 40, behavior: 'smooth' })
  }

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
    /*
      ROZET SIFIRLANIR (kullanıcı isteği: "sohbeti açınca okunmamış sıfırlansın,
      rozet kaysın"). Sunucu tarafı da okundu işaretler (`GET /api/chat` →
      `markRead`); liste 2 sn'de bir tazelendiği için sunucudan da 0 gelir —
      buradaki sıfırlama yalnız ANINDA görünmesini sağlar (yeni yoklama yok).
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

  /**
   * Panel GENİŞ/KOMPAKT seçimi hatırlanır. Kayıt yoksa: dar ekranda KOMPAKT,
   * geniş ekranda GENİŞ başlar (kullanıcı isteği 3).
   */
  useEffect(() => {
    try {
      const saved = localStorage.getItem(CHAT_PANEL_OPEN_KEY)
      if (saved === '0' || saved === '1') {
        setPanelOpen(saved === '1')
        return
      }
      setPanelOpen(!isNarrowScreen())
    }
    catch {
      // Depolama kapalı: dar ekran kuralı yine de uygulanır.
      setPanelOpen(!isNarrowScreen())
    }
  }, [])

  useEffect(() => {
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
  /*
    "Henüz başka kullanıcı yok" YOK (2026-10-11): kayıtlı herkes listelenir.
    Takma ad, kullanıcı adı VE gerçek ad birlikte aranır — takma ad konulsa
    bile gerçek ad kaybolmaz (kullanıcı isteği).

    PANEL SÜZGECİ (2026-10-13 kullanıcı istekleri):
      · "bir grupta yer almayıp sadece benimle konuşabilen kişi görünmesin" →
      YÖNETİCİ listesinde, henüz SOBETİ olmayan kayıtlar görünmez: satır ilk
      mesajla (ileride grupla) belirir. Kayıt olup hiç yazmayan kişi paneli
      doldurmaz. Normal kullanıcıda bu kural UYGULANMAZ — onun listesindeki tek
      satır site sahibidir; gizlenirse kimseye yazamazdı.
      · "kullanıcı kendisiyle de konuşamasın" + "admin kendisini görsün,
      kendisiyle konuşabilsin" (son istek, öncekini DEĞİŞTİRDİ): KENDİ SATIRIM
      yalnız YÖNETİCİYE görünür ve sohbeti olmasa da görünür — satır ilk
      tıklamada sohbeti açar (`openWith`). Normal kullanıcı kendisiyle konuşmaz.
  */
  const visiblePeers = orderedPeers
    .filter(p => (p.id === selfId ? isAdmin : (!isAdmin || !!p.hasConversation)))
    .filter((p) => {
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
      /*
        YÜKSEKLİK (2026-10-13 kullanıcı isteği: "dar ekranda kart tam genişlik ve
        tam yükseklik kaplasın; kenar boşluğu en fazla 8-12px olsun").
         · `md` ALTI (<768px): `h-[calc(100dvh-4.5rem)]` — TopBar payı 3.5rem +
           üstte/altta 8er px = 4.5rem. YÜKSEKLİK ŞART (ölçüldü): yükseklik
           verilmezse (ne `h-full` ne sınıfsız) kartın yüksekliği İÇERİĞE göre
           belirsiz kalıyor, `flex-1` çocuklar (mesaj listesi) küçülemiyor ve
           `overflow-y-auto` devre dışı kalıyordu: 24 mesajla 390px'de kaydırma
           kabının `clientHeight`'ı 1106px'e (içerik boyu) çıkıyor, yazma alanı
           kartın dışına itilip `overflow-hidden` ile KIRPILIYORDU.
           `dvh`: mobil klavye açılınca kutu küçülür, yazma alanı taşmaz.
         · `md` VE ÜSTÜ (≥768px): eski sabit yükseklik (`100svh` eksi TopBar 56px
           + bölüm üst payı 80px + slot payları 40px = 11rem) ve yuvarlak kart.
        KIRILMA NOKTASI: 768px (`md`). Altında TEK panel (liste ↔ sohbet geçişi),
        üstünde liste + sohbet yan yana.
      */
      className="relative flex h-[calc(100dvh-4.5rem)] min-h-[260px] w-full overflow-hidden rounded-2xl border border-foreground/10 bg-background md:h-[calc(100svh-11rem)]"
      style={{ '--chat-panel-w': `${panelWidth}px` } as CSSProperties}
    >
      {/* ── SOL: kime yazmak istiyorum (kişi listesi) ──
          İKİ PANEL HER GENİŞLİKTE YAN YANA (2026-10-13 kullanıcı isteği: "tam
          ekran liste görünümü tamamen kaldırılsın"). Genişlik:
            · `md` altı  → `clamp(72px, 28vw, 300px)` (esnek; 480px altında
              kullanıcı isteğiyle KOMPAKT başlar),
            · `md` ve üstü → sürüklenebilir `--chat-panel-w` (kullanıcı ayarı).
          KOMPAKT modda genişlik 72px'e iner; genişlik geçişi 200ms animasyonlu. */}
      <aside
        className={cn(
          'flex min-h-0 shrink-0 flex-col overflow-hidden border-r border-foreground/10 bg-background transition-[width] duration-200 ease-out',
          panelOpen
            ? 'w-[clamp(72px,28vw,300px)] md:w-[var(--chat-panel-w)]'
            : 'w-[72px]',
        )}
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
                              {p.preview
                                ? `${p.previewSender ? `@${p.previewSender} · ` : ''}${p.preview}`
                                : t('chat.empty')}
                            </span>
                          )}
                    </span>
                    {(p.important || p.favorite || p.blocked) && (
                      <span className="ml-auto shrink-0 text-xs" aria-hidden="true">
                        {p.blocked ? '🚫' : p.important ? '📌' : '⭐'}
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

      {/* ── SÜRÜKLEME TUTAMAĞI: panel genişliği (fare + ok tuşları) ── */}
      <div
        role="separator"
        aria-orientation="vertical"
        aria-label={t('chat.resizePanel')}
        tabIndex={0}
        onPointerDown={startResize}
        onKeyDown={resizeByKey}
        className={cn(
          'w-1 shrink-0 cursor-ew-resize bg-foreground/10 transition-colors hover:bg-primary/40',
          // Panel katlanmışsa tutamak da yok (yoksa sürüklenip görünmez
          // genişlik değiştirirdi).
          panelOpen ? 'hidden md:block' : 'hidden',
        )}
      />

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

        {/* mesajlar — kaydırma BURADA olur, sayfada değil (bkz. scrollToBottom) */}
        <div
          ref={listRef}
          className="min-h-0 flex-1 space-y-2 overflow-y-auto px-4 py-4"
          onContextMenu={onAreaContextMenu}
          {...messageLongPress}
        >
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
          {threadOpen && messages.map((m, i) => {
            const mine = m.sender_id === (selfId || currentUserId)
          const replied = replyTo?.id === m.id
          const tick = mine ? tickFor(m) : null
          /*
            GÖNDEREN SATIRI (2026-10-13 kullanıcı isteği): balonun üstünde küçük
            "@kullanıcı" satırı durur. ART ARDA gelen aynı gönderenin mesajlarında
            TEKRARLANMAZ (gruplama). Kendi mesajlarımda gösterilmez: sağdaki mavi
            hizalama zaten kimin yazdığını söyler ve tek kişilik sohbette
            kendi adını okumak gürültüdür.
          */
          const showSender = !mine && (i === 0 || messages[i - 1]?.sender_id !== m.sender_id)
          return (
            <div
              key={m.id}
              data-replied={replied || undefined}
              className={cn('flex flex-col', mine ? 'items-end' : 'items-start')}
            >
              {showSender && (
                <span className="mb-0.5 px-1 text-[10px] text-foreground-500">
                  @
                  {m.sender_name}
                </span>
              )}
              <div
                data-message-id={m.id}
                onContextMenu={(e) => {
                  // Menü İMLECİN konumunda (eskiden tam ekran ortalanmış diyalogdu).
                  // `stopPropagation`: kapsayıcının BOŞ ALAN menüsü üzerine yazmasın.
                  e.preventDefault()
                  e.stopPropagation()
                  setMenu({ kind: 'message', message: m, ...menuPoint(e) })
                }}
                onClick={() => replied && scrollToMessage(m.id)}
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
        </div>

        {/* yazma alanı — kişi seçilmeden gösterilmez.
            `shrink-0` + `env(safe-area-inset-bottom)`: klavye açıldığında
            (kart `dvh` ile küçülür) giriş alanı kırpılmaz, çentikli ekranda
            alt güvenli alan kadar içeriden boşluk bırakır. */}
        {threadOpen && (
          <div className="shrink-0 border-t border-foreground/10 px-3 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
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

      </section>

      {/* ── BAĞLAM MENÜLERİ: imleç konumunda; aynı anda YALNIZ BİRİ açık ── */}
      {menu?.kind === 'peer' && (
        <PeerMenu
          peer={menu.peer}
          x={menu.x}
          y={menu.y}
          t={t}
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
            await runAdmin('clear', peer)
          }}
          onDelete={async () => {
            const peer = menu.peer
            setMenu(null)
            await runAdmin('deleteConversation', peer)
          }}
        />
      )}

      {menu?.kind === 'message' && (
        <MessageMenu
          message={menu.message}
          x={menu.x}
          y={menu.y}
          onClose={() => setMenu(null)}
          onReply={() => { setReplyTo(menu.message); setMenu(null) }}
          onCopy={() => copy(menu.message.text ?? '')}
          onForward={() => { setForwardMsg(menu.message); setMenu(null) }}
          onPin={() => { act('pin', { messageId: menu.message.id, pinned: !menu.message.pinned }); setMenu(null) }}
          onInfo={() => { setInfoMsg(menu.message); setMenu(null) }}
          onDelete={() => { setConfirmMsg(menu.message); setMenu(null) }}
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

      {/*
        BOŞ ALAN MENÜSÜ (2026-10-13 kullanıcı isteği: "boş bir yere sağ
        tıkladığımda da bir şeyler çıksın — mantıklı konulabilecek şeyler").
        Bugün ÇALIŞAN maddeler konuldu; "grup oluştur" sunucuda karşılığı
        olmadığı için yok (grup ucu gelince buraya eklenir).
      */}
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
 *
 * 2026-10-13 (kullanıcı isteği: "menü sağ tıklanan noktada açılmalı"): menü
 * artık `MenuSurface` içinde — imleç konumunda açılır, ekran kenarına taşarsa
 * içeri kayar, Esc / dışarı tıklama / kaydırma kapatır, ok tuşlarıyla gezilir.
 * Önceden `absolute top-2 right-2` ile satırın sağ üst köşesine çakılıydı ve
 * kaydırılan listenin İÇİNDE render edildiği için uzun listede kırpılabiliyordu.
 */
function PeerMenu({ peer, x, y, t, onClose, onNicknameSave, onProfile, onToggle, onClear, onDelete }: {
  peer: Peer
  x: number
  y: number
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
              <MenuItem icon="👤" label={t('chat.viewProfile')} onSelect={() => onProfile()} />
              <MenuItem icon="✏️" label={t('chat.setNickname')} onSelect={() => setEditing(true)} />
              <MenuItem
                icon="⭐"
                label={peer.favorite ? t('chat.unfavorite') : t('chat.favorite')}
                onSelect={() => onToggle('favorite', !peer.favorite)}
              />
              <MenuItem
                icon="📌"
                label={peer.important ? t('chat.unmarkImportant') : t('chat.markImportant')}
                onSelect={() => onToggle('important', !peer.important)}
              />
              <MenuItem
                icon="🚫"
                label={peer.blocked ? t('chat.unblock') : t('chat.block')}
                onSelect={() => onToggle('block', !peer.blocked)}
              />
              <MenuItem icon="🧹" label={t('chat.clearConversation')} onSelect={() => onClear()} />
              <MenuItem icon="🗑" label={t('chat.deleteConversation')} danger onSelect={() => onDelete()} />
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
function MessageMenu({ message, x, y, onClose, onReply, onCopy, onForward, onPin, onInfo, onDelete, labels }: {
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
  labels: Record<string, string>
}) {
  return (
    <MenuSurface x={x} y={y} onClose={onClose} label={labels.header || labels.info}>
      {labels.header && (
        <MenuHeader text={labels.header} onClose={onClose} closeLabel={labels.close} />
      )}
      <MenuItem icon="⧉" label={labels.copy} disabled={!message.text} onSelect={onCopy} />
      <MenuItem icon="↩︎" label={labels.reply} onSelect={onReply} />
      <MenuItem icon="➦" label={labels.forward} onSelect={onForward} />
      <MenuItem icon="📌" label={labels.pin} onSelect={onPin} />
      <MenuItem icon="ⓘ" label={labels.info} onSelect={onInfo} />
      <MenuItem icon="🗑" label={labels.delete} danger onSelect={onDelete} />
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
  labels: { title: string, cancel: string, empty: string }
  onCancel: () => void
  onPick: (peer: Peer) => void | Promise<void>
}) {
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
        <div className="max-h-72 overflow-y-auto">
          {peers.length === 0 && (
            <p className="px-4 py-3 text-sm text-foreground-500">{labels.empty}</p>
          )}
          {peers.map(p => (
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
