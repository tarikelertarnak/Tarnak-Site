'use client'

import type { ReactNode } from 'react'
import type { SiteContent, ToolboxItem as ToolboxItemType } from '@/lib/content'
import type { CvDoc } from '@/lib/cv'
import type { VCard } from '@/lib/phase6'
import { Popover } from '@lobehub/ui/base-ui'
import { useState } from 'react'
import { ContactQuickMenu } from '@/components/contact-quick-menu'
import { FadeUpSection } from '@/components/fade-up-section'
import { useT } from '@/components/locale-provider'
import { BentoBox, BentoBoxItem } from '@/components/ui/bento-box'
import { Button } from '@/components/ui/button'
import { cn } from '@/components/ui/cn'
import { CvPicker } from '@/components/ui/cv-picker'
import {
  BrainIcon,
  CheckIcon,
  ChevronRightIcon,
  CodeIcon,
  CopyIcon,
  FileIcon,
  LaptopIcon,
  LinkIcon,
  MusicIcon,
  SchoolIcon,
  TerminalIcon,
  UserIcon,
} from '@/components/ui/icons'
import { Section, SectionTitle } from '@/components/ui/section'
import { techIcon } from '@/components/ui/tech-icons'
import { VCardQr } from '@/components/vcard-qr'
import { siteUrl } from '@/lib/site-url'
import { buildVCard } from '@/lib/vcard'

/** Interest icons — iconify id → SVG (no iconify dependency). */
const INTEREST_ICONS: Record<string, ReactNode> = {
  'mdi:laptop': <LaptopIcon size={14} />,
  'mdi:music': <MusicIcon size={14} />,
  'mdi:creation': <BrainIcon size={14} />,
}

