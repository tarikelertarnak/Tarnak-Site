/**
 * Inline SVG icons — always render, unaffected by Iconify CDN/hydration differences.
 * (Fixes the wrong-icon-in-search-inputs issue: instead of Iconify, which shows
 * an empty/broken image when the CDN icon fails to load, these icons are used.)
 */

interface IconProps {
  size?: number
  className?: string
}

function base(size: number, className?: string) {
  return {
    'width': size,
    'height': size,
    'viewBox': '0 0 24 24',
    'fill': 'none',
    'stroke': 'currentColor',
    'strokeWidth': 2,
    'strokeLinecap': 'round',
    'strokeLinejoin': 'round',
    className,
    'aria-hidden': true,
  } as const
}

function fillBase(size: number, className?: string) {
  return {
    'width': size,
    'height': size,
    'viewBox': '0 0 24 24',
    'fill': 'currentColor',
    className,
    'aria-hidden': true,
  } as const
}

export function SearchIcon({ size = 16, className }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <circle cx="11" cy="11" r="7" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  )
}

export function SortAscendingIcon({ size = 16, className }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <path d="M4 6h12" />
      <path d="M4 12h8" />
      <path d="M4 18h4" />
      <path d="m16 9 3-3 3 3" />
      <path d="M19 6v11" />
    </svg>
  )
}

export function SortDescendingIcon({ size = 16, className }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <path d="M4 6h12" />
      <path d="M4 12h8" />
      <path d="M4 18h4" />
      <path d="m16 15 3 3 3-3" />
      <path d="M19 7v11" />
    </svg>
  )
}

export function MenuIcon({ size = 22, className }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <path d="M4 6h16" />
      <path d="M4 12h16" />
      <path d="M4 18h16" />
    </svg>
  )
}

export function CloseIcon({ size = 22, className }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <path d="M6 6l12 12" />
      <path d="M18 6L6 18" />
    </svg>
  )
}

export function ArrowDownIcon({ size = 18, className }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <path d="M12 5v14" />
      <path d="m19 12-7 7-7-7" />
    </svg>
  )
}

export function ChevronUpIcon({ size = 20, className }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <path d="m6 15 6-6 6 6" />
    </svg>
  )
}

export function ChevronDownIcon({ size = 18, className }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <path d="m6 9 6 6 6-6" />
    </svg>
  )
}

export function ChevronRightIcon({ size = 18, className }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <path d="m9 6 6 6-6 6" />
    </svg>
  )
}

export function ArrowUpRightIcon({ size = 14, className }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <path d="M7 17 17 7" />
      <path d="M8 7h9v9" />
    </svg>
  )
}

/** Enlarge (expand) — four-direction expand icon, provided by the user. */
export function MaximizeIcon({ size = 24, className }: IconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size * (666 / 680)}
      height={size}
      viewBox="0 0 666 680"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="m338 272l70 69c4 4 8 6 14 6c5 0 9-2 13-6l119-118l72 72c23 22 40 13 40-18V51c0-19-16-37-38-37H402c-32 0-40 17-17 40l72 72l-119 118c-3 4-5 9-5 14c0 6 2 10 5 14M0 416v227c0 19 16 37 38 37h225c32 0 41-17 18-40l-72-72l119-119c3-4 5-8 5-14c0-5-2-9-5-13l-70-70c-4-3-8-5-14-5c-5 0-10 2-14 5L112 471l-72-72c-23-22-40-14-40 17" />
    </svg>
  )
}

export function EyeIcon({ size = 13, className }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  )
}

/** Eye closed — the "hide" state of the password show/hide toggle. */
export function EyeOffIcon({ size = 13, className }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <path d="M10.733 5.076a10.744 10.744 0 0 1 11.205 6.575 1 1 0 0 1 0 .696 10.747 10.747 0 0 1-1.444 2.49" />
      <path d="M14.084 14.158a3 3 0 0 1-4.242-4.242" />
      <path d="M17.479 17.499a10.75 10.75 0 0 1-15.417-5.151 1 1 0 0 1 0-.696 10.75 10.75 0 0 1 4.446-5.143" />
      <path d="m2 2 20 20" />
    </svg>
  )
}

