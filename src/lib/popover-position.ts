/**
 * Popover konumlandırma — TEK çözümleyici (2026-10-06, kullanıcı).
 *
 * Kullanıcının isteği:
 *   1. Panel butonun HEMEN ALTINDA, çok az boşlukla açılsın.
 *   2. "Altına açılamazsa üste, sağa, sola gibi şeyler de olsun" —
 *      yön sırası: alt → üst → sağ → sol.
 *   3. "Garanti görünsün, panel butonun üstüne gelmesin" — hiçbir
 *      dalda panel tetikleyicinin dikdörtgeniyle ÇAKIŞMAZ.
 *
 * Neden ayrı modül: `contact-quick-menu` ve `searchable-combobox`
 * ("Sürüm seç") aynı isteği paylaşıyordu ve ikisi de ayrı ayrı bozuktu —
 * biri `-mt-7` ile butonun ÜSTÜNE biniyordu, diğeri `mt-2` (8px) ile
 * gereğinden fazla boşluk bırakıyordu. İki ayrı sabit de tutulursa
 * yine ayrışırlar.
 *
 * Neden portal + `position: fixed`: panel `position: absolute` ile bir
 * atasının `overflow: hidden` içinde kalırsa KIRPILIR ve "garanti
 * görünsün" garantisi bozulur. `fixed` + portal ekrandaki koordinatı
 * kullanır, hiçbir ata kırpamaz.
 */

export type PopoverPlacement = 'bottom' | 'top' | 'right' | 'left'

export interface PopoverSize {
  width: number
  height: number
}

export interface PopoverPosition {
  top: number
  left: number
  placement: PopoverPlacement
  /** Panelin ekranı aşmaması için uygulanacak max yükseklik (px). */
  maxHeight: number
  /** Panelin ekranı aşmaması için uygulanacak max genişlik (px). */
  maxWidth: number
}

export interface PopoverOptions {
  /** Tetikleyici ile panel arasındaki boşluk (px). */
  gap?: number
  /** Panelin ekran kenarından uzaklığı (px). */
  padding?: number
}

/**
 * Tetikleyiciye göre panel konumu.
 *
 * Sıra: alt → üst → sağ → sol. Hiçbiri sığmıyorsa `bottom` seçilir ve
 * panel `maxHeight` ile ekrana sığacak şekilde kırpılır (içi kaydırılır)
 * — yani her durumda EKRANDA görünür ve butona binmez.
 */
export function computePopoverPosition(
  trigger: { top: number, bottom: number, left: number, right: number },
  panel: PopoverSize,
  viewport: { width: number, height: number },
  { gap = 6, padding = 8 }: PopoverOptions = {},
): PopoverPosition {
  const vw = viewport.width
  const vh = viewport.height

  // Panel ekrana sığan en geniş hali.
  // Taban değer YOK: küçük viewport'ta zorlanan bir taban (ör. 120px)
  // paneli ekrandan taşırıyor ve "asla çakışma / asla taşma" garantisini
  // bozuyordu. Sığdığı kadar sığar, gerekiyorsa içi kaydırılır.
  const maxWidth = Math.max(0, Math.min(panel.width, vw - padding * 2))
  const maxHeight = Math.max(0, Math.min(panel.height, vh - padding * 2))

  const clampLeft = (left: number) =>
    Math.min(Math.max(padding, left), Math.max(padding, vw - maxWidth - padding))
  const clampTop = (top: number) =>
    Math.min(Math.max(padding, top), Math.max(padding, vh - maxHeight - padding))

  /* ── 1) ALT — tercih edilen yön ─────────────────────────────────────── */
  const altSpace = vh - trigger.bottom - gap - padding
  if (altSpace >= panel.height) {
    return {
      top: trigger.bottom + gap,
      left: clampLeft(trigger.left),
      placement: 'bottom',
      maxHeight,
      maxWidth,
    }
  }

  /* ── 2) ÜST ────────────────────────────────────────────────────────── */
  // Dikkat: `top` dalı panelin GERCEK YUKSEKLIGI ile konumlanir; `maxHeight`
  // sadece üst yarıyı sığdıramadığımızda kırpma için kullanılır. (Ölçüm:
  // test "ne altta ne üstte sığıyor" senaryosunda maxHeight'ın panel.height'a
  // eşit dönmesi hata çıkardı → üstte yer vardı, kırpma gerekmiyordu.)
  const ustSpace = trigger.top - gap - padding
  if (ustSpace >= panel.height) {
    return {
      top: trigger.top - gap - panel.height,
      left: clampLeft(trigger.left),
      placement: 'top',
      maxHeight,
      maxWidth,
    }
  }

  /* ── 3) SAĞ ───────────────────────────────────────────────────────── */
  const sagSpace = vw - trigger.right - gap - padding
  if (sagSpace >= panel.width) {
    return {
      top: clampTop(trigger.top),
      left: trigger.right + gap,
      placement: 'right',
      maxHeight,
      maxWidth,
    }
  }

  /* ── 4) SOL ────────────────────────────────────────────────────────── */
  const solSpace = trigger.left - gap - padding
  if (solSpace >= panel.width) {
    return {
      top: clampTop(trigger.top),
      left: trigger.left - gap - panel.width,
      placement: 'left',
      maxHeight,
      maxWidth,
    }
  }

  /* ── 5) HİÇBİRİ SIĞMIYOR → daha geniş olan yerde kırp ────────────── */
  /*
    Burada "en az 120px" gibi bir TABAN koymak garantiyi kırıyordu:
    320×300 viewport'ta panel 106px'a sığması gerekirken `Math.max(120, …)`
    120px dayatıyor ve panel ekrandan taşıyordu (test: "expected 306 to be
    less than or equal to 301").

    Doğrusu: o yönde KALAN yer ne kadar ise panel o kadar büyük olsun.
    Kısa bir panel çirkin ama GÖRÜNÜR ve butona binmez — kullanıcının
    istediği öncelik sırası: alt → üst → sağ → sol, asla çakışma.
  */
  const ustKadar = trigger.top - gap - padding
  const altKadar = vh - trigger.bottom - gap - padding

  if (altKadar >= ustKadar) {
    return {
      top: trigger.bottom + gap,
      left: clampLeft(trigger.left),
      placement: 'bottom',
      maxHeight: Math.max(0, altKadar),
      maxWidth,
    }
  }
  return {
    // `trigger.top - gap - ustKadar` matematiksel olarak `padding`e eşittir.
    top: Math.max(padding, trigger.top - gap - ustKadar),
    left: clampLeft(trigger.left),
    placement: 'top',
    maxHeight: Math.max(0, ustKadar),
    maxWidth,
  }
}

/**
 * Bir dikdörtgen iki dikdörtgenin kesişip kesişmediğini test eder.
 * Testlerde "panel butonun üstüne biniyor mu?" sorusunun cevabı.
 */
export function rectsOverlap(
  a: { top: number, bottom: number, left: number, right: number },
  b: { top: number, bottom: number, left: number, right: number },
): boolean {
  return a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom
}