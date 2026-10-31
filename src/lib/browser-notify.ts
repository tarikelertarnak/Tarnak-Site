'use client'

/**
 * Tarayıcı bildirimleri (2026-10-30, kullanıcı: "bildirim açma olayı olsun,
 * chat kısmına girince istesin").
 *
 * `ponytail:` Push servisi YOK — yalnız Notification API. Sekme kapalıyken
 * bildirim gelmez; sunucudan push gerektiren sürüm ayrı bir iştir (service
 * worker + VAPID). Buradaki katman, sekme arka plandayken gelen mesajı
 * masaüstü bildirimi olarak gösterir.
 */

export type NotifyState = 'unsupported' | NotificationPermission

const DISMISS_KEY = 'tarnak:chat-notify'

export function notifyState(): NotifyState {
  if (typeof window === 'undefined' || !('Notification' in window))
    return 'unsupported'
  return Notification.permission
}

/** Kullanıcı "Sonra" dediyse aynı oturumlarda tekrar sormayalım. */
export function notifyDismissed(): boolean {
  if (typeof window === 'undefined')
    return true
  try {
    return window.localStorage.getItem(DISMISS_KEY) === 'off'
  }
  catch {
    return false
  }
}

export function dismissNotify(): void {
  try {
    window.localStorage.setItem(DISMISS_KEY, 'off')
  }
  catch {
    // localStorage kapalı — sessiz geç
  }
}

export async function askNotify(): Promise<NotifyState> {
  if (notifyState() !== 'default')
    return notifyState()
  try {
    return await Notification.requestPermission()
  }
  catch {
    return notifyState()
  }
}

/**
 * Yalnız sekme GÖRÜNMEZKEN bildirir: kullanıcı sohbeti okuyorsa masaüstü
 * bildirimi gürültüdür. İzin yoksa hiçbir şey yapmaz.
 */
export function showBrowserNotification(title: string, body: string, tag?: string): void {
  if (notifyState() !== 'granted')
    return
  if (typeof document === 'undefined' || !document.hidden)
    return
  try {
    const n = new Notification(title, {
      body: body.slice(0, 140),
      tag,
      icon: '/icon-192x192.png',
    })
    n.onclick = () => {
      window.focus()
      n.close()
    }
  }
  catch {
    // Bazı tarayıcılar (ör. mobil Safari) constructor'ı reddeder — sessiz geç
  }
}
