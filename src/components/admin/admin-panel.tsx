'use client'

import type { ReactNode } from 'react'
import type {
  BlogPost,
  InterestItem,
  ProjectItem,
  SiteContent,
  SocialItem,
  ToolboxItem,
} from '@/lib/content'
import type { GitHubRepo } from '@/lib/github'
import { Icon } from '@iconify/react'
import { Tabs } from '@lobehub/ui/base-ui'
import { useRouter } from 'next/navigation'
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { AboutPageEditor } from '@/components/admin/about-page-editor'
import { DataManager } from '@/components/admin/data-manager'
import { GitHubReposAdmin } from '@/components/admin/github-repos-admin'
import { HeroLogoField } from '@/components/admin/hero-logo-field'
import { OverviewPanel } from '@/components/admin/overview-panel'
import { PageTextEditor } from '@/components/admin/page-text-editor'
import { PanelCard } from '@/components/admin/panel-card'
import { ProfilePhotoUploader } from '@/components/admin/profile-photo-uploader'
import { SaveBar } from '@/components/admin/save-bar'
import { ScrollableTabs } from '@/components/admin/scrollable-tabs'
import { SectionsEditor } from '@/components/admin/sections-editor'
import { TabLabel } from '@/components/admin/tab-label'
import { UsersPanel } from '@/components/admin/users-panel'
import { Modal } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { SearchableCombobox } from '@/components/ui/searchable-combobox'
import { SectionTitle } from '@/components/ui/section'
import { Textarea } from '@/components/ui/textarea'
import { aboutPageErrors, normalizeAboutPage } from '@/lib/about-page'
import { clientFetchUserRepos } from '@/lib/github-client'
import { PAGE_SPECS } from '@/lib/page-text-specs'
import { scrollToElement } from '@/lib/scroll'
import { SECTION_SPECS } from '@/lib/section-fields'

type SaveStatus = { type: 'success' | 'error', text: string } | null