/** Watch / notification bell — so it is not confused with the eye (EyeIcon). */
export function BellIcon({ size = 13, className }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
      <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
    </svg>
  )
}

/** Fork icon (branch with brackets). */
export function ForkIcon({ size = 13, className }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <circle cx="6" cy="18" r="3" />
      <circle cx="18" cy="6" r="3" />
      <circle cx="18" cy="18" r="3" />
      <path d="M18 9v2a2 2 0 0 1-2 2H8a2 2 0 0 0-2 2v2" />
      <path d="M9 6h9" />
    </svg>
  )
}

export function DownloadIcon({ size = 13, className }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <path d="m7 10 5 5 5-5" />
      <path d="M12 15V3" />
    </svg>
  )
}

export function ChatIcon({ size = 18, className }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <path d="M21 12a8 8 0 0 1-8 8H5l-2 2V12a8 8 0 0 1 8-8h2a8 8 0 0 1 8 8Z" />
      <path d="M8 11h8" />
      <path d="M8 14h5" />
    </svg>
  )
}

export function CheckIcon({ size = 16, className }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <path d="M20 6 9 17l-5-5" />
    </svg>
  )
}

export function CogIcon({ size = 18, className }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" />
    </svg>
  )
}

export function SunIcon({ size = 16, className }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2" />
      <path d="M12 20v2" />
      <path d="m4.93 4.93 1.41 1.41" />
      <path d="m17.66 17.66 1.41 1.41" />
      <path d="M2 12h2" />
      <path d="M20 12h2" />
      <path d="m6.34 17.66-1.41 1.41" />
      <path d="m19.07 4.93-1.41 1.41" />
    </svg>
  )
}

export function MoonIcon({ size = 16, className }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
    </svg>
  )
}

export function ThemeSystemIcon({ size = 16, className }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <rect x="2" y="3" width="20" height="14" rx="2" />
      <path d="M8 21h8" />
      <path d="M12 17v4" />
    </svg>
  )
}

export function TranslateIcon({ size = 16, className }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <path d="M5 8h14" />
      <path d="M12 3v5" />
      <path d="M7 8a6 6 0 0 0 4 7" />
      <path d="M5 16a10 10 0 0 0 5-5" />
      <path d="M14 13c.8 1.9 2.3 3.5 4 4.5" />
      <path d="M18 19c.5-1 .8-2.1 1-3.2" />
    </svg>
  )
}

export function FileIcon({ size = 16, className }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
      <path d="M14 2v4a2 2 0 0 0 2 2h4" />
      <path d="M9 13h6" />
      <path d="M9 17h3" />
    </svg>
  )
}

export function PaperclipIcon({ size = 16, className }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48" />
    </svg>
  )
}

export function UserPlusIcon({ size = 16, className }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <circle cx="12" cy="8" r="4" />
      <path d="M5 21v-2a5 5 0 0 1 5-5h4a5 5 0 0 1 5 5v2" />
      <path d="M19 8v6" />
      <path d="M16 11h6" />
    </svg>
  )
}

export function GithubIcon({ size = 18, className }: IconProps) {
  return (
    <svg {...fillBase(size, className)}>
      <path d="M12 2C6.48 2 2 6.58 2 12.25c0 4.53 2.87 8.37 6.84 9.73.5.1.68-.22.68-.49l-.01-1.7c-2.78.62-3.37-1.37-3.37-1.37-.45-1.18-1.11-1.49-1.11-1.49-.91-.64.07-.63.07-.63 1.01.07 1.54 1.06 1.54 1.06.9 1.57 2.35 1.12 2.92.86.09-.67.35-1.12.63-1.38-2.22-.26-4.56-1.14-4.56-5.06 0-1.12.39-2.03 1.03-2.75-.1-.26-.45-1.3.1-2.7 0 0 .84-.28 2.75 1.05a9.36 9.36 0 0 1 5.01 0c1.9-1.33 2.74-1.05 2.74-1.05.55 1.4.2 2.44.1 2.7.64.72 1.03 1.63 1.03 2.75 0 3.93-2.34 4.8-4.57 5.05.36.32.68.94.68 1.9l-.01 2.82c0 .27.18.6.69.49A10.02 10.02 0 0 0 22 12.25C22 6.58 17.52 2 12 2Z" />
    </svg>
  )
}

