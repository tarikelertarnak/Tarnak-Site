/**
 * Teknoloji -> Iconify ikon eslemesi.
 *
 * Admin panelinde "Yetenekler" kaynaginda `icon` alani serbest metin —
 * kullanicinin her teknoloji icin dogru Iconify ikon adini hatirlamasini
 * bekleyemeyiz. Bu katalog `logos:` ve `mdi:` setlerinden yaygin
 * teknolojileri esler; admin bileseni bir arama kutusu gosterir.
 *
 * Kullanım:
 *   import { TECH_ICONS, findTechIcon } from '@/lib/tech-icons'
 *   // Bul: findTechIcon('nextjs') -> 'logos:nextjs-icon'
 *   // Listele: TECH_ICONS (sirali, etiketli)
 *
 * Ekleme: yeni teknoloji icin [anahtar, ikonAdi] ikilisi ekle.
 * Anahtar kucuk harf, otomatik normallestirilir (bosluk/tire yok).
 */

export interface TechIcon {
  /** Kucuk harf anahtar (aranirken kullanilir) */
  key: string
  /** Gosterilen etiket */
  label: string
  /** Iconify ikon adi */
  icon: string
}

/** Teknoloji -> ikon eslemesi. Alfebetik sirada. */
export const TECH_ICONS: readonly TechIcon[] = [
  { key: 'angular', label: 'Angular', icon: 'logos:angular-icon' },
  { key: 'arduino', label: 'Arduino', icon: 'logos:arduino' },
  { key: 'aws', label: 'AWS', icon: 'logos:aws' },
  { key: 'azure', label: 'Azure', icon: 'logos:microsoft-azure' },
  { key: 'bootstrap', label: 'Bootstrap', icon: 'logos:bootstrap' },
  { key: 'c', label: 'C', icon: 'logos:c' },
  { key: 'cpp', label: 'C++', icon: 'logos:c-plusplus' },
  { key: 'csharp', label: 'C#', icon: 'logos:c-sharp' },
  { key: 'css', label: 'CSS', icon: 'logos:css-3' },
  { key: 'cloudflare', label: 'Cloudflare', icon: 'logos:cloudflare' },
  { key: 'dart', label: 'Dart', icon: 'logos:dart' },
  { key: 'deno', label: 'Deno', icon: 'logos:deno' },
  { key: 'docker', label: 'Docker', icon: 'logos:docker-icon' },
  { key: 'dotnet', label: '.NET', icon: 'logos:dotnet' },
  { key: 'electron', label: 'Electron', icon: 'logos:electron' },
  { key: 'express', label: 'Express', icon: 'simple-icons:express' },
  { key: 'figma', label: 'Figma', icon: 'logos:figma' },
  { key: 'firebase', label: 'Firebase', icon: 'logos:firebase' },
  { key: 'flask', label: 'Flask', icon: 'simple-icons:flask' },
  { key: 'flutter', label: 'Flutter', icon: 'logos:flutter' },
  { key: 'git', label: 'Git', icon: 'logos:git-icon' },
  { key: 'github', label: 'GitHub', icon: 'logos:github-icon' },
  { key: 'githubactions', label: 'GitHub Actions', icon: 'logos:github-actions' },
  { key: 'go', label: 'Go', icon: 'logos:go' },
  { key: 'graphql', label: 'GraphQL', icon: 'logos:graphql' },
  { key: 'html', label: 'HTML', icon: 'logos:html-5' },
  { key: 'java', label: 'Java', icon: 'logos:java' },
  { key: 'javascript', label: 'JavaScript', icon: 'logos:javascript' },
  { key: 'jest', label: 'Jest', icon: 'logos:jest' },
  { key: 'kotlin', label: 'Kotlin', icon: 'logos:kotlin-icon' },
  { key: 'kubernetes', label: 'Kubernetes', icon: 'logos:kubernetes' },
  { key: 'linux', label: 'Linux', icon: 'logos:linux-tux' },
  { key: 'lua', label: 'Lua', icon: 'logos:lua' },
  { key: 'mongodb', label: 'MongoDB', icon: 'logos:mongodb-icon' },
  { key: 'mysql', label: 'MySQL', icon: 'logos:mysql' },
  { key: 'nextjs', label: 'Next.js', icon: 'logos:nextjs-icon' },
  { key: 'nginx', label: 'Nginx', icon: 'logos:nginx' },
  { key: 'nodejs', label: 'Node.js', icon: 'logos:nodejs-icon' },
  { key: 'npm', label: 'npm', icon: 'logos:npm-icon' },
  { key: 'openai', label: 'OpenAI', icon: 'logos:openai' },
  { key: 'postgresql', label: 'PostgreSQL', icon: 'logos:postgresql' },
  { key: 'prettier', label: 'Prettier', icon: 'logos:prettier' },
  { key: 'prisma', label: 'Prisma', icon: 'logos:prisma' },
  { key: 'python', label: 'Python', icon: 'logos:python' },
  { key: 'react', label: 'React', icon: 'logos:react' },
  { key: 'redis', label: 'Redis', icon: 'logos:redis' },
  { key: 'redux', label: 'Redux', icon: 'logos:redux' },
  { key: 'rust', label: 'Rust', icon: 'logos:rust' },
  { key: 'sass', label: 'Sass', icon: 'logos:sass' },
  { key: 'sentry', label: 'Sentry', icon: 'logos:sentry' },
  { key: 'sql', label: 'SQL', icon: 'logos:sql-developer' },
  { key: 'sqlite', label: 'SQLite', icon: 'logos:sqlite' },
  { key: 'storybook', label: 'Storybook', icon: 'logos:storybook' },
  { key: 'supabase', label: 'Supabase', icon: 'logos:supabase-icon' },
  { key: 'swift', label: 'Swift', icon: 'logos:swift' },
  { key: 'tailwindcss', label: 'Tailwind CSS', icon: 'logos:tailwindcss-icon' },
  { key: 'typescript', label: 'TypeScript', icon: 'logos:typescript-icon' },
  { key: 'vercel', label: 'Vercel', icon: 'logos:vercel-icon' },
  { key: 'vite', label: 'Vite', icon: 'logos:vitejs' },
  { key: 'vitest', label: 'Vitest', icon: 'logos:vitest' },
  { key: 'vue', label: 'Vue', icon: 'logos:vue' },
  { key: 'vuedotjs', label: 'Vue.js', icon: 'logos:vue' },
  { key: 'webpack', label: 'Webpack', icon: 'logos:webpack' },
  { key: 'wordpress', label: 'WordPress', icon: 'logos:wordpress-icon' },
  { key: 'yarn', label: 'Yarn', icon: 'logos:yarn' },
  { key: 'zod', label: 'Zod', icon: 'simple-icons:zod' },
]

/**
 * Verilen teknoloji adi icin ikon bulur.
 * Oncelik: tam eslesme -> normallestirilmis eslesme -> kismi eslesme.
 *
 * Ornekler:
 *   findTechIcon('nextjs')        -> 'logos:nextjs-icon'
 *   findTechIcon('Next.js')      -> 'logos:nextjs-icon'
 *   findTechIcon('python 3')     -> 'logos:python'
 *   findTechIcon('something')    -> undefined
 */
export function findTechIcon(name: string): string | undefined {
  if (!name) return undefined
  const normalized = name.toLowerCase().replace(/[\s._-]+/g, '')

  // Tam eslesme
  const exact = TECH_ICONS.find(t => t.key === normalized)
  if (exact) return exact.icon

  // Iceren eslesme (or. "python 3" -> "python")
  const partial = TECH_ICONS.find(t =>
    t.key.includes(normalized) || normalized.includes(t.key),
  )
  return partial?.icon
}
