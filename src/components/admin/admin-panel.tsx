'use client'

import type { ReactNode } from 'react'
import type {
  BlogPost,
  ChatMessage,
  InterestItem,
  ProjectItem,
  SiteContent,
  SocialItem,
  ToolboxItem,
} from '@/lib/content'
import type { GitHubRepo } from '@/lib/github'
import { Icon } from '@iconify/react'
import { Tabs } from '@lobehub/ui/base-ui'
import { Divider } from 'antd'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { ChatPanel } from '@/components/admin/chat-panel'

import { UsersPanel } from '@/components/admin/users-panel'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { clientFetchUserRepos } from '@/lib/github-client'

type SaveStatus = { type: 'success' | 'error', text: string } | null

export function AdminPanel({
  initialContent,
  initialMessages,
  initialBlogPosts,
  username,
}: {
  initialContent: SiteContent
  initialMessages: ChatMessage[]
  initialBlogPosts?: BlogPost[]
  username: string
}) {
  const router = useRouter()
  const [content, setContent] = useState<SiteContent>(initialContent)
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages)
  const [status, setStatus] = useState<SaveStatus>(null)
  const [saving, setSaving] = useState(false)
  const [backgroundUploading, setBackgroundUploading] = useState(false)
  const backgroundFileRef = useRef<HTMLInputElement>(null)
  const [githubRepos, setGithubRepos] = useState<GitHubRepo[]>([])

  useEffect(() => {
    const username = content.settings.githubUsername
    if (!username)
      return
    clientFetchUserRepos(username)
      .then(setGithubRepos)
      .catch(() => setGithubRepos([]))
    // Load only on mount (repo count rarely changes)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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

  const save = async () => {
    setSaving(true)
    setStatus(null)
    try {
      const res = await fetch('/api/admin/content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(content),
      })
      const data = await res.json()
      if (res.ok) {
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

const clearMessages = async () => {
    setSaving(true)
    try {
      for (const message of messages) {
        await fetch(`/api/chat?id=${encodeURIComponent(message.id)}`, {
          method: 'DELETE',
        })
      }
      setMessages([])
      setStatus({ type: 'success', text: 'Tüm mesajlar silindi.' })
    }
    catch {
      setStatus({ type: 'error', text: 'Bir hata oluştu.' })
    }
    finally {
      setSaving(false)
    }
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

  const setToolbox = (
    index: number,
    field: keyof ToolboxItem,
    value: string,
  ) => {
    setContent((prev) => {
      const toolbox = prev.about.toolbox.map((item, i) =>
        i === index ? { ...item, [field]: value } : item,
      )
      return { ...prev, about: { ...prev.about, toolbox } }
    })
  }

  const addToolbox = () => {
    setContent(prev => ({
      ...prev,
      about: {
        ...prev.about,
        toolbox: [...prev.about.toolbox, { label: '', type: 'link', href: '' }],
      },
    }))
  }

  const removeToolbox = (index: number) => {
    setContent(prev => ({
      ...prev,
      about: {
        ...prev.about,
        toolbox: prev.about.toolbox.filter((_, i) => i !== index),
      },
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

  const addGithubRepo = (repo: GitHubRepo) => {
    setContent((prev) => {
      if (prev.projects.items.some(p => p.title === repo.name))
        return prev
      const [owner, repoName] = repo.fullName.split('/')
      const item: ProjectItem = {
        title: repo.name,
        notice: '',
        description: repo.description ?? '',
        projectLink: `/github/${owner}/${repoName}`,
        srcLink: repo.url,
        image: '',
        stars: repo.stars,
        forks: repo.forks,
        updatedAt: repo.updatedAt,
        tags: repo.topics ?? [],
      }
      return {
        ...prev,
        projects: { ...prev.projects, items: [item, ...prev.projects.items] },
      }
    })
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

  return (
    <div className="mx-auto w-full max-w-4xl">
      <div className="mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Admin Paneli</h1>
          <p className="text-sm text-foreground-500">
            Giriş yapan:
            {' '}
            <span className="font-semibold text-foreground">{username}</span>
          </p>
        </div>
        <div className="flex flex-row gap-2">
          <Button
            onPress={() => router.push('/admin/puck')}
            variant="bordered"
            startContent={<Icon icon="mdi:vector-square" width={18} height={18} />}
          >
            Sayfa Düzenleyici
          </Button>
          <Button
            as="a"
            href="/"
            variant="light"
            startContent={<Icon icon="mdi:eye" width={18} height={18} />}
          >
            Siteyi Görüntüle
          </Button>
          <Button
            onPress={logout}
            variant="bordered"
            color="danger"
            startContent={<Icon icon="mdi:logout" width={18} height={18} />}
          >
            Çıkış
          </Button>
        </div>
      </div>
      <div className="w-full overflow-x-auto">
        <Tabs
          size="large"
          className="w-full min-w-max"
          items={[
            {
              key: 'profile',
              label: (
                <span className="inline-flex items-center gap-1.5">
                  <Icon icon="mdi:account-circle" width={15} height={15} />
                  Profil
                </span>
              ),
              children: (
                <div className="space-y-4 pt-4">
                  <ProfilePhotoCard
                    profileImage={content.profile.profileImage}
                    displayName={content.profile.displayName}
                    onUploaded={image => setProfile('profileImage', image)}
                    onStatus={setStatus}
                  />
                  <PanelCard title="Profil Bilgileri">
                    <Grid>
                      <Field label="Ad (First Name)">
                        <Input
                          variant="faded"
                          value={content.profile.firstName}
                          onValueChange={value =>
                            setProfile('firstName', value)}
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
                          onValueChange={value =>
                            setProfile('displayName', value)}
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
              ),
            },
            {
              key: 'general',
              label: (
                <span className="inline-flex items-center gap-1.5">
                  <Icon icon="mdi:cog-outline" width={15} height={15} />
                  Genel
                </span>
              ),
              children: (
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
                      <Field label="Emoji / Logo">
                        <Input
                          variant="faded"
                          value={content.hero.emoji}
                          onValueChange={value => setHero('emoji', value)}
                        />
                      </Field>
                      <Field label="Alt Başlık (Tagline)">
                        <Input
                          variant="faded"
                          value={content.hero.tagline}
                          onValueChange={value => setHero('tagline', value)}
                        />
                      </Field>
                      <Field label="Proje Butonu Yazısı">
                        <Input
                          variant="faded"
                          value={content.hero.exploreLabel}
                          onValueChange={value =>
                            setHero('exploreLabel', value)}
                        />
                      </Field>
                      <Field label="İletişim Butonu Yazısı">
                        <Input
                          variant="faded"
                          value={content.hero.connectLabel}
                          onValueChange={value =>
                            setHero('connectLabel', value)}
                        />
                      </Field>
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
                            <Field label="Link (örn. /#projects)">
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
                      <AddButton onPress={addNavItem} label="Menü Öğesi Ekle" />
                    </div>
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
                          onValueChange={value =>
                            setContact('description', value)}
                        />
                      </Field>
                      <Field label="Buton Altı Yazısı">
                        <Input
                          variant="faded"
                          value={content.contact.footerText}
                          onValueChange={value =>
                            setContact('footerText', value)}
                        />
                      </Field>
                      <Field label="Başarı Başlığı">
                        <Input
                          variant="faded"
                          value={content.contact.successTitle}
                          onValueChange={value =>
                            setContact('successTitle', value)}
                        />
                      </Field>
                      <Field label="Başarı Metni">
                        <Input
                          variant="faded"
                          value={content.contact.successText}
                          onValueChange={value =>
                            setContact('successText', value)}
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
                          onValueChange={value =>
                            setGithub('description', value)}
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
                      ) yazarsan
                      sitendeki "GitHub Projects" bölümü bu hesabın public
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
                        <div className="flex flex-col items-center sm:items-start gap-3">
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
                              startContent={(
                                <Icon
                                  icon="mdi:image-plus"
                                  width={18}
                                  height={18}
                                />
                              )}
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
                          <p className="text-xs text-foreground-500">
                            Sitenin arka planına tam ekran görsel koyar (kaplama).
                            Görsel yoksa düz siyah (koyu tema) / beyaz (açık tema)
                            kullanılır. PNG, JPG, WEBP, GIF veya SVG — en fazla 8
                            MB.
                          </p>
                        </div>
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
                          Ziyaretçi üst menüden istediği an koyu/açık arasında
                          geçiş yapabilir; bu ayar ilk açılışta hangisinin
                          gösterileceğini belirler.
                        </span>
                      </div>
                    </div>
                  </PanelCard>
                </div>
              ),
            },
            {
              key: 'about',
              label: (
                <span className="inline-flex items-center gap-1.5">
                  <Icon icon="mdi:information-outline" width={15} height={15} />
                  Hakkımda
                </span>
              ),
              children: (
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
                          onValueChange={value =>
                            setAbout('description', value)}
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
                    <Grid>
                      <Field label="Başlık">
                        <Input
                          variant="faded"
                          value={content.about.toolboxTitle}
                          onValueChange={value =>
                            setAbout('toolboxTitle', value)}
                        />
                      </Field>
                      <Field label="Açıklama">
                        <Input
                          variant="faded"
                          value={content.about.toolboxDescription}
                          onValueChange={value =>
                            setAbout('toolboxDescription', value)}
                        />
                      </Field>
                    </Grid>
                    <div className="mt-4 flex flex-col gap-3">
                      {content.about.toolbox.map((item, index) => (
                        <ItemCard
                          key={index}
                          title={`Teknoloji #${index + 1}`}
                          onRemove={() => removeToolbox(index)}
                        >
                          <Grid>
                            <Field label="İsim">
                              <Input
                                variant="faded"
                                value={item.label}
                                onValueChange={value =>
                                  setToolbox(index, 'label', value)}
                              />
                            </Field>
                            <Field label="Tip">
                              <select
                                value={item.type ?? 'link'}
                                onChange={e =>
                                  setToolbox(index, 'type', e.target.value)}
                                className="h-10 w-full rounded-lg border border-[#3F3F46] bg-background px-3 text-sm text-foreground outline-none focus:border-primary"
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
                                    ? 'örn. npx create-next-app@latest'
                                    : 'https://...'
                                }
                                value={item.href ?? ''}
                                onValueChange={value =>
                                  setToolbox(index, 'href', value)}
                              />
                            </Field>
                          </Grid>
                        </ItemCard>
                      ))}
                      <AddButton onPress={addToolbox} label="Teknoloji Ekle" />
                    </div>
                  </PanelCard>
                  <PanelCard title="İlgi Alanları (Beyond the Code)">
                    <Grid>
                      <Field label="Başlık">
                        <Input
                          variant="faded"
                          value={content.about.beyondTitle}
                          onValueChange={value =>
                            setAbout('beyondTitle', value)}
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
                      <AddButton onPress={addInterest} label="İlgi Alanı Ekle" />
                    </div>
                  </PanelCard>
                  <PanelCard title="Siber Güvenlik Bölümü">
                    <Grid>
                      <Field label="Başlık">
                        <Input
                          variant="faded"
                          value={content.about.securityTitle}
                          onValueChange={value =>
                            setAbout('securityTitle', value)}
                        />
                      </Field>
                      <Field label="Metin">
                        <Input
                          variant="faded"
                          value={content.about.securityText}
                          onValueChange={value =>
                            setAbout('securityText', value)}
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
                                className="h-10 w-full rounded-lg border border-[#3F3F46] bg-background px-3 text-sm text-foreground outline-none focus:border-primary"
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
                      <AddButton onPress={addSecurityTool} label="Araç Ekle" />
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
                      CV PDF dosyasını <code>public/cv/tarikeler-cv.pdf</code>
                      konumuna koy; yukarıdaki yolu bu dosyaya göre ayarla.
                      Özgeçmiş verisi aşağıdan güncellenir.
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
                                    experience: (content.about.cv?.experience ?? []).map(
                                      (e, i) => (i === index ? { ...e, role: value } : e),
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
                                    experience: (content.about.cv?.experience ?? []).map(
                                      (e, i) => (i === index ? { ...e, company: value } : e),
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
                                    experience: (content.about.cv?.experience ?? []).map(
                                      (e, i) => (i === index ? { ...e, period: value } : e),
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
                                    experience: (content.about.cv?.experience ?? []).map(
                                      (e, i) => (i === index ? { ...e, description: value } : e),
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
                        label="Deneyim Ekle"
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
                                      (e, i) => (i === index ? { ...e, role: value } : e),
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
                                      (e, i) => (i === index ? { ...e, company: value } : e),
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
                                      (e, i) => (i === index ? { ...e, period: value } : e),
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
                                      (e, i) => (i === index ? { ...e, description: value } : e),
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
                        label="Eğitim Ekle"
                      />
                    </div>
                  </PanelCard>
                </div>
              ),
            },
            {
              key: 'social',
              label: (
                <span className="inline-flex items-center gap-1.5">
                  <Icon icon="mdi:share-variant-outline" width={15} height={15} />
                  Sosyal Medya
                </span>
              ),
              children: (
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
                                className="h-10 w-full rounded-lg border border-[#3F3F46] bg-background px-3 text-sm text-foreground outline-none focus:border-primary"
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
                      <AddButton onPress={addSocial} label="Sosyal Medya Ekle" />
                    </div>
                  </PanelCard>
                </div>
              ),
            },
            {
              key: 'projects',
              label: (
                <span className="inline-flex items-center gap-1.5">
                  <Icon icon="mdi:folder-outline" width={15} height={15} />
                  Projeler
                </span>
              ),
              children: (
                <div className="space-y-4 pt-4">
                  <PanelCard title="Bölüm Başlıkları">
                    <Grid>
                      <Field label="Alt Başlık">
                        <Input
                          variant="faded"
                          value={content.projects.subtitle}
                          onValueChange={value =>
                            setProjectsMeta('subtitle', value)}
                        />
                      </Field>
                      <Field label="Başlık">
                        <Input
                          variant="faded"
                          value={content.projects.title}
                          onValueChange={value =>
                            setProjectsMeta('title', value)}
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
                                  checked={
                                    (item.downloadMode ?? 'global') === 'global'
                                  }
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
                                İşletim sistemine özel (Windows / macOS / Linux / iOS / Android)
                              </label>
                            </div>
                            {(item.downloadMode ?? 'global') === 'global'
                              ? (
                                  <Field label="İndirme Linki / Dosya Yolu">
                                    <Input
                                      variant="faded"
                                      placeholder="/downloads/app.zip veya https://..."
                                      value={item.downloadUrl || ''}
                                      onValueChange={value =>
                                        setProject(index, 'downloadUrl', value)}
                                    />
                                  </Field>
                                )
                              : (
                                  <Grid>
                                    <Field label="Windows">
                                      <Input
                                        variant="faded"
                                        placeholder="/downloads/setup.exe"
                                        value={item.downloads?.windows || ''}
                                        onValueChange={value =>
                                          setProjectDownloadOs(
                                            index,
                                            'windows',
                                            value,
                                          )}
                                      />
                                    </Field>
                                    <Field label="macOS">
                                      <Input
                                        variant="faded"
                                        placeholder="/downloads/app.dmg"
                                        value={item.downloads?.macos || ''}
                                        onValueChange={value =>
                                          setProjectDownloadOs(
                                            index,
                                            'macos',
                                            value,
                                          )}
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
                                          setProjectDownloadOs(
                                            index,
                                            'android',
                                            value,
                                          )}
                                      />
                                    </Field>
                                  </Grid>
                                )}
                            <p className="text-xs text-foreground-500">
                              Boş bırakırsan Download butonu görünmez.
                              Kullanıcının işletim sistemi otomatik algılanır ve
                              uygun link/dosya açılır.
                            </p>
                          </div>
                        </ItemCard>
                      ))}
                      <AddButton onPress={addProject} label="Proje Ekle" />
                    </div>
                  </PanelCard>

                  <PanelCard
                    title={`GitHub Repoları (${githubRepos.length})`}
                  >
                    <p className="mb-3 text-xs text-foreground-500">
                      GitHub hesabındaki public repo'lar. 'Eksik' olanlar sitede
                      görünmüyor — tek tıkla ekleyebilirsin. Ekledikten sonra
                      Kaydet'e bas.
                    </p>
                    {githubRepos.length === 0
                      ? (
                          <p className="text-xs text-foreground-500">
                            Repo listesi yükleniyor veya alınamıyor (GitHub
                            kullanıcı adı ayarla: Site › GitHub Kullanıcı Adı).
                          </p>
                        )
                      : (
                          <div className="flex flex-col gap-2">
                            {githubRepos.map((repo) => {
                              const inSite = content.projects.items.some(
                                p => p.title === repo.name,
                              )
                              return (
                                <div
                                  key={repo.name}
                                  className="flex flex-row items-center gap-3 rounded-lg border border-foreground-200/10 p-2.5"
                                >
                                  <div className="min-w-0 flex-1">
                                    <p className="truncate text-sm font-semibold text-foreground">
                                      {repo.name}
                                    </p>
                                    {repo.description && (
                                      <p className="truncate text-xs text-foreground-500">
                                        {repo.description}
                                      </p>
                                    )}
                                    <p className="mt-0.5 text-[10px] text-foreground-600">
                                      ★
                                      {' '}
                                      {repo.stars}
                                      {' '}
                                      ·
                                      {' '}
                                      {repo.forks}
                                      {' '}
                                      fork ·
                                      {' '}
                                      {repo.language ?? '—'}
                                    </p>
                                  </div>
                                  {inSite
                                    ? (
                                        <span className="shrink-0 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-400">
                                          Sitede var
                                        </span>
                                      )
                                    : (
                                        <button
                                          type="button"
                                          onClick={() => addGithubRepo(repo)}
                                          className="shrink-0 h-8 rounded-lg bg-[#e5e7eb] px-3 text-xs font-semibold text-black hover:bg-[#d1d5db]"
                                        >
                                          Ekle
                                        </button>
                                      )}
                                  <a
                                    href={repo.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="shrink-0 text-xs text-foreground-500 hover:text-primary"
                                  >
                                    GitHub ↗
                                  </a>
                                </div>
                              )
                            })}
                          </div>
                        )}
                  </PanelCard>
                </div>
              ),
            },
{
              key: 'blog',
              label: (
                <span className="inline-flex items-center gap-1.5">
                  <Icon icon="mdi:post-outline" width={15} height={15} />
                  Blog Yazıları
                </span>
              ),
              children: (
                <BlogManager onStatus={setStatus} saving={saving} initialPosts={initialBlogPosts ?? []} />
              ),
            },
            {
              key: 'messages',
              label: (
                <span className="inline-flex items-center gap-1.5">
                  <Icon icon="mdi:chat-outline" width={15} height={15} />
                  Chat Mesajları
                </span>
              ),
              children: (
                <div className="space-y-4 pt-4">
                  <div className="flex flex-row items-center justify-between">
                    <p className="text-sm text-foreground-500">
                      {messages.length}
                      {' '}
                      mesaj
                    </p>
                    {messages.length > 0 && (
                      <Button
                        size="sm"
                        color="danger"
                        variant="bordered"
                        onPress={clearMessages}
                        isLoading={saving}
                      >
                        Tümünü Sil
                      </Button>
                    )}
                  </div>
                  <ChatPanel
                    initialMessages={messages}
                    displayName={content.profile.displayName}
                    onStatus={setStatus}
                  />
                </div>
              ),
            },
            {
              key: 'settings',
              label: (
                <span className="inline-flex items-center gap-1.5">
                  <Icon icon="mdi:tune" width={15} height={15} />
                  Ayarlar
                </span>
              ),
              children: (
                <div className="space-y-4 pt-4">
                  <PasswordCard />
                  <div>
                    <h2 className="mb-2 text-base font-semibold">
                      Kullanıcı Yönetimi
                    </h2>
                    <UsersPanel />
                  </div>
                </div>
              ),
            },
          ]}
        />
      </div>
      <div className="mt-6 flex flex-col items-center gap-3">
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
        <Button
          color="primary"
          size="lg"
          className="w-full sm:w-auto font-semibold"
          onPress={save}
          isLoading={saving}
          isDisabled={saving}
        >
          <Icon icon="material-symbols:save" width={20} height={20} />
          Tüm Değişiklikleri Kaydet
        </Button>
      </div>
    </div>
  )
}

function PanelCard({
  title,
  children,
}: {
  title: string
  children: ReactNode
}) {
  return (
    <Card className="p-4 sm:p-5 bg-background">
      <div className="pb-3">
        <h2 className="text-base sm:text-lg font-semibold">{title}</h2>
        <Divider className="mt-2" />
      </div>
      {children}
    </Card>
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
  children,
  onRemove,
}: {
  title: string
  children: ReactNode
  onRemove: () => void
}) {
  return (
    <Card className="p-3 sm:p-4 bg-background">
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

function ProfilePhotoCard({
  profileImage,
  displayName,
  onUploaded,
  onStatus,
}: {
  profileImage: string
  displayName: string
  onUploaded: (image: string) => void
  onStatus: (status: SaveStatus) => void
}) {
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const upload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) {
      return
    }
    setUploading(true)
    onStatus(null)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch('/api/admin/profile', {
        method: 'POST',
        body: fd,
      })
      const data = await res.json()
      if (res.ok && data.success) {
        onUploaded(data.profileImage)
        onStatus({ type: 'success', text: 'Profil fotoğrafı güncellendi.' })
      }
      else {
        onStatus({
          type: 'error',
          text: data.message || 'Fotoğraf yüklenemedi.',
        })
      }
    }
    catch {
      onStatus({ type: 'error', text: 'Bir hata oluştu.' })
    }
    finally {
      setUploading(false)
    }
  }

  return (
    <PanelCard title="Profil Fotoğrafı">
      <div className="flex flex-col sm:flex-row items-center gap-4">
        <div className="relative shrink-0">
          {profileImage
            ? (
                <img
                  src={profileImage}
                  alt={displayName}
                  width={96}
                  height={96}
                  className="h-24 w-24 rounded-2xl object-cover ring-1 ring-white/10"
                />
              )
            : (
                <div className="flex h-24 w-24 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 to-orange-600 text-4xl font-black text-black">
                  {displayName.charAt(0) || 'T'}
                </div>
              )}
        </div>
        <div className="flex flex-col items-center sm:items-start gap-3">
          <input
            ref={fileRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif"
            className="hidden"
            onChange={upload}
          />
          <Button
            color="primary"
            onPress={() => fileRef.current?.click()}
            isLoading={uploading}
            startContent={<Icon icon="mdi:camera" width={18} height={18} />}
          >
            Fotoğraf Yükle
          </Button>
          <p className="text-xs text-foreground-500">
            PNG, JPG, WEBP veya GIF — en fazla 5 MB. Yüklenince
            {' '}
            <span className="font-mono">/uploads/profile.png</span>
            {' '}
            olarak
            kaydedilir ve sitede profil olarak gösterilir.
          </p>
        </div>
      </div>
    </PanelCard>
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

interface BlogManagerProps {
  onStatus: (s: SaveStatus) => void
  saving: boolean
}

/**
 * Blog yazıları CRUD — /api/admin/blog (upsert + delete) üzerinden çalışır.
 * Yazılar data/blog/posts.json'a yazılır; statik export'ta build zamanında dahil olur.
 */
function BlogManager({ initialPosts, onStatus }: BlogManagerProps & { initialPosts: BlogPost[] }) {
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
    setPosts(prev =>
      [...prev.filter((p: any) => p.id !== editing.id), { ...editing }])
    setEditing(null)
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
    if (editing?.id === post.id)
      setEditing(null)
  }

  const toSlug = (s: string) =>
    s.toLocaleLowerCase('tr').replace(/[^a-z0-9ığüşöç\s-]/g, '').trim().replace(/\s+/g, '-')

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
          {posts.length} yazı
        </p>
        {!editing && (
          <Button
            size="sm"
            color="primary"
            variant="bordered"
            onPress={() => setEditing(emptyPost())}
          >
            + Yeni Yazı
          </Button>
        )}
      </div>

      {editing && (
        <PanelCard title={posts.some((p: any) => p.id === editing.id) ? 'Yazıyı Düzenle' : 'Yeni Yazı'}>
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
                  onValueChange={v => setEditing({ ...editing, slug: toSlug(v) || v })}
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
            <div className="flex flex-row gap-2">
              <Button
                color="primary"
                size="sm"
                onPress={savePost}
                isDisabled={!editing.title?.trim() || !editing.slug?.trim()}
              >
                Kaydet
              </Button>
              <Button
                variant="bordered"
                size="sm"
                onPress={() => setEditing(null)}
              >
                Vazgeç
              </Button>
            </div>
          </div>
        </PanelCard>
      )}

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
                  ·
                  {' '}
                  /blog/{post.slug}
                </p>
              </div>
              <Button size="sm" variant="light" onPress={() => setEditing({ ...post })}>
                Düzenle
              </Button>
              <Button size="sm" color="danger" variant="light" onPress={() => removePost(post)}>
                Sil
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