export function LoginIcon({ size = 16, className }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
      <path d="m10 17 5-5-5-5" />
      <path d="M15 12H3" />
    </svg>
  )
}

export function LogoutIcon({ size = 18, className }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <path d="m16 17 5-5-5-5" />
      <path d="M21 12H9" />
    </svg>
  )
}

export function ShieldIcon({ size = 16, className }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1Z" />
      <path d="M13 10 9.4 13.6" />
      <path d="m10.8 13.2.4-.4" />
      <path d="M13.5 8.5l.5-.5" />
    </svg>
  )
}

export function StarIcon({ size = 16, className }: IconProps) {
  return (
    <svg {...fillBase(size, className)}>
      <path d="M12 2.5l2.95 6.2 6.55.85-4.85 4.6 1.25 6.55L12 17.6l-5.9 3.1 1.25-6.55L2.5 9.55l6.55-.85L12 2.5Z" />
    </svg>
  )
}

export function StarOutlineIcon({ size = 16, className }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M12 2.5l2.95 6.2 6.55.85-4.85 4.6 1.25 6.55L12 17.6l-5.9 3.1 1.25-6.55L2.5 9.55l6.55-.85L12 2.5Z" />
    </svg>
  )
}

/** Experience/CV icon (active project, folder). */
export function BriefcaseIcon({ size = 16, className }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <path d="M4 8h18v2h10V4 4h18v1h12M10 3v4h6M5 3v1" />
      <path d="M4 8l12 10h8M10 5v7h7M12 5v6h8V6 2h11M5 3v3" />
    </svg>
  )
}

/** Education icon (diploma + mortarboard). */
export function SchoolIcon({ size = 16, className }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <path d="M5 8h14v3h4M4 5h10v2h9V3 3h12v1h7M4 4h5v2h8" />
      <path d="M6 6h8M3 3v11h4v5h9V6 1h10V4 2l2 0h5" />
    </svg>
  )
}

/** Error/fly icon (cloud + exclamation point). */
export function CloudAlertIcon({ size = 18, className }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <path d="M5 11h10v4h7M3 8h6v7h6M7 7h3v6h5M3 6h4v5h9M14 9h3v4h3M10 8h3v4h4M10 6h6v4h3" />
      <path d="M5 8l9 5M7 8l6 5M8 8l4 4M10 9l5 4M12 9l3 4" />
    </svg>
  )
}

/** Fork / branching icon. */
export function SourceForkIcon({ size = 16, className }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <path d="M3 5c.8 11.4-1 16.5 3.2-3.2 0-3.2-3.2 3.2 4.8-1.7 8-3.2.2-9.5 9-11.3-3.5 8" transform="translate(6 3)" />
      <path d="M4 3h4v6h5M14 3h4v5h4M3 3v10h3v6M19 3v10h3v6Z" />
    </svg>
  )
}

/** Refresh icon. */
export function RefreshIcon({ size = 16, className }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <path d="M18 4l18 0M3 12l15 0M9 4l9 0M14 8l14 0Z" />
    </svg>
  )
}

/** Back arrow / arrow icon. */
export function ArrowLeftIcon({ size = 16, className }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <path d="M18 4l18 0M3 12l18 0M5 8h20M12 8h5" />
    </svg>
  )
}

/** Error badge (circle + exclamation point). */
export function ErrorIcon({ size = 16, className }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <circle cx="12" cy="12" r="10" />
      <path d="M9.8 7.3a5.2 6.7-6.7 6.7-6.7l11.8-6.7 4.3-9.2-3.5.2-3.5-4.4M7.8 12v4" />
    </svg>
  )
}

/** Send / paper-plane icon. */
export function SendIcon({ size = 18, className }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <path d="M22 2 11 13" />
      <path d="M22 2 15 22l-4-9-9-4 20-7Z" />
    </svg>
  )
}