export function AdminPanel({
  initialContent,
  initialBlogPosts,
  username,
  roleLabel,
}: {
  initialContent: SiteContent
  initialBlogPosts?: BlogPost[]
  username: string
  /** Locale'e göre çevrilmiş rol adı (permissions.roleLabel). */
  roleLabel?: string
}) {
  const router = useRouter()
  const [content, setContent] = useState<SiteContent>(initialContent)
  const [status, setStatus] = useState<SaveStatus>(null)
  const [saving, setSaving] = useState(false)
  const [blogModalOpen, setBlogModalOpen] = useState(false)
  /**
   * Kaydedilmemiş değişiklik takibi (2026-10-13, kullanıcı isteği): sekme
   * değiştirirken uyarabilsin diye son kaydedilen içerik saklanır.
   */
  const savedRef = useRef<SiteContent>(initialContent)
  const [dirty, setDirty] = useState(false)
  const [backgroundUploading, setBackgroundUploading] = useState(false)
  const backgroundFileRef = useRef<HTMLInputElement>(null)
  const [backgroundMode, setBackgroundMode] = useState<'upload' | 'link'>('upload')
  const [backgroundUrl, setBackgroundUrl] = useState('')
  const [githubRepos, setGithubRepos] = useState<GitHubRepo[]>([])
  // Sekme kontrollu: "Genel Bakis"taki tablo kartlari "Veri Yonetimi"
  // sekmesine ve ilgili tabloya atlayabilsin diye activeKey'i biz tutuyoruz.
  const HASH_TO_TAB: Record<string, string> = {
    '#overview': 'overview',
    '#profile': 'profile',
    '#pages': 'pages',
    '#password': 'password',
    '#settings': 'settings',
    '#data': 'data',
    '#people': 'people',
  }

  // Hash'ten başlangıç sekmesi: AdminGate async yükleme bittikten SONRA
  // AdminPanel mount edilir; o anda hash hâlâ okunaklı olur.
  // SSR'da window yok → 'overview' döner; useLayoutEffect mount'ta düzeltir.
  const [tab, setTab] = useState<string>(() => {
    if (typeof window === 'undefined')
      return 'overview'
    return HASH_TO_TAB[window.location.hash] ?? 'overview'
  })
  const [dataResource, setDataResource] = useState<string | undefined>(
    undefined,
  )
  const [tabSearch, setTabSearch] = useState('')
  const [pageEditSearch, setPageEditSearch] = useState('')
  const [dataSearch, setDataSearch] = useState('')
  /** Aktif "Sayfa Düzenle" iç-sekmesinin ID'si ve yolu (SaveBar'da Önizle butonu için). */
  const [activePageKey, setActivePageKey] = useState<string>('about')
  const [activePagePath, setActivePagePath] = useState<string>('/about')

  /** Sayfa ID'sinden previewPath'e eşleme (PAGE_SPECS'den). */
  const pagePathById = useMemo(() => {
    const map: Record<string, string> = {}
    for (const page of PAGE_SPECS) map[page.id] = page.path
    return map
  }, [])

  const setTabWithHash = (next: string) => {
    setTab(next)
    if (typeof window !== 'undefined')
      window.location.hash = next
  }

  // Mount'ta hash'i bir kez daha oku: strict-mode çift render veya
  // hydration'dan sonra hash'in değiştiği durumları yakalar.
  useLayoutEffect(() => {
    const hash = window.location.hash
    const fromHash = HASH_TO_TAB[hash]
    if (fromHash)
      setTab(fromHash)
  }, [])

  // 2026-10-08: Sekme seridinin kaydirma/gosterge isleri `ScrollableTabs`
  // icine tasindi (oklar + kenar solmasi + bölüm noktalari). Buradaki takma kod
  // (`scrollTabs`/`syncTabScroll`/`scrollIntoView`) kaldirildi: `scrollIntoView`
  // tum atasi — ve sayfayi — yatay kaydirdigi icin "son sekmelerde yana kayma"
  // belirtisinin kaynagiydi. Artik yalnizca sekme listesinin kendi kutusu kayar.

  useEffect(() => {
    const username = content.settings.githubUsername
    if (!username)
return
    clientFetchUserRepos(username)
      .then(setGithubRepos)
      .catch(() => setGithubRepos([]))
    // Load only on mount (repo count rarely changes)
  }, [])

  /**
   * GitHub kartındaki "Düzenle": proje formunun bulunduğu "Sayfa Düzenle"
   * sekmesine geçer ve ilgili karta kaydırır (2026-10-20). Kart ayrı bir
   * bileşen (GitHubReposAdmin) olduğu için olay üzerinden haberleşiyoruz.
   */
  useEffect(() => {
    const onEditProject = (e: Event) => {
      const index = (e as CustomEvent<{ index: number }>).detail?.index
      if (typeof index !== 'number')
        return
      setTabWithHash('pages')
      // Sekme paneli çizildikten sonra elemanın DOM'da olmasını bekle.
      requestAnimationFrame(() => {
        scrollToElement(document.getElementById(`admin-project-${index}`))
      })
    }
    window.addEventListener('admin:edit-project', onEditProject)
    return () => window.removeEventListener('admin:edit-project', onEditProject)
  }, [])

  /**
   * Kaydedilmemiş değişiklik var mı? `content` her değiştiğinde son kaydedilen
   * anlık görüntüyle karşılaştırılır (küçük nesne; JSON karşılaştırması yeter).
   */
  useEffect(() => {
    setDirty(JSON.stringify(content) !== JSON.stringify(savedRef.current))
  }, [content])

  const uploadBackground = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) {
      return
    }
    setBackgroundUploading(true)
    setStatus(null)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch('/api/admin/background', {
        method: 'POST',
        body: fd,
      })
      const data = await res.json()
      if (res.ok && data.success) {
        setContent(prev => ({
          ...prev,
          settings: { ...prev.settings, backgroundImage: data.backgroundImage },
        }))
        setStatus({ type: 'success', text: data.message })
      }
 else {
        setStatus({
          type: 'error',
          text: data.message || 'Görsel yüklenemedi.',
        })
      }
    }
 catch {
      setStatus({ type: 'error', text: 'Bir hata oluştu.' })
    }
 finally {
      setBackgroundUploading(false)
    }
  }

  const removeBackground = async () => {
    setBackgroundUploading(true)
    setStatus(null)
    try {
      const res = await fetch('/api/admin/background', { method: 'DELETE' })
      const data = await res.json()
      if (res.ok) {
        setContent(prev => ({
          ...prev,
          settings: { ...prev.settings, backgroundImage: '' },
        }))
        setStatus({ type: 'success', text: data.message })
      }
 else {
        setStatus({ type: 'error', text: data.message || 'Kaldırılamadı.' })
      }
    }
 catch {
      setStatus({ type: 'error', text: 'Bir hata oluştu.' })
    }
 finally {
      setBackgroundUploading(false)
    }
  }

  /**
   * Link (URL) yöntemiyle arka plan görselini ayarlar. Dosya yüklemesine
   * gerek kalmadan doğrudan bir resim URL si atanir; kaydetme SaveBar ile
   * diske/ Supabase e yazilir.
   */
  const applyBackgroundUrl = () => {
    const url = backgroundUrl.trim()
    if (!url)
return
    setContent(prev => ({
      ...prev,
      settings: { ...prev.settings, backgroundImage: url },
    }))
    setBackgroundUrl('')
    setBackgroundMode('upload')
  }

  /**
   * @param override Kaydedilecek içerik. Verilmezse paneldeki `content`
   *   state'i kullanılır. Fotoğraf yüklemesi gibi state güncellemesinden
   *   HEMEN SONRA kaydetmek gereken akışlar bunu verir: `setContent` asenkron
   *   olduğu için state'i okuyup göndermek eski içeriği yollardı.
   */
  const save = async (override?: SiteContent) => {
    setSaving(true)
    setStatus(null)
    const payload = override ?? content
    /*
     * Hakkımda içeriği kaydetmeden ÖNCE doğrulanır (2026-10-17): çift anahtar
     * veya boş başlık varsa istek hiç gönderilmez — sunucu da aynı kuralları
     * uygular (bkz. /api/admin/content), bu yalnızca hızlı geri bildirim.
     */
    const aboutHatalar = aboutPageErrors(
      normalizeAboutPage(payload.aboutPage),
    )
    if (aboutHatalar.length > 0) {
      setSaving(false)
      setStatus({
        type: 'error',
        text: `Hakkımda sayfası kaydedilemedi: ${aboutHatalar[0]}`,
      })
      return
    }
    try {
      const res = await fetch('/api/admin/content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (res.ok) {
        // Kaydedilen hali "temiz" kabul edilir; sekme değişiminde uyarı vermez.
        savedRef.current = payload
        setDirty(false)
        setStatus({
          type: 'success',
          text: 'Kaydedildi! Siteyi yenileyerek değişiklikleri görebilirsin.',
        })
      }
 else {
        setStatus({ type: 'error', text: data.message || 'Kaydedilemedi.' })
      }
    }
 catch {
      setStatus({ type: 'error', text: 'Bir hata oluştu.' })
    }
 finally {
      setSaving(false)
    }
  }

  const logout = async () => {
    await fetch('/api/admin/logout', { method: 'POST' })
    router.refresh()
  }

  const setHero = (field: keyof SiteContent['hero'], value: string) => {
    setContent(prev => ({ ...prev, hero: { ...prev.hero, [field]: value } }))
  }
  // setHeroI18n KALDIRILDI (2026-10-21): hero dil combobox'ları panelden
  // çıkarıldı; `hero.i18n` sözlüğü veri olarak korunur ama panelden her dil
  // için ayrı metin girilmez.
  const setNav = (field: keyof SiteContent['nav'], value: string) => {
    setContent(prev => ({ ...prev, nav: { ...prev.nav, [field]: value } }))
  }
  const setAbout = (field: keyof SiteContent['about'], value: string) => {
    setContent(prev => ({
      ...prev,
      about: { ...prev.about, [field]: value },
    }))
  }
  const setProjectsMeta = (
    field: 'subtitle' | 'title' | 'description',
    value: string,
  ) => {
    setContent(prev => ({
      ...prev,
      projects: { ...prev.projects, [field]: value },
    }))
  }
  const setContact = (field: keyof SiteContent['contact'], value: string) => {
    setContent(prev => ({
      ...prev,
      contact: { ...prev.contact, [field]: value },
    }))
  }
  const setFooter = (field: keyof SiteContent['footer'], value: string) => {
    setContent(prev => ({
      ...prev,
      footer: { ...prev.footer, [field]: value },
    }))
  }
  const setSettings = (field: keyof SiteContent['settings'], value: string) => {
    setContent(prev => ({
      ...prev,
      settings: { ...prev.settings, [field]: value },
    }))
  }
  const setGithub = (field: keyof SiteContent['github'], value: string) => {
    setContent(prev => ({
      ...prev,
      github: { ...prev.github, [field]: value },
    }))
  }
  const setChat = (field: keyof SiteContent['chat'], value: string) => {
    setContent(prev => ({ ...prev, chat: { ...prev.chat, [field]: value } }))
  }
  const setProfile = (field: keyof SiteContent['profile'], value: string) => {
    setContent(prev => ({
      ...prev,
      profile: { ...prev.profile, [field]: value },
    }))
  }

  const setNavItem = (
    index: number,
    field: keyof SiteContent['nav']['items'][number],
    value: string,
  ) => {
    setContent((prev) => {
      const items = prev.nav.items.map((item, i) =>
        i === index ? { ...item, [field]: value } : item,
      )
      return { ...prev, nav: { ...prev.nav, items } }
    })
  }

  const addNavItem = () => {
    setContent(prev => ({
      ...prev,
      nav: { ...prev.nav, items: [...prev.nav.items, { title: '', href: '' }] },
    }))
  }

  const removeNavItem = (index: number) => {
    setContent(prev => ({
      ...prev,
      nav: { ...prev.nav, items: prev.nav.items.filter((_, i) => i !== index) },
    }))
  }

  const setInterest = (
    index: number,
    field: keyof InterestItem,
    value: string,
  ) => {
    setContent((prev) => {
      const interests = prev.about.interests.map((item, i) =>
        i === index ? { ...item, [field]: value } : item,
      )
      return { ...prev, about: { ...prev.about, interests } }
    })
  }

  const addInterest = () => {
    setContent(prev => ({
      ...prev,
      about: {
        ...prev.about,
        interests: [
          ...prev.about.interests,
          { label: '', icon: 'mdi:star', content: '' },
        ],
      },
    }))
  }

  const removeInterest = (index: number) => {
    setContent(prev => ({
      ...prev,
      about: {
        ...prev.about,
        interests: prev.about.interests.filter((_, i) => i !== index),
      },
    }))
  }

  const setSecurityTool = (
    index: number,
    field: keyof ToolboxItem,
    value: string,
  ) => {
    setContent((prev) => {
      const securityTools = prev.about.securityTools.map((item, i) =>
        i === index ? { ...item, [field]: value } : item,
      )
      return { ...prev, about: { ...prev.about, securityTools } }
    })
  }

  const addSecurityTool = () => {
    setContent(prev => ({
      ...prev,
      about: {
        ...prev.about,
        securityTools: [
          ...prev.about.securityTools,
          { label: '', type: 'link', href: '' },
        ],
      },
    }))
  }

  const removeSecurityTool = (index: number) => {
    setContent(prev => ({
      ...prev,
      about: {
        ...prev.about,
        securityTools: prev.about.securityTools.filter((_, i) => i !== index),
      },
    }))
  }

  const setProject = (
    index: number,
    field: keyof ProjectItem,
    value: string,
  ) => {
    setContent((prev) => {
      const items = prev.projects.items.map((item, i) =>
        i === index ? { ...item, [field]: value } : item,
      )
      return { ...prev, projects: { ...prev.projects, items } }
    })
  }

  const setProjectDownloadMode = (index: number, mode: 'global' | 'per-os') => {
    setContent((prev) => {
      const items = prev.projects.items.map((item, i) => {
        if (i !== index)
return item
        if (mode === 'global') {
          const { downloads: _drop, ...rest } = item
          return { ...rest, downloadMode: 'global' as const }
        }
        return {
          ...item,
          downloadMode: 'per-os' as const,
          downloads: item.downloads ?? {},
        }
      })
      return { ...prev, projects: { ...prev.projects, items } }
    })
  }

  const setProjectDownloadOs = (
    index: number,
    os: 'windows' | 'macos' | 'linux' | 'ios' | 'android',
    value: string,
  ) => {
    setContent((prev) => {
      const items = prev.projects.items.map((item, i) => {
        if (i !== index)
return item
        const downloads = { ...(item.downloads ?? {}), [os]: value }
        return { ...item, downloads }
      })
      return { ...prev, projects: { ...prev.projects, items } }
    })
  }

  const addProject = () => {
    setContent(prev => ({
      ...prev,
      projects: {
        ...prev.projects,
        items: [
          ...prev.projects.items,
          {
            title: '',
            notice: '',
            description: '',
            projectLink: '',
            srcLink: '',
            image: '',
          },
        ],
      },
    }))
  }

  const removeProject = (index: number) => {
    setContent(prev => ({
      ...prev,
      projects: {
        ...prev.projects,
        items: prev.projects.items.filter((_, i) => i !== index),
      },
    }))
  }

  const setSocial = (index: number, field: keyof SocialItem, value: string) => {
    setContent((prev) => {
      const social = prev.social.map((item, i) =>
        i === index ? { ...item, [field]: value } : item,
      )
      return { ...prev, social }
    })
  }

  const addSocial = () => {
    setContent(prev => ({
      ...prev,
      social: [...prev.social, { name: '', href: '', icon: 'mdi:github' }],
    }))
  }

  const removeSocial = (index: number) => {
    setContent(prev => ({
      ...prev,
      social: prev.social.filter((_, i) => i !== index),
    }))
  }

  /** Eski "overview" sekmesinin gövdesi — artık bir grubun alt bölümü. */
  const overviewPane = (
    <OverviewPanel
      onNavigate={(key) => {
        // Genel Bakış'taki tablo kartları "Veri Yönetimi" sekmesine atlar
        // (2026-10-20: sekme 'content'ten 'data'ya taşındı).
        setDataResource(key)
        setTab('data')
      }}
    />
  )

  /** Eski "profile" sekmesinin gövdesi — artık bir grubun alt bölümü. */
  const profilePane = (
    <div className="space-y-4 pt-4">
      <ProfilePhotoUploader
        profileImage={content.profile.profileImage}
        originalImage={content.profile.originalImage ?? ''}
        displayName={content.profile.displayName}
        onUploaded={(image, original) => {
          const next = {
            ...content,
            profile: {
              ...content.profile,
              profileImage: image,
              originalImage: original,
            },
          }
          setContent(next)
          void save(next)
        }}
        onStatus={setStatus}
      />
      <PanelCard title="Profil Bilgileri">
        <Grid>
          <Field label="Ad (First Name)">
            <Input
              variant="faded"
              value={content.profile.firstName}
              onValueChange={value => setProfile('firstName', value)}
            />
          </Field>
          <Field label="Soyad (Last Name)">
            <Input
              variant="faded"
              value={content.profile.lastName}
              onValueChange={value => setProfile('lastName', value)}
            />
          </Field>
          <Field label="Görünen Ad (örn. TARIKELER)">
            <Input
              variant="faded"
              value={content.profile.displayName}
              onValueChange={value => setProfile('displayName', value)}
            />
          </Field>
          <Field label="Lakap / Takma Ad (örn. Tarnak)">
            <Input
              variant="faded"
              value={content.profile.nickname}
              onValueChange={value => setProfile('nickname', value)}
            />
          </Field>
          <Field label="Ünvan">
            <Input
              variant="faded"
              value={content.profile.title}
              onValueChange={value => setProfile('title', value)}
            />
          </Field>
        </Grid>
        <p className="mt-3 text-xs text-foreground-500">
          Bu bilgiler Chat üzerinde profil olarak görünür.
        </p>
      </PanelCard>
    </div>
  )

  /** Eski "general" sekmesinin gövdesi — artık bir grubun alt bölümü. */
  const generalPane = (
    <div className="space-y-4 pt-4">
      <PanelCard title="Hero (Ana Ekran)">
        <Grid>
          <Field label="İsim">
            <Input
              variant="faded"
              value={content.hero.name}
              onValueChange={value => setHero('name', value)}
            />
          </Field>
          <Field label="Logo (dosya yükle veya link)">
            <HeroLogoField
              value={content.hero.logo ?? ''}
              onChange={value => setHero('logo', value)}
              onStatus={setStatus}
            />
          </Field>
          {/*
            Alt Başlık / Proje Butonu / İletişim Butonu dil combobox'ları
            KALDIRILDI (2026-10-21, kullanıcı isteği: "şunları sil").
            Düz TR alanları (hero.tagline / exploreLabel / connectLabel) zaten
            hero'da düzenlenebiliyor; `hero.i18n` sözlüğü ise HÂLÂ çalışıyor
            (içerik korunur, başka dillerde varsa gösterilir) — yalnızca panelde
            dil başına metin girme arayüzü kaldırıldı.
          */}
        </Grid>
      </PanelCard>
      <PanelCard title="Menü (Navigation)">
        <Grid>
          <Field label="CTA Buton Yazısı (üst menü)">
            <Input
              variant="faded"
              value={content.nav.ctaLabel}
              onValueChange={value => setNav('ctaLabel', value)}
            />
          </Field>
          <Field label="CTA Link (örn. GitHub)">
            <Input
              variant="faded"
              value={content.nav.githubRepo}
              onValueChange={value => setNav('githubRepo', value)}
            />
          </Field>
        </Grid>
        <div className="mt-4 flex flex-col gap-3">
          {content.nav.items.map((item, index) => (
            <ItemCard
              key={index}
              title={`Menü Öğesi #${index + 1}`}
              onRemove={() => removeNavItem(index)}
            >
              <Grid>
                <Field label="Başlık">
                  <Input
                    variant="faded"
                    value={item.title}
                    onValueChange={value =>
                      setNavItem(index, 'title', value)}
                  />
                </Field>
                <Field label="Link (örn. /projects/)">
                  <Input
                    variant="faded"
                    value={item.href}
                    onValueChange={value =>
                      setNavItem(index, 'href', value)}
                  />
                </Field>
              </Grid>
            </ItemCard>
          ))}
          <AddButton onPress={addNavItem} label="Menü Öğesi Düzenle" />
        </div>
      </PanelCard>
      <PanelCard title="Arka Plan">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <div
              className="flex h-28 w-full sm:w-48 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-white/10"
              style={{
                backgroundColor: content.settings.backgroundImage
                  ? 'transparent'
                  : '#0d0d12',
                backgroundImage: content.settings.backgroundImage
                  ? `url(${content.settings.backgroundImage})`
                  : undefined,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
              }}
            >
              {!content.settings.backgroundImage && (
                <p className="text-xs text-foreground-500">
                  Görsel yok — düz tema
                </p>
              )}
            </div>
            <Field label="Görsel yöntemi">
              <SearchableCombobox
                multiple={false}
                options={[
                  { value: 'upload', label: 'Yükle (dosya)' },
                  { value: 'link', label: 'Link (URL)' },
                ]}
                selected={[backgroundMode]}
                onSelect={v => setBackgroundMode(v as 'upload' | 'link')}
                onClear={() => {}}
                placeholder="Yöntem seçin"
                searchPlaceholder="Ara..."
                ariaLabel="Arka plan görsel yöntemi"
              />
            </Field>
            <div className="flex flex-col items-center sm:items-start gap-3">
              {backgroundMode === 'upload'
                ? (
                <>
                  <input
                    ref={backgroundFileRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml"
                    className="hidden"
                    onChange={uploadBackground}
                  />
                  <div className="flex flex-row gap-2">
                    <Button
                      color="primary"
                      onPress={() => backgroundFileRef.current?.click()}
                      isLoading={backgroundUploading}
                      startContent={
                        <Icon icon="mdi:image-plus" width={18} height={18} />
                      }
                    >
                      Görsel Yükle
                    </Button>
                    {content.settings.backgroundImage && (
                      <Button
                        variant="bordered"
                        color="danger"
                        onPress={removeBackground}
                        isLoading={backgroundUploading}
                        startContent={(
                          <Icon
                            icon="mdi:trash-can-outline"
                            width={18}
                            height={18}
                          />
                        )}
                      >
                        Kaldır
                      </Button>
                    )}
                  </div>
                </>
                  )
                : (
                <>
                  <Input
                    placeholder="https://örnek.com/görsel.jpg"
                    value={backgroundUrl}
                    onValueChange={setBackgroundUrl}
                  />
                  <Button
                    color="primary"
                    onPress={applyBackgroundUrl}
                    isDisabled={!backgroundUrl.trim()}
                    startContent={<Icon icon="mdi:link" width={16} height={16} />}
                  >
                    Uygula
                  </Button>
                  {content.settings.backgroundImage && (
                    <Button
                      variant="bordered"
                      color="danger"
                      onPress={removeBackground}
                      isLoading={backgroundUploading}
                      startContent={(
                        <Icon
                          icon="mdi:trash-can-outline"
                          width={18}
                          height={18}
                        />
                      )}
                    >
                      Kaldır
                    </Button>
                  )}
                </>
                  )}
              <p className="text-xs text-foreground-500">
                Sitenin arka planına tam ekran görsel koyar (kaplama).
                Görsel yoksa düz siyah (koyu tema) / beyaz (açık tema)
                kullanılır. PNG, JPG, WEBP, GIF veya SVG — en fazla 8 MB.
              </p>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <Field label="Arka plan gösterim teması">
              <SearchableCombobox
                multiple={false}
                options={[
                  { value: 'all', label: 'Hepsi' },
                  { value: 'dark', label: 'Sadece koyu' },
                  { value: 'light', label: 'Sadece açık' },
                ]}
                selected={[content.settings.backgroundTheme ?? 'all']}
                onSelect={(v) => {
                  setContent(prev => ({
                    ...prev,
                    settings: { ...prev.settings, backgroundTheme: v as 'all' | 'dark' | 'light' },
                  }))
                }}
                onClear={() => {}}
                placeholder="Hepsi"
                searchPlaceholder="Ara..."
                ariaLabel="Arka plan gösterim teması"
              />
            </Field>
            <Field label="Arka plan gösterilecek sayfalar">
              <SearchableCombobox
                multiple
                options={[
                  { value: '/chat', label: '/chat' },
                  { value: '/about', label: '/about' },
                  { value: '/projects', label: '/projects' },
                  { value: '/blog', label: '/blog' },
                  { value: '/contact', label: '/contact' },
                  { value: '/admin', label: '/admin' },
                  { value: '/now', label: '/now' },
                ]}
                selected={content.settings.backgroundPages ?? []}
                onSelect={(v) => {
                  setContent((prev) => {
                    const current = prev.settings.backgroundPages ?? []
                    const exists = current.includes(v)
                    return {
                      ...prev,
                      settings: {
                        ...prev.settings,
                        backgroundPages: exists ? current.filter(x => x !== v) : [...current, v],
                      },
                    }
                  })
                }}
                onClear={() => {
                  setContent(prev => ({
                    ...prev,
                    settings: { ...prev.settings, backgroundPages: [] },
                  }))
                }}
                placeholder="Tüm sayfalar"
                searchPlaceholder="Ara..."
                ariaLabel="Arka plan gösterilecek sayfalar"
                showAllOption
                allLabel="Hepsi"
                badge={(content.settings.backgroundPages ?? []).length}
              />
            </Field>
          </div>
          <div className="flex flex-row flex-wrap items-center gap-x-4 gap-y-2 text-xs text-foreground-500">
            <span className="flex items-center gap-1.5">
              Varsayılan tema:
            </span>
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="radio"
                name="defaultTheme"
                checked={content.settings.defaultTheme === 'dark'}
                onChange={() => setSettings('defaultTheme', 'dark')}
              />
              Koyu (siyah)
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="radio"
                name="defaultTheme"
                checked={content.settings.defaultTheme === 'light'}
                onChange={() => setSettings('defaultTheme', 'light')}
              />
              Açık (beyaz)
            </label>
            <span className="w-full text-foreground-500">
              Ziyaretçi üst menüden istediği an koyu/açık arasında geçiş
              yapabilir; bu ayar ilk açılışta hangisinin gösterileceğini
              belirler.
            </span>
          </div>
        </div>
      </PanelCard>
    </div>
  )

  /** Eski "about" sekmesinin gövdesi — artık bir grubun alt bölümü. */
  const aboutPane = (
    <div className="space-y-4 pt-4">
      <PanelCard title="Bölüm Başlıkları">
        <Grid>
          <Field label="Alt Başlık">
            <Input
              variant="faded"
              value={content.about.subtitle}
              onValueChange={value => setAbout('subtitle', value)}
            />
          </Field>
          <Field label="Başlık">
            <Input
              variant="faded"
              value={content.about.title}
              onValueChange={value => setAbout('title', value)}
            />
          </Field>
          <Field label="Açıklama">
            <Input
              variant="faded"
              value={content.about.description}
              onValueChange={value => setAbout('description', value)}
            />
          </Field>
          <Field label="'Kimim Ben?' Başlığı">
            <Input
              variant="faded"
              value={content.about.whoTitle}
              onValueChange={value => setAbout('whoTitle', value)}
            />
          </Field>
          <Field label="'Kimim Ben?' Metni">
            <Textarea
              variant="faded"
              value={content.about.whoText}
              onValueChange={value => setAbout('whoText', value)}
              minRows={3}
            />
          </Field>
        </Grid>
      </PanelCard>
      <PanelCard title="Toolbox (Kullandığım Teknolojiler)">
        <div className="rounded-lg border border-foreground/10 bg-foreground/[0.03] p-3 text-xs text-foreground/60">
          <p>
            Sitedeki "Kullandığım Teknolojiler" şeridi artık
{' '}
<strong>Veri Yönetimi → Yetenekler</strong>
{' '}
tablosundan
            yönetiliyor (seviye, açıklama ve ikon otomatik algılama ile). Bu bölümdeki eski JSON editörü kaldırıldı.
</p>
        </div>
      </PanelCard>
      <PanelCard title="İlgi Alanları (Beyond the Code)">
        <Grid>
          <Field label="Başlık">
            <Input
              variant="faded"
              value={content.about.beyondTitle}
              onValueChange={value => setAbout('beyondTitle', value)}
            />
          </Field>
          <Field label="Açıklama">
            <Input
              variant="faded"
              value={content.about.beyondDescription}
              onValueChange={value =>
                setAbout('beyondDescription', value)}
            />
          </Field>
        </Grid>
        <div className="mt-4 flex flex-col gap-3">
          {content.about.interests.map((item, index) => (
            <ItemCard
              key={index}
              title={`İlgi Alanı #${index + 1}`}
              onRemove={() => removeInterest(index)}
            >
              <Grid>
                <Field label="İsim">
                  <Input
                    variant="faded"
                    value={item.label}
                    onValueChange={value =>
                      setInterest(index, 'label', value)}
                  />
                </Field>
                <Field label="İkon (iconify)">
                  <Input
                    variant="faded"
                    value={item.icon}
                    onValueChange={value =>
                      setInterest(index, 'icon', value)}
                  />
                </Field>
                <Field label="Açıklama">
                  <Input
                    variant="faded"
                    value={item.content}
                    onValueChange={value =>
                      setInterest(index, 'content', value)}
                  />
                </Field>
              </Grid>
            </ItemCard>
          ))}
          <AddButton onPress={addInterest} label="İlgi Alanı Düzenle" />
        </div>
      </PanelCard>
      <PanelCard title="Siber Güvenlik Bölümü">
        <Grid>
          <Field label="Başlık">
            <Input
              variant="faded"
              value={content.about.securityTitle}
              onValueChange={value => setAbout('securityTitle', value)}
            />
          </Field>
          <Field label="Metin">
            <Input
              variant="faded"
              value={content.about.securityText}
              onValueChange={value => setAbout('securityText', value)}
            />
          </Field>
        </Grid>
        <div className="mt-4 flex flex-col gap-3">
          {content.about.securityTools.map((item, index) => (
            <ItemCard
              key={index}
              title={`Araç #${index + 1}`}
              onRemove={() => removeSecurityTool(index)}
            >
              <Grid>
                <Field label="İsim">
                  <Input
                    variant="faded"
                    value={item.label}
                    onValueChange={value =>
                      setSecurityTool(index, 'label', value)}
                  />
                </Field>
                <Field label="Tip">
                  <select
                    value={item.type ?? 'link'}
                    onChange={e =>
                      setSecurityTool(index, 'type', e.target.value)}
                    className="h-10 w-full rounded-lg border border-foreground/20 bg-background px-3 text-sm text-foreground outline-none transition-colors focus:border-primary"
                  >
                    <option value="link">Link</option>
                    <option value="command">
                      Komut (SVG + tıklayınca kopyala)
                    </option>
                  </select>
                </Field>
                <Field
                  label={
                    item.type === 'command'
                      ? 'Komut (tıklanınca kopyalanır)'
                      : 'URL'
                  }
                >
                  <Input
                    variant="faded"
                    placeholder={
                      item.type === 'command'
                        ? 'örn. nmap -sV target'
                        : 'https://...'
                    }
                    value={item.href ?? ''}
                    onValueChange={value =>
                      setSecurityTool(index, 'href', value)}
                  />
                </Field>
              </Grid>
            </ItemCard>
          ))}
          <AddButton onPress={addSecurityTool} label="Araç Düzenle" />
        </div>
      </PanelCard>
      <PanelCard title="CV (Özgeçmiş)">
        <Field label="CV Dosya Yolu">
          <Input
            variant="faded"
            placeholder="/cv/tarikeler-cv.pdf"
            value={content.about.cv?.href ?? '/cv/tarikeler-cv.pdf'}
            onValueChange={value =>
              setAbout('cv', {
                ...(content.about.cv ?? {}),
                href: value,
              } as any)}
          />
        </Field>
        <Field label="CV Özeti (Summary)">
          <Textarea
            variant="faded"
            minRows={3}
            value={content.about.cv?.summary ?? ''}
            onValueChange={value =>
              setAbout('cv', {
                ...(content.about.cv ?? {}),
                summary: value,
              } as any)}
          />
        </Field>
        <p className="mt-3 text-xs text-foreground-500">
          CV PDF dosyasını
{' '}
<code>public/cv/tarikeler-cv.pdf</code>
          konumuna koy; yukarıdaki yolu bu dosyaya göre ayarla. Özgeçmiş
          verisi aşağıdan güncellenir.
        </p>
        <div className="mt-3 space-y-2">
          <h4 className="text-sm font-semibold">Deneyim</h4>
          {(content.about.cv?.experience ?? []).map((entry, index) => (
            <ItemCard
              key={index}
              title={`Deneyim #${index + 1}`}
              onRemove={() =>
                setAbout('cv', {
                  ...(content.about.cv ?? {}),
                  experience: (content.about.cv?.experience ?? []).filter(
                    (_, i) => i !== index,
                  ),
                } as any)}
            >
              <Grid>
                <Field label="Rol / Görev">
                  <Input
                    variant="faded"
                    value={entry.role}
                    onValueChange={value =>
                      setAbout('cv', {
                        ...(content.about.cv ?? {}),
                        experience: (
                          content.about.cv?.experience ?? []
                        ).map((e, i) =>
                          i === index ? { ...e, role: value } : e,
                        ),
                      } as any)}
                  />
                </Field>
                <Field label="Şirket">
                  <Input
                    variant="faded"
                    value={entry.company}
                    onValueChange={value =>
                      setAbout('cv', {
                        ...(content.about.cv ?? {}),
                        experience: (
                          content.about.cv?.experience ?? []
                        ).map((e, i) =>
                          i === index ? { ...e, company: value } : e,
                        ),
                      } as any)}
                  />
                </Field>
                <Field label="Dönem">
                  <Input
                    variant="faded"
                    value={entry.period}
                    onValueChange={value =>
                      setAbout('cv', {
                        ...(content.about.cv ?? {}),
                        experience: (
                          content.about.cv?.experience ?? []
                        ).map((e, i) =>
                          i === index ? { ...e, period: value } : e,
                        ),
                      } as any)}
                  />
                </Field>
                <Field label="Açıklama">
                  <Input
                    variant="faded"
                    value={entry.description}
                    onValueChange={value =>
                      setAbout('cv', {
                        ...(content.about.cv ?? {}),
                        experience: (
                          content.about.cv?.experience ?? []
                        ).map((e, i) =>
                          i === index ? { ...e, description: value } : e,
                        ),
                      } as any)}
                  />
                </Field>
              </Grid>
            </ItemCard>
          ))}
          <AddButton
            onPress={() =>
              setAbout('cv', {
                ...(content.about.cv ?? {}),
                experience: [
                  ...(content.about.cv?.experience ?? []),
                  { role: '', company: '', period: '', description: '' },
                ],
              } as any)}
            label="Deneyim Düzenle"
          />
        </div>
        <div className="mt-4 space-y-2">
          <h4 className="text-sm font-semibold">Eğitim</h4>
          {(content.about.cv?.education ?? []).map((entry, index) => (
            <ItemCard
              key={index}
              title={`Eğitim #${index + 1}`}
              onRemove={() =>
                setAbout('cv', {
                  ...(content.about.cv ?? {}),
                  education: (content.about.cv?.education ?? []).filter(
                    (_, i) => i !== index,
                  ),
                } as any)}
            >
              <Grid>
                <Field label="Rol / Bölüm">
                  <Input
                    variant="faded"
                    value={entry.role}
                    onValueChange={value =>
                      setAbout('cv', {
                        ...(content.about.cv ?? {}),
                        education: (content.about.cv?.education ?? []).map(
                          (e, i) =>
                            i === index ? { ...e, role: value } : e,
                        ),
                      } as any)}
                  />
                </Field>
                <Field label="Kurum">
                  <Input
                    variant="faded"
                    value={entry.company}
                    onValueChange={value =>
                      setAbout('cv', {
                        ...(content.about.cv ?? {}),
                        education: (content.about.cv?.education ?? []).map(
                          (e, i) =>
                            i === index ? { ...e, company: value } : e,
                        ),
                      } as any)}
                  />
                </Field>
                <Field label="Dönem">
                  <Input
                    variant="faded"
                    value={entry.period}
                    onValueChange={value =>
                      setAbout('cv', {
                        ...(content.about.cv ?? {}),
                        education: (content.about.cv?.education ?? []).map(
                          (e, i) =>
                            i === index ? { ...e, period: value } : e,
                        ),
                      } as any)}
                  />
                </Field>
                <Field label="Açıklama">
                  <Input
                    variant="faded"
                    value={entry.description}
                    onValueChange={value =>
                      setAbout('cv', {
                        ...(content.about.cv ?? {}),
                        education: (content.about.cv?.education ?? []).map(
                          (e, i) =>
                            i === index ? { ...e, description: value } : e,
                        ),
                      } as any)}
                  />
                </Field>
              </Grid>
            </ItemCard>
          ))}
          <AddButton
            onPress={() =>
              setAbout('cv', {
                ...(content.about.cv ?? {}),
                education: [
                  ...(content.about.cv?.education ?? []),
                  { role: '', company: '', period: '', description: '' },
                ],
              } as any)}
            label="Eğitim Düzenle"
          />
        </div>
      </PanelCard>
    </div>
  )

  /** Eski "social" sekmesinin gövdesi — artık bir grubun alt bölümü. */
  const socialPane = (
    <div className="space-y-4 pt-4">
      <PanelCard title="Sosyal Medya Linkleri">
        <div className="flex flex-col gap-3">
          {content.social.map((item, index) => (
            <ItemCard
              key={index}
              title={`${item.name || `Sosyal #${index + 1}`}`}
              onRemove={() => removeSocial(index)}
            >
              <Grid>
                <Field label="İsim">
                  <Input
                    variant="faded"
                    value={item.name}
                    onValueChange={value =>
                      setSocial(index, 'name', value)}
                  />
                </Field>
                <Field label="Link">
                  <Input
                    variant="faded"
                    value={item.href}
                    onValueChange={value =>
                      setSocial(index, 'href', value)}
                  />
                </Field>
                <Field label="Platform (SVG)">
                  <select
                    value={item.icon}
                    onChange={e =>
                      setSocial(index, 'icon', e.target.value)}
                    className="h-10 w-full rounded-lg border border-foreground/20 bg-background px-3 text-sm text-foreground outline-none transition-colors focus:border-primary"
                  >
                    <option value="mdi:github">GitHub</option>
                    <option value="mdi:twitter">X / Twitter</option>
                    <option value="mdi:instagram">Instagram</option>
                    <option value="mdi:youtube">YouTube</option>
                    <option value="ic:baseline-tiktok">TikTok</option>
                    <option value="mdi:discord">Discord</option>
                    <option value="mdi:linkedin">LinkedIn</option>
                    <option value="mdi:telegram">Telegram</option>
                    <option value="mdi:link">Link (jenerik)</option>
                  </select>
                </Field>
              </Grid>
            </ItemCard>
          ))}
          <AddButton onPress={addSocial} label="Sosyal Medya Düzenle" />
        </div>
      </PanelCard>
    </div>
  )

  /** Eski "projects" sekmesinin gövdesi — artık bir grubun alt bölümü. */
  const projectsPane = (
    <div className="space-y-4 pt-4">
      <PanelCard title="Bölüm Başlıkları">
        <Grid>
          <Field label="Alt Başlık">
            <Input
              variant="faded"
              value={content.projects.subtitle}
              onValueChange={value => setProjectsMeta('subtitle', value)}
            />
          </Field>
          <Field label="Başlık">
            <Input
              variant="faded"
              value={content.projects.title}
              onValueChange={value => setProjectsMeta('title', value)}
            />
          </Field>
          <Field label="Açıklama">
            <Input
              variant="faded"
              value={content.projects.description}
              onValueChange={value =>
                setProjectsMeta('description', value)}
            />
          </Field>
        </Grid>
      </PanelCard>
      <PanelCard title="Projeler">
        <div className="flex flex-col gap-3">
          {content.projects.items.map((item, index) => (
            <ItemCard
              key={index}
              id={`admin-project-${index}`}
              title={`${item.title || `Proje #${index + 1}`}`}
              onRemove={() => removeProject(index)}
            >
              <Grid>
                <Field label="Başlık">
                  <Input
                    variant="faded"
                    value={item.title}
                    onValueChange={value =>
                      setProject(index, 'title', value)}
                  />
                </Field>
                <Field label="Rozet (örn. [Under Development])">
                  <Input
                    variant="faded"
                    value={item.notice || ''}
                    onValueChange={value =>
                      setProject(index, 'notice', value)}
                  />
                </Field>
                <Field label="Açıklama">
                  <Textarea
                    variant="faded"
                    value={item.description}
                    onValueChange={value =>
                      setProject(index, 'description', value)}
                    minRows={2}
                  />
                </Field>
                <Field label="Proje Linki">
                  <Input
                    variant="faded"
                    value={item.projectLink}
                    onValueChange={value =>
                      setProject(index, 'projectLink', value)}
                  />
                </Field>
                <Field label="Kaynak Kod Linki (opsiyonel)">
                  <Input
                    variant="faded"
                    value={item.srcLink || ''}
                    onValueChange={value =>
                      setProject(index, 'srcLink', value)}
                  />
                </Field>
                <Field label="Görsel Yolu (örn. /projects/portfolyo.png)">
                  <Input
                    variant="faded"
                    value={item.image}
                    onValueChange={value =>
                      setProject(index, 'image', value)}
                  />
                </Field>
              </Grid>
              <div className="mt-4 flex flex-col gap-3 rounded-lg border border-foreground-200/10 p-3">
                <p className="text-xs font-semibold text-foreground">
                  İndirme (Download butonu)
                </p>
                <div className="flex flex-row flex-wrap items-center gap-3 text-xs text-foreground-500">
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name={`downloadMode-${index}`}
                      checked={(item.downloadMode ?? 'global') === 'global'}
                      onChange={() =>
                        setProjectDownloadMode(index, 'global')}
                    />
                    Global (tek link)
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name={`downloadMode-${index}`}
                      checked={item.downloadMode === 'per-os'}
                      onChange={() =>
                        setProjectDownloadMode(index, 'per-os')}
                    />
                    İşletim sistemine özel (Windows / macOS / Linux / iOS /
                    Android)
                  </label>
                </div>
                {(item.downloadMode ?? 'global') === 'global' ? (
                  <Field label="İndirme Linki / Dosya Yolu">
                    <Input
                      variant="faded"
                      placeholder="/downloads/app.zip veya https://..."
                      value={item.downloadUrl || ''}
                      onValueChange={value =>
                        setProject(index, 'downloadUrl', value)}
                    />
                  </Field>
                ) : (
                  <Grid>
                    <Field label="Windows">
                      <Input
                        variant="faded"
                        placeholder="/downloads/setup.exe"
                        value={item.downloads?.windows || ''}
                        onValueChange={value =>
                          setProjectDownloadOs(index, 'windows', value)}
                      />
                    </Field>
                    <Field label="macOS">
                      <Input
                        variant="faded"
                        placeholder="/downloads/app.dmg"
                        value={item.downloads?.macos || ''}
                        onValueChange={value =>
                          setProjectDownloadOs(index, 'macos', value)}
                      />
                    </Field>
                    <Field label="Linux">
                      <Input
                        variant="faded"
                        placeholder="/downloads/app.AppImage"
                        value={item.downloads?.linux || ''}
                        onValueChange={value =>
                          setProjectDownloadOs(index, 'linux', value)}
                      />
                    </Field>
                    <Field label="iOS">
                      <Input
                        variant="faded"
                        placeholder="https://apps.apple.com/..."
                        value={item.downloads?.ios || ''}
                        onValueChange={value =>
                          setProjectDownloadOs(index, 'ios', value)}
                      />
                    </Field>
                    <Field label="Android">
                      <Input
                        variant="faded"
                        placeholder="/downloads/app.apk"
                        value={item.downloads?.android || ''}
                        onValueChange={value =>
                          setProjectDownloadOs(index, 'android', value)}
                      />
                    </Field>
                  </Grid>
                )}
                <p className="text-xs text-foreground-500">
                  Boş bırakırsan Download butonu görünmez. Kullanıcının
                  işletim sistemi otomatik algılanır ve uygun link/dosya
                  açılır.
                </p>
              </div>
            </ItemCard>
          ))}
          <AddButton onPress={addProject} label="Yeni Proje Ekle" />
        </div>
      </PanelCard>

      <GitHubReposAdmin githubRepos={githubRepos} content={content} setContent={setContent} />
    </div>
  )

  /** Eski "blog" sekmesinin gövdesi — artık bir grubun alt bölümü. */
  const blogPane = (
    <BlogManager
      onStatus={setStatus}
      saving={saving}
      blogModalOpen={blogModalOpen}
      setBlogModalOpen={setBlogModalOpen}
      initialPosts={initialBlogPosts ?? []}
    />
  )

  /** Eski "phase6" sekmesinin gövdesi — artık bir grubun alt bölümü. */
  const sectionsPane = (
    <SectionsEditor
      specs={SECTION_SPECS}
      value={(content.phase6 ?? {}) as Record<string, unknown>}
      onChange={phase6 => setContent(prev => ({ ...prev, phase6 }))}
    />
  )

  /**
   * Sayfa bölümü metinleri (2026-10-20, kullanıcı isteği): "Sayfa Düzenle"
   * sekmesinde TÜM sayfa metinleri düzenlenebilsin diye bu kartlar "Site
   * Ayarları"ndan (generalPane) buraya taşındı — Ayarlar artık gerçekten
   * ayar (hero/menü/tema/sosyal/güvenlik) tutar.
   */
  const pageSectionsPane = (
    <div className="space-y-4">
      <PanelCard title="GitHub Bölümü">
        <Grid>
          <Field label="Alt Başlık">
            <Input
              variant="faded"
              value={content.github.subtitle}
              onValueChange={value => setGithub('subtitle', value)}
            />
          </Field>
          <Field label="Başlık">
            <Input
              variant="faded"
              value={content.github.title}
              onValueChange={value => setGithub('title', value)}
            />
          </Field>
          <Field label="Açıklama">
            <Input
              variant="faded"
              value={content.github.description}
              onValueChange={value => setGithub('description', value)}
            />
          </Field>
          <Field label="GitHub Kullanıcı Adı (projeler otomatik çekilir)">
            <Input
              variant="faded"
              value={content.settings.githubUsername}
              onValueChange={value =>
                setSettings('githubUsername', value)}
            />
          </Field>
        </Grid>
        <p className="mt-3 text-xs text-foreground-500">
          Kullanıcı adı (örn.
{' '}
<span className="font-mono">TARIKTR1099</span>
          ) yazarsan sitendeki "GitHub Projects" bölümü bu hesabın public
          repolarını gösterir. Boş bırakırsan bölüm gizlenir.
        </p>
      </PanelCard>
      <PanelCard title="Chat Bölümü">
        <Grid>
          <Field label="Alt Başlık">
            <Input
              variant="faded"
              value={content.chat.subtitle}
              onValueChange={value => setChat('subtitle', value)}
            />
          </Field>
          <Field label="Başlık">
            <Input
              variant="faded"
              value={content.chat.title}
              onValueChange={value => setChat('title', value)}
            />
          </Field>
          <Field label="Açıklama">
            <Input
              variant="faded"
              value={content.chat.description}
              onValueChange={value => setChat('description', value)}
            />
          </Field>
        </Grid>
      </PanelCard>
      <PanelCard title="İletişim Bölümü">
        <Grid>
          <Field label="Başlık">
            <Input
              variant="faded"
              value={content.contact.title}
              onValueChange={value => setContact('title', value)}
            />
          </Field>
          <Field label="Alt Başlık">
            <Input
              variant="faded"
              value={content.contact.subtitle}
              onValueChange={value => setContact('subtitle', value)}
            />
          </Field>
          <Field label="Açıklama">
            <Input
              variant="faded"
              value={content.contact.description}
              onValueChange={value => setContact('description', value)}
            />
          </Field>
          <Field label="Buton Altı Yazısı">
            <Input
              variant="faded"
              value={content.contact.footerText}
              onValueChange={value => setContact('footerText', value)}
            />
          </Field>
          <Field label="Başarı Başlığı">
            <Input
              variant="faded"
              value={content.contact.successTitle}
              onValueChange={value => setContact('successTitle', value)}
            />
          </Field>
          <Field label="Başarı Metni">
            <Input
              variant="faded"
              value={content.contact.successText}
              onValueChange={value => setContact('successText', value)}
            />
          </Field>
        </Grid>
      </PanelCard>
      <PanelCard title="Footer">
        <Field label="Telif Hakkı İsmi">
          <Input
            variant="faded"
            value={content.footer.copyright}
            onValueChange={value => setFooter('copyright', value)}
          />
        </Field>
      </PanelCard>
    </div>
  )

  /**
   * "Sayfa Düzenle" sekmesinin gövdesi — İÇ SEKMELİ (2026-10-21, kullanıcı:
   * "Veri Yönetimi gibi alt gruplar açılsın, PROJELER/BLOG şeklinde olsun").
   *
   * NEDEN İÇ SEKME: dört alt bölüm alt alta dizilince sayfa çok uzuyordu ve
   * hepsinin aynı anda yüklenmesi GEREKMİYORDU. `DataManager`'daki desen
   * (ScrollableTabs + Tabs + TabLabel) burada da kullanılıyor — panelde tek
   * bir sekme dili kalır, ikinci bir navigasyon icat edilmez.
   */
  const pagesPane = (
    <div className="space-y-3">
      <div className="pt-2">
        <Input
          variant="faded"
          value={pageEditSearch}
          onValueChange={setPageEditSearch}
          placeholder="Sayfa ara (Ana Sayfa, Hakkımda, Blog...)"
          aria-label="Sayfa düzenle arama"
          className="w-full max-w-sm"
        />
      </div>
      <PageEditTabs
        initial="about"
        onActiveChange={key => {
          setActivePageKey(key)
          setActivePagePath(pagePathById[key] ?? '')
        }}
        items={[
          ...PAGE_SPECS.filter(page => {
            if (!pageEditSearch.trim()) return true
            const q = pageEditSearch.toLowerCase().trim()
            return page.label.toLowerCase().includes(q) || page.id.toLowerCase().includes(q)
          }).map((page) => {
          const extra
            = page.id === 'about'
              ? aboutPane
              : page.id === 'projects'
                ? projectsPane
                : page.id === 'blog'
                  ? blogPane
                  : null
          const title = page.label.toLocaleUpperCase('tr')
          return {
            key: page.id,
            label: title,
            icon: page.icon,
            node: (
              <PanelCard title={title}>
                <div className="space-y-4">
                  <PageTextEditor
                    content={content}
                    pageId={page.id}
                    groups={page.groups}
                    previewPath={page.path}
                    onChange={setContent}
                  />
                  {extra && (
                    <div className="space-y-4 border-t border-surface-border pt-4">
                      {extra}
                    </div>
                  )}
                </div>
              </PanelCard>
            ),
          }
        }),
        {
          key: 'sections',
          label: 'SAYFA BÖLÜMLERİ',
          icon: 'mdi:page-layout-body',
          node: (
            <PanelCard title="SAYFA BÖLÜMLERİ">
              <div className="space-y-4">{pageSectionsPane}</div>
            </PanelCard>
          ),
        },
        {
          key: 'extras',
          label: 'EK BÖLÜMLER',
          icon: 'mdi:view-timeline-outline',
          node: (
            <PanelCard title="EK BÖLÜMLER">
              <div className="space-y-4">{sectionsPane}</div>
            </PanelCard>
          ),
        },
      ]}
    />
    </div>
  )

  /** "Veri Yönetimi" sekmesinin gövdesi — tablo CRUD (2026-10-20). */
  const dataPane = (
    <div className="space-y-3 pt-2">
      <Input
        variant="faded"
        value={dataSearch}
        onValueChange={setDataSearch}
        placeholder="Tablo ara (Blog Yazıları, Projeler, Yetenekler...)"
        aria-label="Veri yönetimi arama"
        className="w-full max-w-sm"
      />
      <DataManager key={`${dataResource ?? 'all'}:${dataSearch}`} initialResource={dataResource} />
    </div>
  )

  /** "Site Ayarları" sekmesinin Şifre & Güvenlik alt bölümü. */
  const securityPane = (
    <div className="space-y-4 pt-4">
      <p className="text-sm text-foreground-500">
        Hesabını korumak için şifreni düzenle, oturum bilgilerini gözden geçir ve
        güvenlik önerilerini takip et.
      </p>
      <PasswordCard />
      <SessionInfoCard username={username} roleLabel={roleLabel} />
      <SecurityTipsCard />
    </div>
  )

  /** Kullanıcı yönetimi — "Kullanıcılar" sekmesinin içeriği. */
  const usersPane = (
    <div className="space-y-4 pt-4">
      <UsersPanel />
    </div>
  )

  const tabItems = [
    {
      key: 'overview',
      label: <TabLabel icon="mdi:view-dashboard-outline" text="Genel Bakış" />,
      children: (
        <div className="min-w-0 space-y-8">
        <SubSection title="Genel Bakış" icon="mdi:view-dashboard-outline">
          {overviewPane}
        </SubSection>
        </div>
      ),
    },
    {
      key: 'profile',
      label: <TabLabel icon="mdi:account-circle" text="Profil" />,
      children: (
        <div className="min-w-0 space-y-8">
        <SubSection title="Profil" icon="mdi:account-circle">
          {profilePane}
        </SubSection>
        </div>
      ),
    },
    {
      key: 'pages',
      label: <TabLabel icon="mdi:file-document-edit-outline" text="Sayfa Düzenle" />,
      children: (
        <div className="min-w-0 space-y-8">
        <SubSection title="Sayfa Düzenle" icon="mdi:file-document-edit-outline">
          {pagesPane}
        </SubSection>
        </div>
      ),
    },
    {
      key: 'password',
      label: <TabLabel icon="mdi:shield-lock-outline" text="Şifre & Güvenlik" />,
      children: (
        <div className="min-w-0 space-y-8">
        <SubSection title="Şifre & Güvenlik" icon="mdi:shield-lock-outline">
          {securityPane}
        </SubSection>
        </div>
      ),
    },
    {
      key: 'settings',
      label: <TabLabel icon="mdi:cog-outline" text="Site Ayarları" />,
      children: (
        <div className="min-w-0 space-y-8">
        <SubSection title="Genel" icon="mdi:settings-outline">
          {generalPane}
        </SubSection>
        <SubSection title="Sosyal Medya" icon="mdi:share-variant-outline">
          {socialPane}
        </SubSection>
        </div>
      ),
    },
    {
      key: 'data',
      label: <TabLabel icon="mdi:table-cog-outline" text="Veri Yönetimi" />,
      children: (
        <div className="min-w-0 space-y-8">
        <SubSection title="Veri Yönetimi (Tablolar)" icon="mdi:table-cog-outline">
          {dataPane}
        </SubSection>
        </div>
      ),
    },
    {
      key: 'people',
      label: <TabLabel icon="mdi:account-group-outline" text="Kullanıcılar" />,
      children: (
        <div className="min-w-0 space-y-8">
        <SubSection title="Kullanıcı Yönetimi" icon="mdi:account-multiple-outline">
          {usersPane}
        </SubSection>
        </div>
      ),
    },
  ]

  /**
   * Sekme araması için genişletilmiş eşleme.
   * Her üst sekme kendi adlarına + içindeki sayfa/tablo etiketlerine eşlenir.
   * Arama "blog" → Sayfa Düzenle, "yetenekler" → Veri Yönetimi gibi çalışır.
   */
  const TAB_SEARCH_TERMS: Record<string, string[]> = {
    overview: ['Genel Bakış', 'Özet', 'Durum'],
    profile: ['Profil', 'Profil Bilgileri', 'Fotoğraf'],
    pages: [
      'Sayfa Düzenle',
      // PAGE_SPECS sayfa etiketleri
      'Ana Sayfa', 'Hakkımda', 'Projeler', 'Blog', 'Sohbet', 'İletişim',
      'Destek', 'Şu An', 'Katkıda Bulunanlar', 'Gizlilik Politikası',
      'KVKK', 'GitHub', 'Sayfa Bölümleri', 'Ek Bölümler',
      // Sayfa Düzenle içindeki AboutPageEditor
      'Hakkımda Sayfası', '/about',
    ],
    password: ['Şifre', 'Güvenlik', 'Şifre Değiştir', 'Oturum'],
    settings: ['Site Ayarları', 'Hero', 'Menü', 'Arka Plan', 'Sosyal Medya', 'Tema'],
    data: [
      'Veri Yönetimi',
      // ResourceDef etiketleri (resources.ts)
      'Blog Yazıları', 'Projeler', 'Yetenekler', 'İstatistikler',
      'Mesajlar', 'Reklamlar', 'Bildiğim Diller', 'CV Belgeleri',
    ],
    people: ['Kullanıcılar', 'Kullanıcı Yönetimi'],
  }

  /** Arama yazıldığında sadece eşleşen sekmeler görünür. */
  const filteredTabItems = useMemo(() => {
    if (!tabSearch.trim()) return tabItems
    const q = tabSearch.toLowerCase().trim()
    return tabItems.filter((item) => {
      const terms = TAB_SEARCH_TERMS[item.key] ?? [item.key]
      return terms.some(t => t.toLowerCase().includes(q))
    })
  }, [tabItems, tabSearch])

  return (
    <div className="mx-auto w-full min-w-0 max-w-4xl">
      <SectionTitle
        big
        headingLevel="h1"
        title="Admin Paneli"
        subTitle="ADMİN PANELİ"
        description=""
        icon={<Icon icon="mdi:shield-account" width={36} height={36} />}
        tightGap
      />
      <div className="mt-2 mb-6 flex min-w-0 flex-col items-center justify-between gap-3">
        <div className="min-w-0 flex justify-center">
          {/* Kimlik bloğu (2026-10-13, kullanıcı isteği): "giriş yapan" + yetki
              ayrı satırlar yerine TEK gruplu kutuda; rol rozet olarak.
              2026-10-23: ortalı — kullanıcı "Giriş yapan ... kısmı ortalanmış olsun". */}
          <div className="inline-flex flex-wrap items-center justify-center gap-x-3 gap-y-1 rounded-lg border border-surface-border bg-surface-1 px-3 py-1.5 text-sm text-foreground-500">
            <span>
              Giriş yapan:
              {' '}
              <span className="font-semibold text-foreground">{username}</span>
            </span>
            {roleLabel && (
              <span className="inline-flex items-center gap-1.5">
                Yetki:
                <span className="rounded-full bg-primary/15 px-2 py-0.5 text-xs font-semibold text-primary">
                  {roleLabel}
                </span>
              </span>
            )}
          </div>
        </div>
        <div className="flex min-w-0 flex-row flex-wrap justify-center gap-2">
          {/* 2026-10-07 (kullanıcı): "Sayfa Düzenleyici" ve `/admin/puck`
              TAMAMEN kaldırıldı. Görsel sayfa düzenleyici (Puck) kullanılmıyor;
              içerik artık içerik dosyası + admin formları üzerinden yönetiliyor.
              Bu düğme kaldırılınca `router` de bu blokta kullanılmaz oldu. */}
          <Button
            as="a"
            href="/"
            color="primary"
            variant="solid"
            startContent={<Icon icon="mdi:eye" width={18} height={18} />}
          >
            Siteyi Görüntüle
          </Button>
          <Button
            onPress={logout}
            color="danger"
            variant="solid"
            startContent={<Icon icon="mdi:logout" width={18} height={18} />}
          >
            Çıkış
          </Button>
        </div>
      </div>
      {/* İçerik kabı: SADECE dikey kaydırma. Yatayda `clip` kullanılıyor —
          `overflow-x-hidden` bir kaydırma KONTEYNERİ yaratıyor ve `scrollIntoView`
          sayfayı yatay kaydırabiliyordu; `clip` kırpmayı korur, kaydırma yaratmaz.
          Taşan tablolar kendi `overflow-x-auto` kutusunda kaymaya devam eder. */}
      <div className="w-full min-w-0 overflow-y-auto overflow-x-clip">
        {/* Sekme şeridi: yatay kaydırma yalnızca SEKME LİSTESİNİN kendi
            içinde olur; oklar/noktalar gerektiğinde görünür. */}
        {/* Sekme arama filtresi: yazıldığında eşleşmeyen sekmeler gizlenir. */}
        <div className="w-full min-w-0 mb-2">
          <Input
            variant="faded"
            value={tabSearch}
            onValueChange={setTabSearch}
            placeholder="Sekme ara (Genel Bakış, Profil, Sayfa Düzenle…)"
            aria-label="Sekme arama filtresi"
            className="w-full max-w-md"
          />
        </div>
        <ScrollableTabs activeTabKey={tab}>
          <Tabs
            size="large"
            className="w-full min-w-0"
            classNames={{
              // `max-w-full` şart: Lobehub listeye `align-self: flex-start`
              // veriyor, o yüzden kutu içeriğinin genişliğine (max-content)
              // büyüyor ve TAŞIP sayfayı yatay kaydırıyordu. Tavan + kendi
              // `overflow-x-auto`'su ile taşma dışarı değil, kutunun içinde kalır.
              list: 'max-w-full overflow-x-auto overscroll-x-contain [&::-webkit-scrollbar]:hidden [scrollbar-width:none]',
              panel: 'min-w-0',
            }}
            activeKey={tab}
            onChange={(k) => {
              const next = String(k)
              // Kaydedilmemiş değişiklik varken sekme değiştirme onayı ister
              // (2026-10-13, kullanıcı isteği). Onaylanmazsa sekme değişmez.
              if (
                next !== tab
                && dirty
                && !window.confirm(
                  'Kaydedilmemiş değişiklikler var. Yine de sekme değiştirilsin mi?',
                )
              ) {
                return
              }
              setTabWithHash(next)
            }}
            items={filteredTabItems}
          />
        </ScrollableTabs>
        <div className="mt-6 flex min-w-0 flex-col items-center gap-3">
          {status && (
            <div
              className={`w-full text-sm font-medium rounded-lg p-3 flex items-center gap-2 ${
                status.type === 'success'
                  ? 'text-success bg-success-50 border border-success-200'
                  : 'text-danger bg-danger-50 border border-danger-200'
              }`}
            >
              <Icon
                icon={
                  status.type === 'success'
                    ? 'material-symbols:check-circle'
                    : 'material-symbols:error'
                }
                width={16}
                height={16}
              />
              {status.text}
            </div>
          )}
        </div>
        {/* Sabit kaydetme çubuğu (2026-10-20, kullanıcı isteği): Kaydet +
            İptal Et + bilgi, alt kısımda `position: fixed`, değişiklik yoksa
            gizli. */}
        {/* Sabit kaydetme çubuğu (2026-10-20, kullanıcı isteği): Kaydet +
            İptal Et + bilgi, alt kısımda `position: fixed`, değişiklik yoksa
            gizli. */}
        <SaveBar
          dirty={dirty}
          busy={saving}
          onSave={() => save()}
          onCancel={() => {
            setContent(savedRef.current)
            setStatus(null)
          }}
          info="Kaydedildi! Siteyi yenileyerek değişiklikleri görebilirsin."
          onPreview={async () => {
            if (tab !== 'pages') {
              const p = activePagePath || pagePathById['about'] || '/'
              window.open(p, '_blank', 'noopener,noreferrer')
              return
            }
            try {
              setStatus(null)
              const pageId = activePageKey || 'about'
              const res = await fetch('/api/admin/preview', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ content, pageId }),
              })
              if (!res.ok) {
                const err = await res.json().catch(() => ({}))
                throw new Error(err?.message || 'Önizleme alınamadı')
              }
              const html = await res.text()
              const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
              const url = URL.createObjectURL(blob)
              window.open(url, '_blank', 'noopener,noreferrer')
              setTimeout(() => URL.revokeObjectURL(url), 180000)
              setStatus({ type: 'success', text: 'Önizleme yeni sekmede açıldı (kaydedilmemiş değişikliklerle).' })
            }
            catch (e: any) {
              setStatus({ type: 'error', text: e?.message || 'Önizleme hatası' })
            }
          }}
        />
      </div>
    </div>
  )
}

