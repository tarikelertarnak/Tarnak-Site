/**
 * Puck visual page builder config — the "Page Editor" in the admin panel
 * (see /admin/puck) and the /puck/* viewing routes work with this config.
 *
 * User request (2026-09-07): everything should be editable —
 * color palette, font selection, font size, custom sizing,
 * stacking/front-back (position + zIndex), reset, import/export.
 */
import type { Config } from '@measured/puck'
import type { CSSProperties } from 'react'

function cn(...parts: (string | false | undefined)[]) {
  return parts.filter(Boolean).join(' ')
}

/* ------------------------------------------------------------------ */
/* Shared helpers: color palette, fonts, layout (position/size)        */
/* ------------------------------------------------------------------ */

export const FONTS: Record<string, string> = {
  inherit: 'inherit',
  montserrat: '\'Montserrat\', sans-serif',
  system: 'system-ui, -apple-system, sans-serif',
  serif: 'Georgia, "Times New Roman", serif',
  mono: '\'Courier New\', monospace',
  arial: 'Arial, Helvetica, sans-serif',
}

const PALETTE: Record<string, string> = {
  inherit: '',
  white: '#ffffff',
  black: '#000000',
  red: '#e11d48',
  orange: '#f97316',
  amber: '#f59e0b',
  green: '#22c55e',
  emerald: '#10b981',
  cyan: '#06b6d4',
  blue: '#3b82f6',
  violet: '#8b5cf6',
  pink: '#ec4899',
}

/** Color selection: custom hex if present, otherwise palette color ('' → CSS default). */
function pickColor(palette?: string, hex?: string): string {
  return (hex || '').trim() || PALETTE[palette || 'inherit'] || ''
}

/** Common look fields added to every component (color palette + font + size). */
function typeFields(): Record<string, any> {
  return {
    /** Color palette — preset options */
    palette: {
      type: 'select' as const,
      label: 'Renk paleti',
      options: Object.entries(PALETTE).map(([value, c]) => ({
        label: value === 'inherit' ? 'Varsayılan' : `${c} ${value}`,
        value,
      })),
    },
    /** Custom color (hex) — overrides the palette */
    hex: { type: 'text' as const, label: 'Özel renk (hex, örn. #8b5cf6)' },
    /** Font family */
    font: {
      type: 'select' as const,
      label: 'Font',
      options: Object.entries(FONTS).map(([value]) => ({
        label: value === 'inherit' ? 'Varsayılan' : value,
        value,
      })),
    },
    /** Font size (px) */
    fontSize: { type: 'number' as const, label: 'Font boyutu (px)', min: 10, max: 160 },
    /** Font weight */
    weight: {
      type: 'select' as const,
      label: 'Kalınlık',
      options: [
        { label: 'Normal', value: '400' },
        { label: 'Orta', value: '500' },
        { label: 'Kalın', value: '700' },
        { label: 'Çok kalın', value: '800' },
      ],
    },
    /** Line height */
    lineHeight: { type: 'number' as const, label: 'Satır aralığı', min: 1, max: 3, step: 0.1 },
  }
}

/** Common layout fields added to every component (stacking, front/back, sizing). */
function layoutFields(): Record<string, any> {
  return {
    position: {
      type: 'select' as const,
      label: 'Konum',
      options: [
        { label: 'Normal (akışta)', value: 'static' },
        { label: 'Göreli', value: 'relative' },
        { label: 'Mutlak (üst üste)', value: 'absolute' },
      ],
    },
    top: { type: 'text' as const, label: 'Üstten (top, px)' },
    left: { type: 'text' as const, label: 'Soldan (left, px)' },
    width: { type: 'number' as const, label: 'Genişlik (px, 0 = otomatik)', min: 0, max: 1920 },
    zIndex: { type: 'number' as const, label: 'Katman (z-index, önde/arkada)', min: -10, max: 100 },
    opacity: {
      type: 'number' as const,
      label: 'Opaklık (%)',
      min: 0,
      max: 100,
    },
    marginTop: { type: 'number' as const, label: 'Üst boşluk (px)', min: 0, max: 200 },
    marginBottom: { type: 'number' as const, label: 'Alt boşluk (px)', min: 0, max: 200 },
  }
}

