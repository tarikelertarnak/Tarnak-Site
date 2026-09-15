import pg from 'pg'

const ref = 'jorlmqlnnplhoimxxgze'
const pw = process.env.SUPABASE_DB_PW || 'DQ6LyrM3eqwlxXbNFn95zOsR'

const client = new pg.Client({
  host: 'aws-0-ap-northeast-2.pooler.supabase.com',
  port: 6543,
  user: `postgres.${ref}`,
  password: pw,
  database: 'postgres',
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 15000,
})

await client.connect()

// auth.config tablosu var mı?
const t = await client.query(`select 1 from information_schema.tables where table_schema='auth' and table_name='config'`)
console.log('auth.config var mı:', t.rowCount > 0)

if (t.rowCount > 0) {
  const cur = await client.query(`select * from auth.config`)
  console.log('mevcut config:', JSON.stringify(cur.rows[0], null, 1).slice(0, 500))
}

await client.end()