/** Thumbs-up icon. */
export function ThumbUpIcon({ size = 16, className }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <path d="M7 10v12" />
      <path d="M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2a3.13 3.13 0 0 1 3 3.88Z" />
    </svg>
  )
}

/** Alphabetical sort icon. */
export function SortAlphaIcon({ size = 16, className }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <path d="M8 3v13l8 0V4 7h6V7 10h6V11 3h6V12 7h6V14 7l-6 0" />
    </svg>
  )
}

/** Update / version icon. */
export function UpdateIcon({ size = 16, className }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <path d="M4 5h2.5v6.2h2.5M5 4.5h3.5M4 8h5M6 5.5h5V3 3.8c.4.7-.2.2.5 1.3M7 6c.3 1.3-.1.4.4 1.2M7 3.8c-.2 1-1.5.3 0 2.3M3 5.5c.6.9-.2.6.2.4M9 6c0-.8-.7.3.2.6M7 7c-.2.6-1.3.3.2.3" />
      <path d="M8 7l4 3 3-2-5-.5-1-.5-1-3-4-3 6" />
    </svg>
  )
}

export function socialIcon(name: string, size: number, className?: string) {
  switch (name) {
    case 'mdi:github':
      return <GithubIcon size={size} className={className} />
    case 'mdi:instagram':
      return (
        <svg {...base(size, className)}>
          <rect x="3" y="3" width="18" height="18" rx="5" />
          <circle cx="12" cy="12" r="4" />
          <circle cx="17.5" cy="6.5" r="0.5" fill="currentColor" />
        </svg>
      )
    case 'mdi:youtube':
      return (
        <svg {...fillBase(size, className)}>
          <path d="M22.5 7.2a3 3 0 0 0-2.1-2.1C18.6 4.6 12 4.6 12 4.6s-6.6 0-8.4.5A3 3 0 0 0 1.5 7.2 31 31 0 0 0 1 12a31 31 0 0 0 .5 4.8 3 3 0 0 0 2.1 2.1c1.8.5 8.4.5 8.4.5s6.6 0 8.4-.5a3 3 0 0 0 2.1-2.1A31 31 0 0 0 23 12a31 31 0 0 0-.5-4.8ZM9.75 15.02V8.98L15.5 12l-5.75 3.02Z" />
        </svg>
      )
    case 'ic:baseline-tiktok':
      return (
        <svg {...fillBase(size, className)}>
          <path d="M16.6 5.82a4.28 4.28 0 0 1-1.13-2.32h-3.06v11.9a2.53 2.53 0 1 1-2.53-2.53c.26 0 .51.04.75.12V9.9a5.62 5.62 0 0 0-.75-.05 5.62 5.62 0 1 0 5.62 5.62V9.9a7.3 7.3 0 0 0 4.33 1.43V8.27a4.28 4.28 0 0 1-3.23-2.45Z" />
        </svg>
      )
    case 'mdi:twitter':
    case 'mdi:x':
      return <XIcon size={size} className={className} />
    case 'mdi:linkedin':
      return <LinkedInIcon size={size} className={className} />
    case 'mdi:telegram':
    case 'mdi:send':
      return <TelegramIcon size={size} className={className} />
    case 'mdi:discord':
      return <DiscordIcon size={size} className={className} />
    case 'mdi:link':
      return <LinkIcon size={size} className={className} />
    default:
      return null
  }
}

/** Sound / speaker icon. */
export function VolumeIcon({ size = 16, className }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
      <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
      <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
    </svg>
  )
}

/** Folder icon — 3D package/box. */
export function FolderIcon({ size = 18, className }: IconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 512 512"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="m85.333 160.617l128-74l.043.025L256 62l-42.667-24.666L42.667 136v197.333L85.333 358zm87.581 23.701l104.419-60.367l104.43 60.373l-104.419 60.368zm-23.581 35.651V346.05L256 407.716v-126.08zm256 126.081l-106.667 61.666V281.649l106.667-61.667zm-128-271.383L448 173.333v197.334l-170.667 98.667l-170.666-98.667V173.333z"
      />
    </svg>
  )
}

/** Home icon. */
export function HouseIcon({ size = 18, className }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  )
}

