import { timingSafeEqual } from 'node:crypto'
import bcrypt from 'bcryptjs'
import { cookies } from 'next/headers'
import { getAdmin } from '@/lib/content'

const SESSION_COOKIE = 'admin_session'
const SESSION_MAX_AGE = 60 * 60 * 24 * 7

/**
 * Bcrypt cost factor. 12 ≈ 250ms/hash on modern CPUs; balanced.
 * Upgrade: measure with load testing, login should not exceed 10s.
 */
const BCRYPT_COST = 12

function getSecret(): string {
  const secret = process.env.ADMIN_SECRET
  if (!secret) {
    throw new Error('ADMIN_SECRET ortam değişkeni ayarlanmamış — legacy oturum imzası kullanılamaz.')
  }
  return secret
}

/**
 * Bcrypt password hashing. ~10.000x stronger than SHA-256
 * (against rainbow table + GPU attacks).
 *
 * Migration: SHA-256 hashes don't start with a "$2" prefix; verifyPassword
 * automatically migrates to bcrypt on first login (rehash on login).
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_COST)
}

/**
 * Bcrypt verification — also accepts legacy SHA-256 hashes
 * (backward compatibility, rehash on first successful login).
 */
export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  if (storedHash.startsWith('$2')) {
    return bcrypt.compare(password, storedHash)
  }
  // Legacy SHA-256 fallback — migrate to new hash
  const sha = await import('node:crypto').then(m =>
    m.createHash('sha256').update(password).digest('hex'),
  )
  return safeEqual(sha, storedHash)
}

function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a)
  const bufB = Buffer.from(b)
  if (bufA.length !== bufB.length) {
    return false
  }
  return timingSafeEqual(bufA, bufB)
}

export async function verifyCredentials(
  username: string,
  password: string,
): Promise<{ ok: boolean, needsRehash: boolean }> {
  const admin = await getAdmin()
  const userOk = safeEqual(username, admin.username)
  // Kullanici adi yanlissa bile sifre dogrulamasini CALISTIR (erken donus YOK).
  // Eskiden erken donuluyordu -> yanit suresi kisaliyordu -> saldirgan dogru
  // kullanici adini zamanlamadan ayirt edebiliyordu (username enumeration).
  const passOk = await verifyPassword(password, admin.passwordHash)
  const needsRehash = passOk && userOk && !admin.passwordHash.startsWith('$2')
  return { ok: passOk && userOk, needsRehash }
}

function sign(data: string): string {
  return import('node:crypto').then(m =>
    m.createHmac('sha256', getSecret()).update(data).digest('hex'),
  ) as unknown as string
}

export function createSessionToken(username: string): string {
  const expires = Date.now() + SESSION_MAX_AGE * 1000
  const payload = `${username}.${expires}`
  return `${payload}.${signSync(payload)}`
}

/** Sync signing — used on the createSessionToken hot path */
function signSync(data: string): string {
  return require('node:crypto').createHmac('sha256', getSecret()).update(data).digest('hex')
}

export function verifySessionToken(token: string | undefined): string | null {
  if (!token) {
    return null
  }
  const parts = token.split('.')
  if (parts.length !== 3) {
    return null
  }
  const [username, expires, signature] = parts
  const payload = `${username}.${expires}`
  // Sabit-zamanli karsilastirma. Eskiden '!==' kullaniliyordu: JS string
  // karsilastirmasi ilk farkli byte'ta durur, bu yuzden imza byte byte
  // tahmin edilebilirdi (timing attack). safeEqual zaten yukarida tanimli.
  if (!safeEqual(signSync(payload), signature)) {
    return null
  }
  if (Date.now() > Number(expires)) {
    return null
  }
  return username || null
}

export async function getSessionUser(): Promise<string | null> {
  const store = await cookies()
  const token = store.get(SESSION_COOKIE)?.value
  return verifySessionToken(token)
}
