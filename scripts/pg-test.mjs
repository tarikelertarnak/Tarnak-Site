import pg from 'pg'

const ref = 'jorlmqlnnplhoimxxgze'
const pw = process.env.SUPABASE_DB_PW || 'DQ6LyrM3eqwlxXbNFn95zOsR'

const hosts = [
  `aws-0-ap-northeast-2.pooler.supabase.com`,
  `db.${ref}.supabase.co`,
]

for (const host of hosts) {
  const client = new pg.Client({
    host,
    port: host.includes('pooler') ? 6543 : 5432,
    user: host.includes('pooler') ? `postgres.${ref}` : 'postgres',
    password: pw,
    database: 'postgres',
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 10000,
  })
  try {
    await client.connect()
    const res = await client.query('SELECT version()')
    console.log(`OK ${host}: ${res.rows[0].version.slice(0, 60)}`)
    await client.end()
    process.exit(0)
  } catch (e) {
    console.log(`FAIL ${host}: ${e.message.slice(0, 120)}`)
  }
}
process.exit(1)