/** Newspaper icon. */
export function NewspaperIcon({ size = 18, className }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2" />
      <path d="M18 14h-8M15 18h-5M10 6h8v4h-8z" />
    </svg>
  )
}

/** Globe / world icon. */
export function GlobeIcon({ size = 18, className }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <circle cx="12" cy="12" r="10" />
      <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" />
      <path d="M2 12h20" />
    </svg>
  )
}

/** Refresh / circular arrow icon (for animations). */
export function RefreshCwIcon({ size = 16, className }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <path d="M21 12a9 9 0 1 1-3-6.7" />
      <polyline points="21 3 21 9 15 9" />
    </svg>
  )
}

/** Recycle / reset icon. */
export function RotateCcwIcon({ size = 16, className }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <path d="M3 2v6h6" />
      <path d="M3 13a9 9 0 1 0 3-7.7L3 8" />
    </svg>
  )
}

/** User / person icon. */
export function UserIcon({ size = 16, className }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  )
}

/** Heart icon (support/like). */
export function HeartIcon({ size = 16, className }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78Z" />
    </svg>
  )
}

/** Copy icon (two stacked squares). */
export function CopyIcon({ size = 16, className }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  )
}

/** Crown icon (king/admin). */
export function CrownIcon({ size = 16, className }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <path d="M2 7l5 5 5-9 5 9 5-5-2 12H4L2 7Z" />
      <path d="M5 19v2M19 19v2" />
    </svg>
  )
}

/** Code icon (square brackets). */
export function CodeIcon({ size = 16, className }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <polyline points="16 18 22 12 16 6" />
      <polyline points="8 6 2 12 8 18" />
    </svg>
  )
}

/** Palette icon (design/content). */
export function PaletteIcon({ size = 16, className }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <circle cx="13.5" cy="6.5" r="0.5" fill="currentColor" />
      <circle cx="17.5" cy="10.5" r="0.5" fill="currentColor" />
      <circle cx="8.5" cy="7.5" r="0.5" fill="currentColor" />
      <circle cx="6.5" cy="12.5" r="0.5" fill="currentColor" />
      <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.83 0 1.5-.67 1.5-1.5 0-.39-.15-.74-.39-1.01-.23-.26-.38-.61-.38-.99 0-.83.67-1.5 1.5-1.5H16c3.31 0 6-2.69 6-6 0-5.5-4.5-10-10-10Z" />
    </svg>
  )
}

/** Turkish flag (circular). */
export function FlagTrIcon({ size = 16, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 512 512" fill="none" className={className} aria-hidden="true">
      <mask id="svgt-flagtr">
        <circle cx="256" cy="256" r="256" fill="#fff" />
      </mask>
      <g mask="url(#svgt-flagtr)">
        <path fill="#d80027" d="M0 0h512v512H0z" />
        <g fill="#eee">
          <path d="m350 182l33 46l54-18l-33 46l33 46l-54-18l-33 46v-57l-54-17l54-18z" />
          <path d="M260 370a114 114 0 1 1 54-215a141 141 0 1 0 0 202c-17 9-35 13-54 13" />
        </g>
      </g>
    </svg>
  )
}

/** English flag (circular, Union Jack). */
export function FlagEnIcon({ size = 16, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 512 512" fill="none" className={className} aria-hidden="true">
      <mask id="svgt-flagen">
        <circle cx="256" cy="256" r="256" fill="#fff" />
      </mask>
      <g mask="url(#svgt-flagen)">
        <path
          fill="#eee"
          d="m0 0l8 22l-8 23v23l32 54l-32 54v32l32 48l-32 48v32l32 54l-32 54v68l22-8l23 8h23l54-32l54 32h32l48-32l48 32h32l54-32l54 32h68l-8-22l8-23v-23l-32-54l32-54v-32l-32-48l32-48v-32l-32-54l32-54V0l-22 8l-23-8h-23l-54 32l-54-32h-32l-48 32l-48-32h-32l-54 32L68 0z"
        />
        <path
          fill="#0052b4"
          d="M336 0v108L444 0Zm176 68L404 176h108zM0 176h108L0 68ZM68 0l108 108V0Zm108 512V404L68 512ZM0 444l108-108H0Zm512-108H404l108 108Zm-68 176L336 404v108z"
        />
        <path
          fill="#d80027"
          d="M0 0v45l131 131h45zm208 0v208H0v96h208v208h96V304h208v-96H304V0zm259 0L336 131v45L512 0zM176 336L0 512h45l131-131zm160 0l176 176v-45L381 336z"
        />
      </g>
    </svg>
  )
}

