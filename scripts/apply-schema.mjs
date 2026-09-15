import pg from 'pg'
import { readFileSync } from 'node:fs'
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
const sql = readFileSync(new URL('./schema.sql', import.meta.url), 'utf8')
try {
  await client.query(sql)
  console.log('SCHEMA OK')
} catch (e) {
  console.log('SCHEMA ERROR:', e.message)
  process.exitCode = 1
}
await client.end()