/**
 * Birleştirilmiş sekme içindeki alt bölüm başlığı.
 *
 * Sekme sayısı 11 → 5'e indirildi (2026-10-13); her eski sekme artık bir
 * alt bölüm. Başlık, sayfa başlıklarıyla aynı dil: ikon + mavi metin + çizgi.
 */
function SubSection({
  title,
  icon,
  children,
}: {
  title: string
  icon: string
  children: ReactNode
}) {
  return (
    <section className="min-w-0">
      <h2 className="flex items-center gap-2 border-b-2 border-primary pb-2 text-sm font-bold uppercase tracking-wide text-primary">
        <Icon icon={icon} width={18} height={18} />
        {title}
      </h2>
      <div className="pt-4">{children}</div>
    </section>
  )
}

/**
 * "Sayfa Düzenle" iç listesi (2026-10-30).
 *
 * ÖNCE (2026-10-21): 5 sabit alt sekme (HAKKIMDA / PROJELER / BLOG / SAYFA
 * BÖLÜMLERİ / EK BÖLÜMLER). Kullanıcı isteği: "Sayfa Düzenle'de bütün sayfalar
 * bölümler ayrı ayrı olmalı … istisnasız, yanında da göz olsun".
 *
 * ŞİMDİ: liste ÇAĞIRANDAN gelir (`items`) — 12 sayfa + SAYFA BÖLÜMLERİ +
 * EK BÖLÜMLER + DİLLER. Sekme şeridi panelin dış şeridiyle AYNI bileşenden
 * (`ScrollableTabs`) gelir; taşma davranışı tek yerde kalır.
 */