/** Auto-detect icon (world grid). */
export function AutoIcon({ size = 16, className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.5}
      className={className}
      aria-hidden="true"
    >
      <path d="M2 12c0 5.523 4.477 10 10 10s10-4.477 10-10S17.523 2 12 2S2 6.477 2 12" />
      <path d="M13 2.05S16 6 16 12s-3 9.95-3 9.95m-2 0S8 18 8 12s3-9.95 3-9.95M2.63 15.5h18.74m-18.74-7h18.74" />
    </svg>
  )
}

/** Chain / link icon. */
export function LinkIcon({ size = 16, className }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </svg>
  )
}

/** Terminal / command-line icon. */
export function TerminalIcon({ size = 16, className }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <polyline points="4 17 10 11 4 5" />
      <line x1="12" y1="19" x2="20" y2="19" />
    </svg>
  )
}

/** Laptop icon. */
export function LaptopIcon({ size = 16, className }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <rect x="4" y="4" width="16" height="12" rx="2" />
      <path d="M2 20h20" />
    </svg>
  )
}

/** Game controller icon. */
export function GamepadIcon({ size = 16, className }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <path d="M6 11h4M8 9v4" />
      <path d="M15 12h.01M18 10h.01" />
      <path d="M17.32 5H6.68a4 4 0 0 0-3.97 3.57c-.13 1.36.25 2.72 1.06 3.8L6 16v3a1 1 0 0 0 1 1h3a1 1 0 0 0 1-1v-1h2v1a1 1 0 0 0 1 1h3a1 1 0 0 0 1-1v-3l2.23-3.63c.81-1.08 1.19-2.44 1.06-3.8A4 4 0 0 0 17.32 5Z" />
    </svg>
  )
}

/** Dumbbell / fitness icon. */
export function DumbbellIcon({ size = 16, className }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <path d="M4 8v8M8 4v16M12 6v12M16 4v16M20 8v8" />
    </svg>
  )
}

/** Music note icon. */
export function MusicIcon({ size = 16, className }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <path d="M9 18V5l12-2v13" />
      <circle cx="6" cy="18" r="3" />
      <circle cx="18" cy="16" r="3" />
    </svg>
  )
}

/** X (Twitter) icon. */
export function XIcon({ size = 16, className }: IconProps) {
  return (
    <svg {...fillBase(size, className)}>
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  )
}

/** LinkedIn icon. */
export function LinkedInIcon({ size = 16, className }: IconProps) {
  return (
    <svg {...fillBase(size, className)}>
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.225 0z" />
    </svg>
  )
}

/** Telegram icon. */
export function TelegramIcon({ size = 16, className }: IconProps) {
  return (
    <svg {...fillBase(size, className)}>
      <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
    </svg>
  )
}

/** Discord icon. */
export function DiscordIcon({ size = 16, className }: IconProps) {
  return (
    <svg {...fillBase(size, className)}>
      <path d="M20.317 4.37a19.79 19.79 0 0 0-4.885-1.515a.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0a12.64 12.64 0 0 0-.617-1.25a.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057a19.9 19.9 0 0 0 5.993 3.03a.078.078 0 0 0 .084-.028a14.09 14.09 0 0 0 1.226-1.994a.076.076 0 0 0-.041-.106a13.107 13.107 0 0 1-1.872-.892a.077.077 0 0 1-.008-.128a10.2 10.2 0 0 0 .372-.292a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127a12.299 12.299 0 0 1-1.873.892a.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028a19.839 19.839 0 0 0 6.002-3.03a.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.956-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.955-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.946 2.418-2.157 2.418z" />
    </svg>
  )
}
