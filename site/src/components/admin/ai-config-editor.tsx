'use client'

import type { AiConfig, SiteContent } from '@/lib/content'
import { Icon } from '@iconify/react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'

export function AiConfigEditor({
  content,
  onChange,
  onSave,
}: {
  content: SiteContent
  onChange: (updater: (prev: SiteContent) => SiteContent) => void
  onSave?: () => void
}) {
  const ai = content.aiConfig || {}

  const [showClaudeKey, setShowClaudeKey] = useState(false)
  const [showGithubToken, setShowGithubToken] = useState(false)
  const [copied, setCopied] = useState(false)
  const [saveStatus, setSaveStatus] = useState<string | null>(null)

  const updateAi = (patch: Partial<AiConfig>) => {
    onChange(prev => ({
      ...prev,
      aiConfig: {
        ...prev.aiConfig,
        ...patch,
      },
    }))
  }

  const generatedPrompt = `# TARIK ELER PORTFOLYO & SİTE YÖNETİMİ — AI GELİŞTİRİCİ TALİMATI

Sen Tarık Eler'in portfolyo ve kişisel web sitesi projesinde çalışan uzman yapay zeka asistanısın.

## 📁 Çalışma Dizini ve Proje Yolu
- Kök Dizin: C:\\Users\\TARIKELER\\Documents\\Projelerim\\TARIK ELER TARNAK\\site
- GitHub Repo: ${ai.githubRepo || 'TARIKELER-TARNAK/tarikelertarnak'}
- Aktif Branch: ${ai.githubBranch || 'rewrite/all-in-one'}
- Model Tercihi: ${ai.model || 'claude-3-7-sonnet-20250219'}

## 🏗️ Mimari & Dosya Düzeni
- Framework: Next.js 16 (App Router) + React 19 + TypeScript (Strict)
- Stil: Tailwind CSS v4 + HeroUI + CSS Değişkenleri (tokens.css, globals.css)
- Veri Tabanı & Auth: Supabase SSR (@supabase/ssr, @supabase/supabase-js)
- İçerik Kaynağı: \`site/data/content.json\` (Disk / Gömülü) ve Supabase tabloları (\`site_content\`, \`projects\`, \`blog_posts\`)
- Dağıtım: Cloudflare Pages / Workers (\`@opennextjs/cloudflare\`)

## 📌 Proje Ekleme Adımları
1. \`site/data/content.json\` içindeki \`projects.items\` dizisine yeni proje ekle veya güncelle:
\`\`\`json
{
  "id": "proje-id",
  "title": "Proje Başlığı",
  "subtitle": "Kısa Açıklama",
  "description": "Detaylı açıklama ve özellikler",
  "tags": ["Next.js", "TypeScript", "Tailwind"],
  "link": "https://ornek.com",
  "github": "https://github.com/...",
  "stars": 0,
  "featured": true
}
\`\`\`
2. Görselleri \`site/public/projects/\` altına ekle ve göreceli yol ver.

## ✍️ Blog Yazısı Ekleme Adımları
1. \`site/data/content.json\` içindeki blog veya Supabase \`blog_posts\` tablosuna yeni yazı kaydet:
\`\`\`json
{
  "slug": "yazi-basligi",
  "title": "Yazı Başlığı",
  "excerpt": "Giriş özeti...",
  "content": "Markdown veya HTML formatında blog içeriği...",
  "publishedAt": "${new Date().toISOString()}",
  "tags": ["Rehber", "Yazılım"],
  "readingTime": "5 dk"
}
\`\`\`

## 🚀 Git ve Dağıtım Kuralları
1. Kod değişikliklerini doğrula:
   \`npm run typecheck\` ve \`npm test\`
2. Git'e kaydet:
   \`git add .\`
   \`git commit -m "feat: proje veya blog içeriği güncellendi"\`
3. Uzak sunucuya gönder:
   \`git push origin ${ai.githubBranch || 'rewrite/all-in-one'}\`
4. Cloudflare Pages dağıtımını WSL üzerinden çalıştır:
   \`bash scripts/deploy-pages.sh\`
${ai.systemPrompt ? `\n## 💡 Ek Sistem Talimatı\n${ai.systemPrompt}\n` : ''}`

  const handleCopyPrompt = async () => {
    try {
      await navigator.clipboard.writeText(generatedPrompt)
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    }
    catch {
      // Pano API erişilemezse fallback
      setCopied(false)
    }
  }

  const handleSaveLocal = () => {
    if (onSave) {
      onSave()
      setSaveStatus('Ayarlar kaydedildi!')
      setTimeout(() => setSaveStatus(null), 3000)
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Icon icon="mdi:robot-outline" width={24} height={24} />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-base font-semibold text-foreground">
              Yapay Zeka &amp; GitHub Entegrasyon Yapılandırması
            </h3>
            <p className="mt-1 text-sm text-foreground-500">
              Claude API ve GitHub bilgilerinizi buradan yönetebilirsiniz. Alttaki otomatik üretilen prompt ile
              herhangi bir yapay zekaya (Claude, Cursor, ChatGPT) projenin dosya yapısını ve içerik ekleme kurallarını tek tıkla öğretebilirsiniz.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {/* Claude API Key */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold uppercase tracking-wider text-foreground-600">
            Claude API Key
          </label>
          <div className="relative flex items-center">
            <Input
              type={showClaudeKey ? 'text' : 'password'}
              placeholder="sk-ant-api03-..."
              value={ai.claudeApiKey || ''}
              onValueChange={val => updateAi({ claudeApiKey: val })}
              className="w-full pr-10"
              startContent={<Icon icon="mdi:key-outline" className="text-foreground-400" width={18} />}
            />
            <button
              type="button"
              onClick={() => setShowClaudeKey(!showClaudeKey)}
              className="absolute right-2.5 z-10 text-foreground-400 hover:text-foreground"
              aria-label={showClaudeKey ? 'Gizle' : 'Göster'}
            >
              <Icon icon={showClaudeKey ? 'mdi:eye-off-outline' : 'mdi:eye-outline'} width={18} />
            </button>
          </div>
        </div>

        {/* Model */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold uppercase tracking-wider text-foreground-600">
            Model
          </label>
          <Input
            placeholder="claude-3-7-sonnet-20250219"
            value={ai.model || ''}
            onValueChange={val => updateAi({ model: val })}
            className="w-full"
            startContent={<Icon icon="mdi:brain" className="text-foreground-400" width={18} />}
          />
        </div>

        {/* GitHub Personal Access Token */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold uppercase tracking-wider text-foreground-600">
            GitHub Token (Push İzni)
          </label>
          <div className="relative flex items-center">
            <Input
              type={showGithubToken ? 'text' : 'password'}
              placeholder="ghp_..."
              value={ai.githubToken || ''}
              onValueChange={val => updateAi({ githubToken: val })}
              className="w-full pr-10"
              startContent={<Icon icon="mdi:github" className="text-foreground-400" width={18} />}
            />
            <button
              type="button"
              onClick={() => setShowGithubToken(!showGithubToken)}
              className="absolute right-2.5 z-10 text-foreground-400 hover:text-foreground"
              aria-label={showGithubToken ? 'Gizle' : 'Göster'}
            >
              <Icon icon={showGithubToken ? 'mdi:eye-off-outline' : 'mdi:eye-outline'} width={18} />
            </button>
          </div>
        </div>

        {/* GitHub Repo */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold uppercase tracking-wider text-foreground-600">
            GitHub Repository
          </label>
          <Input
            placeholder="TARIKELER-TARNAK/tarikelertarnak"
            value={ai.githubRepo || ''}
            onValueChange={val => updateAi({ githubRepo: val })}
            className="w-full"
            startContent={<Icon icon="mdi:source-repository" className="text-foreground-400" width={18} />}
          />
        </div>

        {/* GitHub Branch */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold uppercase tracking-wider text-foreground-600">
            Hedef Git Branch
          </label>
          <Input
            placeholder="rewrite/all-in-one"
            value={ai.githubBranch || ''}
            onValueChange={val => updateAi({ githubBranch: val })}
            className="w-full"
            startContent={<Icon icon="mdi:source-branch" className="text-foreground-400" width={18} />}
          />
        </div>

        {/* Otomatik Push Tercihi */}
        <div className="flex flex-col justify-end space-y-1.5 pb-1">
          <label className="text-xs font-semibold uppercase tracking-wider text-foreground-600">
            Otomatik Git Push
          </label>
          <label className="flex h-10 cursor-pointer items-center gap-3 rounded-lg border border-surface-border bg-surface-0 px-3 transition-colors hover:border-surface-border-hover">
            <input
              type="checkbox"
              checked={!!ai.autoPush}
              onChange={e => updateAi({ autoPush: e.target.checked })}
              className="h-4 w-4 rounded border-white/20 bg-white/5 text-primary focus:ring-primary"
            />
            <span className="text-sm font-medium text-foreground">
              İçerik kaydedildiğinde otomatik push tetikle
            </span>
          </label>
        </div>
      </div>

      {/* Ek Sistem Talimatı */}
      <div className="space-y-1.5">
        <label className="text-xs font-semibold uppercase tracking-wider text-foreground-600">
          Özel Sistem Talimatı / Notlar
        </label>
        <Textarea
          placeholder="Yapay zekanın bilmesini istediğiniz özel kurallar, proje hedefleri veya ek notlar..."
          value={ai.systemPrompt || ''}
          onValueChange={val => updateAi({ systemPrompt: val })}
          minRows={3}
          className="w-full"
        />
      </div>

      {/* Kaydetme Butonu ve Geri Bildirim */}
      <div className="flex items-center gap-3 pt-2">
        <Button
          color="primary"
          variant="solid"
          onClick={handleSaveLocal}
          className="flex items-center gap-2"
        >
          <Icon icon="mdi:content-save-outline" width={18} />
          Yapay Zeka Ayarlarını Kaydet
        </Button>
        {saveStatus && (
          <span className="text-sm font-medium text-emerald-500">
            ✓
{' '}
{saveStatus}
          </span>
        )}
      </div>

      {/* Kopyalanabilir Prompt Alanı */}
      <div className="space-y-3 rounded-xl border border-surface-border bg-surface-0 p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-surface-border pb-3">
          <div className="flex items-center gap-2">
            <Icon icon="mdi:clipboard-text-outline" className="text-primary" width={20} />
            <h4 className="text-sm font-semibold text-foreground">
              Yapay Zekaya Verilecek Kopyalanabilir Talimat (Prompt)
            </h4>
          </div>
          <Button
            variant="bordered"
            onClick={handleCopyPrompt}
            className="flex items-center gap-1.5 text-xs font-medium"
          >
            <Icon icon={copied ? 'mdi:check-circle' : 'mdi:content-copy'} width={16} className={copied ? 'text-emerald-500' : ''} />
            {copied ? 'Prompt Kopyalandı!' : 'Promptu Kopyala'}
          </Button>
        </div>

        <p className="text-xs text-foreground-500">
          Bu promptu kopyalayıp Claude Code, Cursor veya ChatGPT penceresine yapıştırarak projeye hızlıca yeni proje, blog yazısı veya içerik eklemesini sağlayabilirsiniz.
        </p>

        <div className="relative">
          <pre className="max-h-96 overflow-auto rounded-lg border border-surface-border bg-surface-1 p-3.5 font-mono text-xs text-foreground-700 whitespace-pre-wrap select-all">
            {generatedPrompt}
          </pre>
        </div>
      </div>
    </div>
  )
}