function PageEditTabs({
  items,
  initial,
  onActiveChange,
}: {
  items: { key: string, label: string, icon: string, node: ReactNode }[]
  initial: string
  onActiveChange?: (key: string) => void
}) {
  const [inner, setInner] = useState(initial)

  // Aktif iç-sekme anahtarını dışarıya bildir (SaveBar'da Önizle butonu için).
  useEffect(() => {
    onActiveChange?.(inner)
  }, [inner, onActiveChange])

  return (
    <div className="min-w-0 pt-4">
      <ScrollableTabs activeTabKey={inner}>
        <Tabs
          size="large"
          className="w-full min-w-0"
          classNames={{
            list: 'max-w-full overflow-x-auto overscroll-x-contain [&::-webkit-scrollbar]:hidden [scrollbar-width:none]',
            panel: 'min-w-0',
          }}
          activeKey={inner}
          onChange={key => setInner(String(key))}
          items={items.map(i => ({
            key: i.key,
            label: <TabLabel icon={i.icon} text={i.label} />,
            // İç sekme geçişinde yumuşak beliriş (2026-10-21, kullanıcı:
            // "animasyonlandırılsın"). `key` sekme değişince animasyonu
            // yeniden oynatır; `prefers-reduced-motion` globals.css'te
            // animasyonu nötrler.
            children: (
              <div key={i.key} className="admin-pane-in min-w-0">
                {i.node}
              </div>
            ),
          }))}
        />
      </ScrollableTabs>
    </div>
  )
}