/** Generates inline CSS style from props (layout + type styles). */
function layoutStyle(p: Record<string, unknown>): CSSProperties {
  const s: CSSProperties = {}
  if (p.position && p.position !== 'static')
    s.position = p.position as 'absolute'
  if (p.top)
    s.top = Number.parseInt(String(p.top), 10)
  if (p.left)
    s.left = Number.parseInt(String(p.left), 10)
  if (p.zIndex !== undefined && p.zIndex !== null && p.zIndex !== 0)
    s.zIndex = Number(p.zIndex)
  if (p.opacity !== undefined && p.opacity !== null && Number(p.opacity) < 100)
    s.opacity = Number(p.opacity) / 100
  if (p.width)
    s.width = Number(p.width)
  if (p.marginTop !== undefined && p.marginTop)
    s.marginTop = Number(p.marginTop)
  if (p.marginBottom !== undefined && p.marginBottom)
    s.marginBottom = Number(p.marginBottom)
  const color = pickColor(p.palette as string, p.hex as string)
  if (color)
    s.color = color
  if (p.font && p.font !== 'inherit')
    s.fontFamily = FONTS[p.font as string]
  if (p.fontSize)
    s.fontSize = `${p.fontSize}px`
  if (p.weight && p.weight !== '400')
    s.fontWeight = Number(p.weight)
  if (p.lineHeight)
    s.lineHeight = Number(p.lineHeight)
  return s
}

/* ------------------------------------------------------------------ */
/* Component renders                                                     */
/* ------------------------------------------------------------------ */

function Section({ children, className }: { children: React.ReactNode, className?: string }) {
  return (
    <section
      className={cn(
        'mx-auto w-full max-w-6xl px-4 sm:px-6 py-12 text-foreground dark:text-white',
        className,
      )}
    >
      {children}
    </section>
  )
}

function HeroBlock(props: Record<string, unknown>) {
  const p = props as { name: string, tagline: string, description: string }
  return (
    <Section>
      <div className="text-center" style={layoutStyle(props)}>
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-primary" style={{ color: pickColor((props as any).palette, (props as any).hex) || undefined }}>
          {p.tagline}
        </p>
        <h1 className="mt-4 text-4xl font-extrabold sm:text-6xl">{p.name}</h1>
        {p.description
          ? (
              <p className="mx-auto mt-6 max-w-2xl text-lg text-foreground/80 dark:text-white/70">{p.description}</p>
            )
          : null}
      </div>
    </Section>
  )
}

function HeadingBlock(props: Record<string, unknown>) {
  const p = props as { text: string, level: string, align: string }
  const Tag = (p.level || 'h2') as 'h1' | 'h2' | 'h3' | 'h4'
  const sizes: Record<string, string> = {
    h1: 'text-4xl sm:text-5xl font-extrabold',
    h2: 'text-3xl sm:text-4xl font-bold',
    h3: 'text-2xl sm:text-3xl font-semibold',
    h4: 'text-xl font-semibold',
  }
  return (
    <Tag
      className={cn('my-4', sizes[p.level] || sizes.h2, p.align === 'center' && 'text-center', p.align === 'right' && 'text-right')}
      style={layoutStyle(props)}
    >
      <span className="inline-block border-b-4 border-primary pb-1 uppercase">{p.text}</span>
    </Tag>
  )
}

function ParagraphBlock(props: Record<string, unknown>) {
  const p = props as { text: string, size: string, align: string }
  const sizes: Record<string, string> = {
    sm: 'text-sm leading-relaxed',
    base: 'text-base leading-relaxed',
    lg: 'text-lg leading-relaxed',
    xl: 'text-xl leading-relaxed',
  }
  return (
    <p
      className={cn('text-foreground/80 dark:text-white/80', sizes[p.size] || sizes.base)}
      style={{ textAlign: p.align as 'left', ...layoutStyle(props) }}
    >
      {p.text}
    </p>
  )
}

