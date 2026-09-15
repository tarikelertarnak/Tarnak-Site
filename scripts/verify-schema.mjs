import pg from 'pg'
import { config as loadEnv } from 'dotenv'
import { resolve } from 'node:path'

loadEnv({ path: resolve(process.cwd(), '.env.local') })

const ref = 'jorlmqlnnplhoimxxgze'
const pw = process.env.SUPABASE_DB_PW

if (!pw) {
  console.error('SUPABASE_DB_PW ortam değişkeni gerekli (ayrıca .env dosyasından yükleyin).')
  process.exit(1)
}

const client = new pg.Client({
  host: 'aws-0-ap-northeast-2.pooler.supabase.com',
  port: 6543,
  user: `postgres.${ref}`,
  password: pw,
  database: 'postgres',
  // Yerel ortamda SSL interception olduğu için sertifika doğrulaması kapatıldı.
  // Şifre kod içinde DEĞİL, yalnızca env'de; script gitignore'da.
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 15000,
})

await client.connect()

// Tabloları listele
const tables = await client.query(`select tablename from pg_tables where schemaname = 'public' order by tablename`)
console.log('TABLOLAR:', tables.rows.map(r => r.tablename).join(', '))

// Sayıları
for (const t of ['profiles', 'messages', 'posts', 'projects', 'skills', 'stats']) {
  const r = await client.query(`select count(*) c from public.${t}`)
  console.log(`${t}: ${r.rows[0].c} satır`)
}

// Skills örneği
const sk = await client.query(`select label, level, years from public.skills order by sort_order limit 3`)
console.log('SKILL ÖRNEK:', sk.rows)

// RLS durumu
const rls = await client.query(`select relname, relrowsecurity from pg_class where relname in ('profiles','messages','posts','projects','skills','stats') and relnamespace = 'public'::regnamespace`)
console.log('RLS:', rls.rows.map(r => `${r.relname}=${r.relrowsecurity}`).join(', '))

await client.end()