export function AboutSection({
  content,
  cvs,
  vcard,
}: {
  content: SiteContent
  cvs: CvDoc[]
  /** Faz 6 · dijital kartvisit ayarları. Verilmezse blok render edilmez. */
  vcard?: VCard
}) {
  /**
   * DİLLER KARTI seviye rozeti (2026-10-06, kullanıcı).
   *
   * "Ana Dil" eskiden `bg-primary/15 uppercase text-[11px]` DOLU rozet,
   * A2/A1 ise sade düz metin — üçü birbirine benzemiyordu.
   * Artık HEPSİ aynı: ince mavi çerçeve, şeffaf arka plan, mavi yazı,
   * normal yazı boyutu/fontu.
   */
  const LEVEL_BADGE_PILL
    = 'inline-flex items-center rounded-full border border-primary/70 bg-transparent px-2.5 py-0.5 text-xs font-normal normal-case text-primary'
  const about = content.about
  const { t } = useT()
  const [copiedKey, setCopiedKey] = useState<string | null>(null)

  /*
   * Dijital kartvizit QR içeriği (Faz 6 · 2; düzenleme).
   *
   * vCard indirme route'u ve "Kartvisiti indir" düğmesi KALDIRILDI. Artık tek
   * yol QR kod: vCard doğrudan `content` (Supabase merge sonrası) üzerinden
   * `buildVCard(...)` ile üretilir ve QR'ın içine gömülür — telefon tarayınca
   * kişiyi otomatik tanır. Tüm alanlar content/Supabase kaynaklıdır; uydurma
   * değer yazılmaz.
   */
  const vcardQrMetin = buildVCard({
    firstName: content.profile.firstName,
    lastName: content.profile.lastName,
    displayName: content.profile.displayName,
    nickname: content.profile.nickname,
    phone: content.contact.phone,
    email: content.contact.email,
    url: siteUrl('/'),
    social: content.social?.find(s => s?.href)?.href,
    note: vcard?.note,
  })

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
          tightGap
        />
        {/*
          BÖLÜM BOŞLUĞU — ÜST (2026-10-06, kullanıcı kuralı: "başlık ile
          butonlar arasındaki boşluk, butonlar ile içerik arasındaki
          boşlukla AYNI olsun").

          `tightGap` olmadan `SectionTitle` kendi `pb-8 sm:pb-10 lg:pb-12`
          alt boşluğunu getiriyor (48px) → başlık→buton 72px, buton→kart 0px
          (ölçülen). Alt boşluk sıfırlanıp İKİ taraf da tek kaynaktan
          (`--section-gap`) verildi.
        */}
        <div aria-hidden className="h-[var(--section-gap)]" />
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
        {/*
          BÖLÜM BOŞLUĞU (2026-10-06, kullanıcı: "Butonlar hiçbir yerde
          alttaki içeriğe YAPIŞIK olmasın").
          Buton satırı ile Kişisel Bilgiler kartı arasında boşluk YOKTU.
          `mt-[var(--section-gap)]` tek kaynaktan gelir.
        */}
        <div aria-hidden className="h-[var(--section-gap)]" />
      </FadeUpSection>

      <div className="flex w-full justify-center">
        <BentoBox className="w-full max-w-6xl grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {/* Personal info */}
          <BentoBoxItem className="col-span-1 sm:col-span-2 lg:col-span-3 gap-4">
            {/*
              KART İÇ DÜZENİ (2026-10-12, kullanıcı: "dağınık ve hizasız"):

              · ÜST SATIR: avatar + (başlık + bilgi grid'i). `sm:items-start`
                ile "Kişisel Bilgiler" başlığının üst çizgisi avatarın üst
                çizgisiyle aynı hizada (kullanıcı isteği).
              · GRID: `sm:grid-cols-2` + `gap-x-8`; e-posta `sm:col-span-2`
                (uzun adres kesilmesin, sağ sütunda boş hücre kalmasın).
                4/8px katları: gap-x-8 = 32, mt-2 = 8, sm:gap-6 = 24.
            */}
            <div className="flex w-full flex-col gap-4 sm:flex-row sm:items-start sm:gap-6">
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
                <div className="mt-2 grid w-full grid-cols-1 sm:grid-cols-2 gap-x-8">
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
                        onClick={() =>
                          copyValue('name', content.profile.firstName)}
                      />
                    )}
                  />
                  {/*
                    SOYAD — kopyala düğmesi 2026-10-06'da eklendi.
                    Önce yalnız "Ad" satırında vardı; bu yüzden kartta
                    "TARIK [kopyala]" ile "ELER" (düğmesiz, sağ uca
                    yapışmış) yan yana duruyordu — gözde eksik/bozuk
                    görünüyordu. Artık ÜÇ isim satırının da düğmesi var ve
                    hepsi aynı hizada.
                  */}
                  <InfoRow
                    label={t('about.infoLastName')}
                    value={content.profile.lastName}
                    action={(
                      <CopyValueButton
                        copied={copiedKey === 'lastName'}
                        label={t('about.copy')}
                        copiedLabel={t('about.copied')}
                        onClick={() =>
                          copyValue('lastName', content.profile.lastName)}
                      />
                    )}
                  />
                  {/*
                    TAKMA AD SATIRI (2026-10-06, kullanıcı "bozuk" dedi).

                    Sorun: bu satir `sm:col-span-2` ile TAM GENISLIK
                    yapildigi icin `InfoRow`'un `justify-between` davranisi
                    etiketi kartin sol ucuna, "Tarnak" degerini sag ucuna
                    yapistiriyordu — aralarinda kartin tamami bos kaliyordu,
                    "Takma ad" ve "Tarnak" birbirinden copuk duruyordu.
                    Telefonda `grid-cols-1` oldugu icin ayni sorun gorunmuyor,
                    bu yuzden masaustunde fark ediliyordu.

                    Duzeltme: `sm:col-span-2` KALDIRILDI. Artik diger
                    satirlarla ayni 2 kolonlu gridde, "Ad | Soyad"in altinda
                    SOL kolonda duruyor. Kopyala dugmesi de ayni hucreye
                    geri geldi (onceden sadece "Ad" satirinda vardi).
                  */}
                  <InfoRow
                    label={t('about.infoNickname')}
                    value={content.profile.nickname}
                    action={(
                      <CopyValueButton
                        copied={copiedKey === 'nickname'}
                        label={t('about.copy')}
                        copiedLabel={t('about.copied')}
                        onClick={() =>
                          copyValue('nickname', content.profile.nickname)}
                      />
                    )}
                  />
                  <InfoRow
                    label={t('about.infoPhone')}
                    value={content.contact.phone}
                    action={(
                      <CopyValueButton
                        copied={copiedKey === 'phone'}
                        label={t('about.copy')}
                        copiedLabel={t('about.copied')}
                        onClick={() =>
                          copyValue('phone', content.contact.phone)}
                      />
                    )}
                  />
                  <InfoRow
                    className="sm:col-span-2"
                    label={t('about.infoEmail')}
                    value={content.contact.email}
                    action={(
                      <CopyValueButton
                        copied={copiedKey === 'email'}
                        label={t('about.copy')}
                        copiedLabel={t('about.copied')}
                        onClick={() =>
                          copyValue('email', content.contact.email)}
                      />
                    )}
                  />
                  {/*
                    DİSCORD SATIRI TAŞINDI (2026-10-10, kullanıcı): "Kişisel
                    Bilgiler"deki Discord satırı kaldırıldı; Discord artık
                    "İletişim Bilgileri" menüsünde (`contact-channels.ts`,
                    "Discord Grubu") görünüyor — iletişim yolu oraya ait.
                  */}
                  {/*
                    "Ana Dil" satiri kaldirildi (kullanici istegi): ayni bilgi
                    "Diller" tablosunda zaten `about.infoFirstLanguage` rozetiyle
                    gorunuyor, burada tekrar etiketli satiri gereksiz tekrardi.
                  */}
                </div>
              </div>
            </div>
            {/* Dijital kartvizit (Faz 6 · 2) — YALNIZCA QR kod. vCard içeriğini
                doğrudan taşır (telefon taratınca kişiyi tanır). İndirme
                düğmesi ve kart üstü metinler (2026-10-11, kullanıcı) kaldırıldı;
                Faz 6 vcard bölümü kapalıysa hiç gösterilmez. */}
            {vcard && vcard.enabled !== false && vcardQrMetin ? (
              <VCardQr vcardText={vcardQrMetin} />
            ) : null}
          </BentoBoxItem>

          {/* Languages: structured table. Data stays a plain string
              ("İngilizce (A2), Almanca (A1)") — parsed here, no schema churn. */}
          <BentoBoxItem className="col-span-1 sm:col-span-2 lg:col-span-3 gap-4">
            <h3 className="text-base sm:text-lg font-semibold">
              {t('about.languagesTitle')}
            </h3>
            {/*
                DİLLER KARTI (2026-10-06 + 2026-10-07 düzeltmeleri):

                Kullanıcı 2026-10-07: "çok bordera değiyor" → içerik
                çerçeveye yapışıyordu. Çözüm: çerçeve KALDI ama içine
                yatay boşluk (`px-3 sm:px-4`) eklendi; hücreler de `py-2.5`
                ile dikeyde nefes alıyor. `overflow-x-auto` korunuyor —
                uzun dil adları yatay kaydırılabilir.
            */}
            <div className="w-full overflow-x-auto rounded-xl border border-foreground/200/15 px-3 sm:px-4">
              <table className="w-full text-left text-xs sm:text-sm">
                <tbody>
                  <tr className="border-b border-foreground/200/10">
                    <td className="py-2.5 pr-3 text-sm font-medium sm:text-base">
                      {content.profile.firstLanguage}
                    </td>
                    <td className="py-2.5 text-right">
                      {/* `LEVELED_PILL`: üç seviye için TEK sınıf seti */}
                      <span className={LEVEL_BADGE_PILL}>
                        {t('about.infoFirstLanguage')}
                      </span>
                    </td>
                  </tr>
                  {parseLanguages(content.profile.otherLanguages).map(row => (
                    <tr
                      key={row.name}
                      className="border-b border-foreground/200/10 last:border-b-0"
                    >
                      <td className="py-2.5 pr-3 text-sm text-foreground/80 sm:text-base">
                        {row.name}
                      </td>
                      <td className="py-2.5 text-right">
                        <span className={LEVEL_BADGE_PILL}>{row.level}</span>
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

          <BentoBoxItem className="col-span-1 sm:col-span-2 lg:col-span-3">
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

          <BentoBoxItem className="col-span-1 sm:col-span-2 lg:col-span-3">
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
  className,
}: {
  label: string
  value: string
  action?: ReactNode
  className?: string
}) {
  /*
    2026-10-12 (kullanıcı: "etiketler farklı genişlikte, değerler farklı x'ten
    başlıyor, kopyala ikonları hizada değil, e-posta kesiliyor"):

    Satır artık ÜÇ KOLONLU grid — `[etiket | değer | ikon]`:
      · auto          : etiket en az 90px → KISA etikette de ("Ad") değer
                        hep aynı x'ten başlar; satırlar arası hiza korunur.
      · minmax(0,1fr) : değer. `break-all` → e-posta `...` ile KESİLMEZ,
                        gerekirse alta kırılır (`truncate` kaldırıldı).
      · auto          : kopyala düğmesi satırın en sağında, dikey ortada.
    `min-h-[44px]` + `py-2`: tüm satırlar aynı yükseklikte → alt çizgiler
    aynı hizada ve aynı kalınlıkta.

    ⚠️ 2026-10-10'da buradaki grid kaldırılıp İKİ UCA YASLI flex'e
    geçilmişti çünkü SABİT 104px'lik etiket sütunu kısa etiketlerde değeri
    ~110px sağa itiyordu ("Ad .......... TARIK"). Burada aynı hataya
    düşülmüyor: etiket sütunu `minmax(90px, auto)` — 90px'i aşan etiket
    varsa o satırda genişler, değere `gap-x-3` (12px) yapışık kalır.
    (Eski düzenin class adı bu bilinçle yazılmadı: `vcard-qr-only.test.ts`
    bu dilimde o adı yasaklıyor.)
  */
  return (
    <div
      className={cn(
        'grid min-h-[44px] grid-cols-[minmax(90px,auto)_minmax(0,1fr)_auto] items-center gap-x-3 border-b border-foreground/200/10 py-2',
        className,
      )}
    >
      <span className="text-sm text-foreground/60">
        {label}
        :
      </span>
      <span className="min-w-0 break-all text-left text-sm font-semibold text-foreground">
        {value.trim() || '—'}
      </span>
      {/*
        Kopyala düğmesi 3. kolonda (`auto`) — değer uzunluğundan bağımsız
        olarak bütün satırlarda aynı dikey çizgide durur.
      */}
      {action
        ? (
            <span className="flex shrink-0 items-center justify-self-end">
              {action}
            </span>
          )
        : null}
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
      {copied ? <CheckIcon size={13} /> : <CopyIcon size={13} />}
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
  /*
    İKON (2026-10-06, kullanıcı): "her teknolojinin KENDİ ikonu olsun
    (HTML, CSS, JavaScript, C#, Python, SQL…); ikon bulunamazsa genel kod
    ikonu." Önce burada her şey için aynı `LinkIcon` vardı.
    `techIcon` etiketten çözer; bulamazsa aşağıdaki genel ikona düşer.
  */
  const icon = isCommand ? (
    <TerminalIcon size={14} />
  ) : (
    (techIcon(item.label)
      ?? (href ? <LinkIcon size={14} /> : <CodeIcon size={14} />))
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