function ImageBlock(props: Record<string, unknown>) {
  const p = props as {
    src: string
    alt: string
    width: number
    height: number
    fit: string
    rounded: number
    shadow: boolean
  }
  if (!p.src)
    return null
  return (
    <div className="my-2" style={layoutStyle(props)}>
      <img
        src={p.src}
        alt={p.alt || ''}
        width={p.width || 800}
        height={p.height || undefined}
        className={cn('mx-auto h-auto max-w-full', p.shadow && 'shadow-2xl')}
        style={{
          objectFit: (p.fit || 'cover') as 'cover',
          borderRadius: p.rounded ? `${p.rounded}px` : undefined,
        }}
      />
    </div>
  )
}

function ButtonBlock(props: Record<string, unknown>) {
  const p = props as {
    label: string
    href: string
    variant: string
    size: string
    radius: number
    bgColor: string
    textColor: string
    align: string
    full: boolean
  }
  if (!p.href)
    return null
  const sizes: Record<string, string> = {
    sm: 'px-3.5 py-1.5 text-xs',
    md: 'px-5 py-2.5 text-sm',
    lg: 'px-7 py-3.5 text-base',
  }
  const variants: Record<string, string> = {
    primary: 'bg-[#e5e7eb] text-black dark:bg-white dark:text-black font-semibold hover:opacity-90',
    outline: 'border border-foreground/20 text-foreground dark:text-white hover:border-primary',
    danger: 'bg-red-600 text-white hover:bg-red-500',
    success: 'bg-emerald-600 text-white hover:bg-emerald-500',
  }
  return (
    <div
      className={cn('my-2', p.align === 'center' && 'text-center', p.align === 'right' && 'text-right')}
      style={layoutStyle(props)}
    >
      {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
      <a
        href={p.href}
        target={p.href.startsWith('http') ? '_blank' : undefined}
        rel={p.href.startsWith('http') ? 'noopener noreferrer' : undefined}
        className={cn(
          'inline-flex items-center justify-center rounded-lg transition-colors',
          sizes[p.size] || sizes.md,
          variants[p.variant] || variants.primary,
          p.full && 'w-full',
          (p.bgColor || p.textColor) && '!bg-none',
        )}
        style={{
          ...(p.bgColor ? { backgroundColor: p.bgColor } : {}),
          ...(p.textColor ? { color: p.textColor } : {}),
          borderRadius: p.radius ? `${p.radius}px` : undefined,
        }}
      >
        {p.label}
      </a>
    </div>
  )
}

function SpacerBlock(props: Record<string, unknown>) {
  const p = props as { height: number }
  return <div style={{ height: p.height || 24, ...layoutStyle(props) }} aria-hidden />
}

function HeroWelcome(props: Record<string, unknown>) {
  const p = props as { name: string, tagline: string }
  return (
    <div style={layoutStyle(props)}>
      <p className="text-xs font-semibold uppercase tracking-[0.25em] text-primary" style={{ color: pickColor((props as any).palette, (props as any).hex) || undefined }}>
        {p.tagline}
      </p>
      <h2 className="mt-2 text-2xl font-extrabold sm:text-3xl">{p.name}</h2>
    </div>
  )
}

function QuoteBlock(props: Record<string, unknown>) {
  const p = props as { text: string, author: string, align: string }
  return (
    <blockquote
      className={cn('my-4 border-l-4 border-primary pl-4 italic text-foreground/80 dark:text-white/80', p.align === 'center' && 'text-center border-l-0')}
      style={layoutStyle(props)}
    >
      <p className="text-xl">
        “
        {p.text}
        ”
      </p>
      {p.author ? <footer className="mt-2 text-sm not-italic text-foreground/50">{p.author}</footer> : null}
    </blockquote>
  )
}

function DividerBlock(props: Record<string, unknown>) {
  const p = props as { thickness: number, width: number, color: string }
  return (
    <div className="my-4 flex justify-center" style={layoutStyle(props)}>
      <hr
        className="border-0"
        style={{
          height: Math.max(1, p.thickness || 1),
          width: `${Math.min(100, p.width || 100)}%`,
          backgroundColor: p.color || 'currentColor',
          opacity: 0.6,
        }}
      />
    </div>
  )
}

function VideoBlock(props: Record<string, unknown>) {
  const p = props as { url: string, maxWidth: number, rounded: boolean }
  const url = (p.url || '').trim()
  let embed = ''
  if (url) {
    const yt = /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([\w-]{6,})/.exec(url)
    if (yt)
      embed = `https://www.youtube.com/embed/${yt[1]}`
    else if (url.includes('vimeo.com'))
      embed = url.replace('vimeo.com', 'player.vimeo.com/video')
    else embed = url
  }
  if (!embed)
    return <p style={layoutStyle(props)} className="text-sm text-foreground/40">Video URL ekleyin (YouTube/Vimeo/direct link)</p>
  return (
    <div className="my-4" style={layoutStyle(props)}>
      <div
        className="relative mx-auto aspect-video overflow-hidden bg-black"
        style={{ maxWidth: p.maxWidth || 720, borderRadius: p.rounded ? 16 : undefined }}
      >
        <iframe
          src={embed}
          className="h-full w-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
    </div>
  )
}

function ColoredBox(props: Record<string, unknown>) {
  const p = props as {
    title: string
    text: string
    bgColor: string
    borderWidth: number
    borderColor: string
    padding: number
    radius: number
    shadow: boolean
  }
  const style: CSSProperties = layoutStyle(props)
  style.backgroundColor = p.bgColor || '#14141a'
  style.padding = `${p.padding || 24}px`
  style.borderRadius = p.radius !== undefined ? `${p.radius}px` : '16px'
  if (p.borderWidth) {
    style.border = `${p.borderWidth}px solid ${p.borderColor || 'rgba(255,255,255,0.15)'}`
  }
  if (p.shadow)
    style.boxShadow = '0 20px 50px -20px rgba(0,0,0,0.6)'
  const textStyle = layoutStyle(props)
  return (
    <div className="my-4 text-white" style={style}>
      {p.title ? <h3 className="text-xl font-bold" style={textStyle}>{p.title}</h3> : null}
      {p.text ? <p className="mt-2 leading-relaxed text-white/80" style={textStyle}>{p.text}</p> : null}
    </div>
  )
}

function ColumnsBlock(props: any) {
  const p = props as { gap: number, ratio: string }
  const ratioCls: Record<string, string> = {
    '1:1': 'md:grid-cols-2',
    '1:2': 'md:grid-cols-3',
    '2:1': 'md:grid-cols-3',
  }
  const leftSpan = p.ratio === '1:2' ? '' : p.ratio === '2:1' ? 'col-span-2' : ''
  return (
    <div
      className={cn('grid gap-6 md:grid-cols-2', ratioCls[p.ratio] || 'md:grid-cols-2')}
      style={{ gap: p.gap || 24, ...layoutStyle(props) }}
    >
      <div className={p.ratio === '2:1' ? 'md:col-span-2' : ''}>{props.puck.renderDropZone('left')}</div>
      <div className={leftSpan}>{props.puck.renderDropZone('right')}</div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Config                                                              */
/* ------------------------------------------------------------------ */

function StatsBlock(props: Record<string, unknown>) {
  const p = props as { rows: string, size: string }
  // Each row: "value | label" — separated by line breaks
  const rows = (p.rows || '')
    .split('\n')
    .map(line => line.split('|').map(s => s.trim()))
    .filter(parts => parts.length >= 2 && parts[0])
  if (!rows.length)
    return null
  const sizes: Record<string, string> = {
    sm: 'text-2xl',
    md: 'text-3xl',
    lg: 'text-5xl',
  }
  return (
    <div
      className="mx-auto my-6 grid max-w-4xl grid-cols-1 gap-4 sm:grid-cols-3"
      style={layoutStyle(props)}
    >
      {rows.map(([value, label], i) => (
        <div
          key={i}
          className="rounded-2xl border border-foreground/10 bg-foreground/[0.03] px-6 py-6 text-center"
        >
          <p className={cn('font-extrabold', sizes[p.size] || sizes.md)}>{value}</p>
          <p className="mt-1 text-sm text-foreground/60">{label}</p>
        </div>
      ))}
    </div>
  )
}

function ImageGalleryBlock(props: Record<string, unknown>) {
  const p = props as { img1: string, img2: string, img3: string, alt: string, rounded: number, gap: number }
  const images = [p.img1, p.img2, p.img3].filter(Boolean)
  if (!images.length)
    return null
  return (
    <div
      className="mx-auto my-6 grid max-w-5xl grid-cols-1 gap-4 sm:grid-cols-3"
      style={{
        gap: p.gap || 16,
        ...layoutStyle(props),
      }}
    >
      {images.map((src, i) => (
        <img
          key={i}
          src={src}
          alt={p.alt || 'Galeri görseli'}
          className="h-48 w-full object-cover"
          style={{ borderRadius: p.rounded !== undefined ? `${p.rounded}px` : '12px' }}
        />
      ))}
    </div>
  )
}

function TagCloudBlock(props: Record<string, unknown>) {
  const p = props as { tags: string, color: string }
  const tags = (p.tags || '').split(',').map(s => s.trim()).filter(Boolean)
  if (!tags.length)
    return null
  return (
    <div className="my-6 flex flex-wrap justify-center gap-2" style={layoutStyle(props)}>
      {tags.map((tag, i) => (
        <span
          key={i}
          className="rounded-full border border-foreground/15 px-4 py-1.5 text-sm"
          style={p.color ? { borderColor: p.color, color: p.color } : undefined}
        >
          {tag}
        </span>
      ))}
    </div>
  )
}

const ALL_COMPONENTS = [
  'HeroBlock',
  'HeadingBlock',
  'ParagraphBlock',
  'ImageBlock',
  'ButtonBlock',
  'SpacerBlock',
  'ColumnsBlock',
  'ColoredBox',
  'QuoteBlock',
  'DividerBlock',
  'VideoBlock',
  'HeroWelcome',
  'StatsBlock',
  'ImageGalleryBlock',
  'TagCloudBlock',
]

export const config: Config = {
  root: {
    fields: {
      title: { type: 'text', label: 'Sayfa başlığı' },
    },
  },
  components: {
    HeroBlock: {
      label: 'Hero (Karşılama)',
      fields: {
        name: { type: 'text', label: 'İsim' },
        tagline: { type: 'text', label: 'Alt başlık' },
        description: { type: 'textarea', label: 'Açıklama' },
        ...typeFields(),
        ...layoutFields(),
      },
      defaultProps: {
        name: 'Merhaba Dünya',
        tagline: 'Yazılımcı & Yaratıcı',
        description: '',
        palette: 'inherit',
      },
      render: (props: any) => <HeroBlock {...props} />,
    },
    HeroWelcome: {
      label: 'Karşılama (Küçük)',
      fields: {
        name: { type: 'text', label: 'İsim' },
        tagline: { type: 'text', label: 'Alt başlık' },
        ...typeFields(),
        ...layoutFields(),
      },
      defaultProps: { name: 'Hoş geldiniz', tagline: 'Alt başlık', palette: 'inherit' },
      render: (props: any) => <HeroWelcome {...props} />,
    },
    HeadingBlock: {
      label: 'Başlık',
      fields: {
        text: { type: 'text', label: 'Metin' },
        level: {
          type: 'select',
          label: 'Önem (H1–H4)',
          options: [
            { label: 'H1', value: 'h1' },
            { label: 'H2', value: 'h2' },
            { label: 'H3', value: 'h3' },
            { label: 'H4', value: 'h4' },
          ],
        },
        align: {
          type: 'radio',
          label: 'Hizalama',
          options: [
            { label: 'Sol', value: 'left' },
            { label: 'Orta', value: 'center' },
            { label: 'Sağ', value: 'right' },
          ],
        },
        ...typeFields(),
        ...layoutFields(),
      },
      defaultProps: { text: 'Başlık', level: 'h2', align: 'left', palette: 'inherit' },
      render: (props: any) => <HeadingBlock {...props} />,
    },
    ParagraphBlock: {
      label: 'Paragraf',
      fields: {
        text: { type: 'textarea', label: 'Metin' },
        size: {
          type: 'select',
          label: 'Boyut',
          options: [
            { label: 'Küçük', value: 'sm' },
            { label: 'Normal', value: 'base' },
            { label: 'Büyük', value: 'lg' },
            { label: 'Çok büyük', value: 'xl' },
          ],
        },
        align: {
          type: 'radio',
          label: 'Hizalama',
          options: [
            { label: 'Sol', value: 'left' },
            { label: 'Orta', value: 'center' },
            { label: 'Sağ', value: 'right' },
          ],
        },
        ...typeFields(),
        ...layoutFields(),
      },
      defaultProps: { text: 'Buraya açıklama yazın…', size: 'base', align: 'left', palette: 'inherit' },
      render: (props: any) => <ParagraphBlock {...props} />,
    },
    ImageBlock: {
      label: 'Görsel',
      fields: {
        src: { type: 'text', label: 'Görsel URL' },
        alt: { type: 'text', label: 'Alternatif metin' },
        width: { type: 'number', label: 'Genişlik (px)', min: 100, max: 1920 },
        height: { type: 'number', label: 'Yükseklik (px, 0 = otomatik)', min: 0, max: 1200 },
        fit: {
          type: 'select',
          label: 'Sığdırma',
          options: [
            { label: 'Kapla', value: 'cover' },
            { label: 'İçine sığdır', value: 'contain' },
            { label: 'Uzat', value: 'fill' },
          ],
        },
        rounded: { type: 'number', label: 'Köşe yuvarlığı (px)', min: 0, max: 100 },
        shadow: { type: 'checkbox', label: 'Gölge' },
        ...layoutFields(),
      },
      defaultProps: { src: '', alt: '', width: 800, height: 0, fit: 'cover', rounded: 16, shadow: true },
      render: (props: any) => <ImageBlock {...props} />,
    },
    ButtonBlock: {
      label: 'Buton',
      fields: {
        label: { type: 'text', label: 'Yazı' },
        href: { type: 'text', label: 'Hedef (URL veya /sayfa)' },
        variant: {
          type: 'select',
          label: 'Stil',
          options: [
            { label: 'Birincil', value: 'primary' },
            { label: 'Çerçeve', value: 'outline' },
            { label: 'Tehlike', value: 'danger' },
            { label: 'Başarı', value: 'success' },
          ],
        },
        size: {
          type: 'select',
          label: 'Boyut',
          options: [
            { label: 'Küçük', value: 'sm' },
            { label: 'Normal', value: 'md' },
            { label: 'Büyük', value: 'lg' },
          ],
        },
        align: {
          type: 'radio',
          label: 'Hizalama',
          options: [
            { label: 'Sol', value: 'left' },
            { label: 'Orta', value: 'center' },
            { label: 'Sağ', value: 'right' },
          ],
        },
        bgColor: { type: 'text', label: 'Arka plan rengi (hex)', placeholder: '#3b82f6' },
        textColor: { type: 'text', label: 'Yazı rengi (hex)', placeholder: '#ffffff' },
        radius: { type: 'number', label: 'Köşe yuvarlığı (px)', min: 0, max: 60 },
        full: { type: 'checkbox', label: 'Tam genişlik' },
        ...layoutFields(),
      },
      defaultProps: { label: 'Devam Et', href: '/', variant: 'primary', size: 'md', align: 'left', radius: 12, full: false },
      render: (props: any) => <ButtonBlock {...props} />,
    },
    SpacerBlock: {
      label: 'Boşluk',
      fields: {
        height: { type: 'number', label: 'Yükseklik (px)', min: 0, max: 400 },
        ...layoutFields(),
      },
      defaultProps: { height: 32 },
      render: (props: any) => <SpacerBlock {...props} />,
    },
    ColumnsBlock: {
      label: 'İki Sütun',
      fields: {
        gap: { type: 'number', label: 'Sütun arası boşluk (px)', min: 0, max: 120 },
        ratio: {
          type: 'select',
          label: 'Oran',
          options: [
            { label: '1:1 (eşit)', value: '1:1' },
            { label: '1:2 (sağ geniş)', value: '1:2' },
            { label: '2:1 (sol geniş)', value: '2:1' },
          ],
        },
        ...layoutFields(),
      },
      defaultProps: { gap: 24, ratio: '1:1' },
      render: (props: any) => <ColumnsBlock {...props} />,
    },
    ColoredBox: {
      label: 'Renkli Kutu',
      fields: {
        title: { type: 'text', label: 'Başlık' },
        text: { type: 'textarea', label: 'Metin' },
        bgColor: { type: 'text', label: 'Kutu rengi (hex)', placeholder: '#14141a' },
        borderWidth: { type: 'number', label: 'Kenarlık kalınlığı (px, 0 = yok)', min: 0, max: 12 },
        borderColor: { type: 'text', label: 'Kenarlık rengi (hex)' },
        padding: { type: 'number', label: 'İç boşluk (px)', min: 0, max: 120 },
        radius: { type: 'number', label: 'Köşe yuvarlığı (px)', min: 0, max: 80 },
        shadow: { type: 'checkbox', label: 'Gölge' },
        ...typeFields(),
        ...layoutFields(),
      },
      defaultProps: { title: 'Kutu başlığı', text: 'Kutu içeriği…', bgColor: '#14141a', padding: 24, radius: 16, shadow: true, palette: 'inherit' },
      render: (props: any) => <ColoredBox {...props} />,
    },
    QuoteBlock: {
      label: 'Alıntı',
      fields: {
        text: { type: 'textarea', label: 'Alıntı' },
        author: { type: 'text', label: 'Kaynak' },
        align: {
          type: 'radio',
          label: 'Hizalama',
          options: [
            { label: 'Sol', value: 'left' },
            { label: 'Orta', value: 'center' },
            { label: 'Sağ', value: 'right' },
          ],
        },
        ...typeFields(),
        ...layoutFields(),
      },
      defaultProps: { text: 'Alıntı metni…', author: '', align: 'left', palette: 'inherit' },
      render: (props: any) => <QuoteBlock {...props} />,
    },
    DividerBlock: {
      label: 'Ayraç',
      fields: {
        thickness: { type: 'number', label: 'Kalınlık (px)', min: 1, max: 20 },
        width: { type: 'number', label: 'Genişlik (%)', min: 10, max: 100 },
        color: { type: 'text', label: 'Renk (hex)', placeholder: '#e11d48' },
        ...layoutFields(),
      },
      defaultProps: { thickness: 1, width: 100, color: '' },
      render: (props: any) => <DividerBlock {...props} />,
    },
    VideoBlock: {
      label: 'Video',
      fields: {
        url: { type: 'text', label: 'Video URL (YouTube / Vimeo / direct)' },
        maxWidth: { type: 'number', label: 'Max genişlik (px)', min: 200, max: 1920 },
        rounded: { type: 'checkbox', label: 'Köşeleri yuvarla' },
        ...layoutFields(),
      },
      defaultProps: { url: '', maxWidth: 720, rounded: true },
      render: (props: any) => <VideoBlock {...props} />,
    },
    StatsBlock: {
      label: 'İstatistikler',
      fields: {
        rows: {
          type: 'textarea',
          label: 'Satırlar (her satır: değer | etiket)',
          placeholder: '5+ | Yıl deneyim\n120+ | Proje\n50K+ | Kullanıcı',
        },
        size: {
          type: 'select',
          label: 'Rakam boyutu',
          options: [
            { label: 'Küçük', value: 'sm' },
            { label: 'Normal', value: 'md' },
            { label: 'Büyük', value: 'lg' },
          ],
        },
        ...typeFields(),
        ...layoutFields(),
      },
      defaultProps: { rows: '5+ | Yıl deneyim\n120+ | Proje\n50K+ | Kullanıcı', size: 'md', palette: 'inherit' },
      render: (props: any) => <StatsBlock {...props} />,
    },
    ImageGalleryBlock: {
      label: 'Görsel Galerisi',
      fields: {
        img1: { type: 'text', label: 'Görsel 1 URL' },
        img2: { type: 'text', label: 'Görsel 2 URL' },
        img3: { type: 'text', label: 'Görsel 3 URL' },
        alt: { type: 'text', label: 'Alternatif metin' },
        rounded: { type: 'number', label: 'Köşe yuvarlığı (px)', min: 0, max: 60 },
        gap: { type: 'number', label: 'Boşluk (px)', min: 0, max: 60 },
        ...layoutFields(),
      },
      defaultProps: { img1: '', img2: '', img3: '', alt: '', rounded: 12, gap: 16 },
      render: (props: any) => <ImageGalleryBlock {...props} />,
    },
    TagCloudBlock: {
      label: 'Etiket Bulutu',
      fields: {
        tags: { type: 'textarea', label: 'Etiketler (virgülle ayır)', placeholder: 'Next.js, TypeScript, AI' },
        color: { type: 'text', label: 'Renk (hex, opsiyonel)' },
        ...typeFields(),
        ...layoutFields(),
      },
      defaultProps: { tags: 'Next.js, TypeScript, AI', palette: 'inherit' },
      render: (props: any) => <TagCloudBlock {...props} />,
    },
  },
}

/** Sample starting content for the user to build a new page. */
export const SAMPLE_DATA = {
  root: { props: { title: 'TARNAK' } },
  content: [
    {
      type: 'HeroBlock',
      props: { id: 'hero-1', name: 'TARIK ELER — TARNAK', tagline: 'Yazılımcı & Sistem Mimarisi', description: 'Next.js, TypeScript ve yapay zeka ile modern web deneyimleri üretiyorum. Tasarımdan deploy’a kadar her şeyi bu editörden yönetebilirsiniz.', palette: 'inherit' },
    },
    {
      type: 'HeadingBlock',
      props: { id: 'baslik-1', text: 'Hoş Geldiniz', level: 'h2', align: 'center', palette: 'inherit' },
    },
    {
      type: 'ParagraphBlock',
      props: { id: 'paragraf-1', text: 'Bu sayfa görsel düzenleyici ile oluşturuldu. Soldaki panelden yeni bileşen ekleyebilir, her bileşene tıklayıp sağdaki panelden renk, font, boyut ve konumunu değiştirebilirsiniz.', size: 'lg', align: 'center', palette: 'inherit' },
    },
    {
      type: 'ButtonBlock',
      props: { id: 'buton-1', label: 'Projelerimi Gör', href: '/projects', variant: 'primary', size: 'lg', align: 'center', radius: 12 },
    },
    {
      type: 'StatsBlock',
      props: { id: 'istatistik-1', rows: '5+ | Yıl deneyim\n120+ | Proje\n50K+ | Kullanıcı', size: 'md', palette: 'inherit' },
    },
    {
      type: 'QuoteBlock',
      props: { id: 'alinti-1', text: 'En iyi kod, hiç yazılmamış olandır.', author: 'Ponytail', align: 'center', palette: 'inherit' },
    },
    {
      type: 'TagCloudBlock',
      props: { id: 'etiket-1', tags: 'Next.js, React, TypeScript, Node.js, Python, AI', palette: 'inherit' },
    },
  ],
  zones: {},
}

export function isKnownComponent(type: string): boolean {
  return ALL_COMPONENTS.includes(type)
}