function Grid({ children }: { children: ReactNode }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
      {children}
    </div>
  )
}

function Field({ label, children }: { label: string, children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs sm:text-sm text-foreground-500">{label}</label>
      {children}
    </div>
  )
}

function ItemCard({
  title,
  id,
  children,
  onRemove,
}: {
  title: string
  id?: string
  children: ReactNode
  onRemove: () => void
}) {
  return (
    <Card id={id} className="p-3 sm:p-4 bg-background">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm font-semibold">{title}</p>
        <Button
          size="sm"
          variant="light"
          color="danger"
          isIconOnly
          onPress={onRemove}
          aria-label="Sil"
        >
          <Icon icon="mdi:trash-can-outline" width={18} height={18} />
        </Button>
      </div>
      <div className="flex flex-col gap-3 sm:gap-4">{children}</div>
    </Card>
  )
}

function AddButton({ onPress, label }: { onPress: () => void, label: string }) {
  return (
    <Button
      variant="bordered"
      onPress={onPress}
      startContent={<Icon icon="mdi:plus" width={18} height={18} />}
      className="w-full"
    >
      {label}
    </Button>
  )
}

function PasswordCard() {
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [status, setStatus] = useState<SaveStatus>(null)
  const [loading, setLoading] = useState(false)

  const submit = async () => {
    setLoading(true)
    setStatus(null)
    try {
      const res = await fetch('/api/admin/password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      })
      const data = await res.json()
      if (res.ok) {
        setStatus({ type: 'success', text: 'Şifre güncellendi.' })
        setCurrentPassword('')
        setNewPassword('')
      }
 else {
        setStatus({
          type: 'error',
          text: data.message || 'Şifre güncellenemedi.',
        })
      }
    }
 catch {
      setStatus({ type: 'error', text: 'Bir hata oluştu.' })
    }
 finally {
      setLoading(false)
    }
  }

  return (
    <PanelCard title="Şifre Değiştir">
      <div className="flex flex-col gap-4">
        <Field label="Mevcut Şifre">
          <Input
            type="password"
            variant="faded"
            value={currentPassword}
            onValueChange={setCurrentPassword}
          />
        </Field>
        <Field label="Yeni Şifre">
          <Input
            type="password"
            variant="faded"
            value={newPassword}
            onValueChange={setNewPassword}
          />
        </Field>
        {status && (
          <div
            className={`text-sm font-medium rounded-lg p-3 flex items-center gap-2 ${
              status.type === 'success'
                ? 'text-success bg-success-50 border border-success-200'
                : 'text-danger bg-danger-50 border border-danger-200'
            }`}
          >
            <Icon
              icon={
                status.type === 'success'
                  ? 'material-symbols:check-circle'
                  : 'material-symbols:error'
              }
              width={16}
              height={16}
            />
            {status.text}
          </div>
        )}
        <Button
          color="primary"
          className="w-full sm:w-auto font-semibold"
          onPress={submit}
          isLoading={loading}
          isDisabled={loading || !currentPassword || !newPassword}
        >
          Şifreyi Güncelle
        </Button>
      </div>
    </PanelCard>
  )
}

/** Oturum bilgisi kartı — giriş yapan kullanıcı ve rolünü gösterir. */
function SessionInfoCard({ username, roleLabel }: { username: string, roleLabel?: string }) {
  return (
    <PanelCard title="Oturum Bilgisi">
      <div className="flex flex-col gap-3 text-sm">
        <div className="flex items-center justify-between gap-2">
          <span className="text-foreground-500">Kullanıcı</span>
          <span className="font-semibold text-foreground">{username}</span>
        </div>
        <div className="flex items-center justify-between gap-2">
          <span className="text-foreground-500">Rol</span>
          <span className="font-semibold text-foreground">{roleLabel ?? 'admin'}</span>
        </div>
        <div className="flex items-center justify-between gap-2">
          <span className="text-foreground-500">Oturum Süresi</span>
          <span className="font-semibold text-foreground">7 gün</span>
        </div>
        <p className="text-xs text-foreground-500 mt-1">
          Oturum cookie ile 7 gün boyunca geçerlidir. Süre dolunca yeniden giriş yapman gerekir.
        </p>
      </div>
    </PanelCard>
  )
}

/** Güvenlik ipuçları kartı — hesabı korumak için öneriler. */
function SecurityTipsCard() {
  const tips = [
    'Şifren en az 8 karakter, harf + rakam + sembol içersin.',
    'Şifreni kimseyle paylaşma, tarayıcıya kaydetme.',
    'Şüpheli giriş bildirimi alırsan şifreni hemen değiştir.',
    'Google OAuth kullanıyorsan 2FA\'yı etkin tut.',
  ]
  return (
    <PanelCard title="Güvenlik İpuçları">
      <ul className="flex flex-col gap-2 text-sm text-foreground-500">
        {tips.map((tip, i) => (
          <li key={i} className="flex items-start gap-2">
            <Icon
              icon="mdi:shield-check-outline"
              width={16}
              height={16}
              className="shrink-0 mt-0.5 text-primary"
            />
            <span>{tip}</span>
          </li>
        ))}
      </ul>
    </PanelCard>
  )
}

interface BlogManagerProps {
  onStatus: (s: SaveStatus) => void
  saving: boolean
  blogModalOpen: boolean
  setBlogModalOpen: React.Dispatch<React.SetStateAction<boolean>>
}

/**
 * Blog yazıları CRUD — /api/admin/blog (upsert + delete) üzerinden çalışır.
 * Yazılar data/blog/posts.json'a yazılır; statik export'ta build zamanında dahil olur.
 */
function BlogManager({
  initialPosts,
  onStatus,
  blogModalOpen,
  setBlogModalOpen,
}: BlogManagerProps & { initialPosts: BlogPost[] }) {
  const [posts, setPosts] = useState<any[]>(initialPosts)
  const [editing, setEditing] = useState<any | null>(null)
  const savePost = async () => {
    if (!editing?.title?.trim() || !editing?.slug?.trim())
return
    onStatus(null)
    const res = await fetch('/api/admin/blog', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'upsert', post: editing }),
    })
    const json = await res.json().catch(() => ({}))
    if (!res.ok) {
      onStatus({ type: 'error', text: json?.message || 'Kaydedilemedi' })
      return
    }
    onStatus({ type: 'success', text: 'Yazı kaydedildi' })
    setPosts(prev => [
      ...prev.filter((p: any) => p.id !== editing.id),
      { ...editing },
    ])
    setEditing(null)
    setBlogModalOpen(false)
  }

  const removePost = async (post: any) => {
    if (!window.confirm(`"${post.title}" silinsin mi?`))
return
    const res = await fetch('/api/admin/blog', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'delete', id: post.id }),
    })
    if (!res.ok) {
      onStatus({ type: 'error', text: 'Silinemedi' })
      return
    }
    onStatus({ type: 'success', text: 'Yazı silindi' })
    setPosts(prev => prev.filter((p: any) => p.id !== post.id))
    if (editing?.id === post.id) {
      setEditing(null)
      setBlogModalOpen(false)
    }
  }

  const toSlug = (s: string) =>
    s
      .toLocaleLowerCase('tr')
      .replace(/[^a-z0-9ığüşöç\s-]/g, '')
      .trim()
      .replace(/\s+/g, '-')

  const emptyPost = () => ({
    id: `post-${Date.now()}`,
    title: '',
    slug: '',
    date: new Date().toISOString().slice(0, 10),
    excerpt: '',
    content: '',
    badge: '',
    tags: [] as string[],
  })

  return (
    <div className="space-y-4 pt-4">
      <div className="flex flex-row items-center justify-between">
        <p className="text-sm text-foreground-500">
{posts.length}
{' '}
yazı
</p>
        {!blogModalOpen && (
          <Button
            size="sm"
            color="primary"
            variant="bordered"
            onPress={() => {
              setEditing(emptyPost())
              setBlogModalOpen(true)
            }}
          >
            + Yeni Yazı
          </Button>
        )}
      </div>

      <Modal
        open={blogModalOpen}
        onClose={() => {
          setEditing(null)
          setBlogModalOpen(false)
        }}
        title={
          editing && posts.some((p: any) => p.id === editing.id)
            ? 'Yazıyı Düzenle'
            : 'Yeni Yazı'
        }
        maxWidth="max-w-lg"
      >
        {/* editing null iken Modal open=false olmalı; yine de guard koy */}
        {editing && (
        <div className="space-y-3">
          <Grid>
            <Field label="Başlık *">
              <Input
                variant="faded"
                placeholder="Yazı başlığı"
                value={editing.title || ''}
                onValueChange={(v) => {
                  const next = { ...editing, title: v }
                  if (!editing.slug)
                    next.slug = toSlug(v)
                  setEditing(next)
                }}
              />
            </Field>
            <Field label="Slug (URL) *">
              <Input
                variant="faded"
                placeholder="yazi-url"
                value={editing.slug || ''}
                onValueChange={v =>
                  setEditing({ ...editing, slug: toSlug(v) || v })}
              />
            </Field>
            <Field label="Tarih">
              <Input
                variant="faded"
                type="date"
                value={editing.date || ''}
                onValueChange={v => setEditing({ ...editing, date: v })}
              />
            </Field>
            <Field label="Rozet (opsiyonel)">
              <Input
                variant="faded"
                placeholder="Yeni"
                value={editing.badge || ''}
                onValueChange={v => setEditing({ ...editing, badge: v })}
              />
            </Field>
          </Grid>
          <Field label="Özet (excerpt)">
            <Textarea
              variant="faded"
              minRows={2}
              placeholder="Listede görünen kısa özet"
              value={editing.excerpt || ''}
              onValueChange={v => setEditing({ ...editing, excerpt: v })}
            />
          </Field>
          <Field label="İçerik (markdown destekli)">
            <Textarea
              variant="faded"
              minRows={10}
              placeholder="Yazı içeriği…"
              value={editing.content || ''}
              onValueChange={v => setEditing({ ...editing, content: v })}
            />
          </Field>
          <div className="flex justify-end gap-2 pt-3 border-t border-surface-border">
            <Button
              variant="bordered"
              size="sm"
              onPress={() => {
                setEditing(null)
                setBlogModalOpen(false)
              }}
            >
              Vazgeç
            </Button>
            <Button
              color="primary"
              size="sm"
              onPress={savePost}
              isDisabled={!editing.title?.trim() || !editing.slug?.trim()}
            >
              Kaydet
            </Button>
          </div>
        </div>
        )}
      </Modal>

      {!editing && (
        <div className="flex flex-col gap-2">
          {posts.length === 0 && (
            <p className="text-sm text-foreground-500">
              Henüz yazı yok. "Yeni Yazı" ile başla.
            </p>
          )}
          {posts.map((post: any) => (
            <div
              key={post.id}
              className="flex flex-row items-center gap-3 rounded-lg border border-foreground-200/10 bg-background px-3 py-2.5"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">
                  {post.title}
                </p>
                <p className="truncate text-xs text-foreground-500">
                  {post.date}
{' '}
· /blog/
{post.slug}
                </p>
              </div>
              <Button
                size="sm"
                variant="light"
                onPress={() => {
                  setEditing({ ...post })
                  setBlogModalOpen(true)
                }}
              >
                Düzenle
              </Button>
              <Button
                size="sm"
                color="danger"
                variant="light"
                onPress={() => removePost(post)}
              >
                Sil
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
