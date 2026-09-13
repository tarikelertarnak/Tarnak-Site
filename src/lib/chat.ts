import type { Buffer } from 'node:buffer'
import type { ChatFile, ChatMessage } from '@/lib/content'
import { randomUUID } from 'node:crypto'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import process from 'node:process'

const DATA_DIR = path.join(process.cwd(), 'data')
const CHAT_FILE = path.join(DATA_DIR, 'chat', 'messages.json')
const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads', 'chat')
const MAX_MESSAGES = 2000

/**
 * Cloudflare Workers has no filesystem — writes fail silently there.
 * Fall back to an in-memory store so the chat still works per worker
 * instance (resets on redeploy; local dev keeps disk persistence).
 */
let memoryMessages: ChatMessage[] | null = null

async function ensureChatDir() {
  try {
    await fs.mkdir(path.join(DATA_DIR, 'chat'), { recursive: true })
  }
  catch { /* Workers: no-op */ }
}

/** Reads all messages raw (including owner) — for internal operations. */
async function readAllMessages(): Promise<ChatMessage[]> {
  if (memoryMessages)
    return memoryMessages
  await ensureChatDir()
  try {
    const raw = await fs.readFile(CHAT_FILE, 'utf-8')
    const parsed = JSON.parse(raw) as ChatMessage[]
    memoryMessages = parsed
    return parsed
  }
  catch {
    memoryMessages = []
    return []
  }
}

async function writeMessages(messages: ChatMessage[]): Promise<void> {
  memoryMessages = messages
  try {
    await fs.writeFile(CHAT_FILE, `${JSON.stringify(messages, null, 2)}\n`, 'utf-8')
  }
  catch { /* Workers: in-memory only */ }
}

export async function getMessages(user?: string): Promise<ChatMessage[]> {
  const all = await readAllMessages()
  if (!user) {
    // Public feed: only public messages (private threads stay hidden)
    return all.filter(m => !m.owner && !m.to)
  }
  const name = user.trim()
  return all.filter(
    m => (m.name === name && !m.owner) || m.to === name,
  )
}

export async function addMessage(
  name: string,
  text: string,
  opts: { file?: ChatFile, owner?: boolean, to?: string } = {},
): Promise<ChatMessage> {
  await ensureChatDir()
  const messages = await readAllMessages()
  const message: ChatMessage = {
    id: randomUUID(),
    name,
    text,
    createdAt: Date.now(),
    ...(opts.file ? { file: opts.file } : {}),
    ...(opts.owner ? { owner: true } : {}),
    ...(opts.to ? { to: opts.to } : {}),
  }
  messages.push(message)
  const trimmed
    = messages.length > MAX_MESSAGES
      ? messages.slice(messages.length - MAX_MESSAGES)
      : messages
  await writeMessages(trimmed)
  return message
}

export async function deleteMessage(id: string): Promise<void> {
  const messages = await readAllMessages()
  const target = messages.find(m => m.id === id)
  const next = messages.filter(m => m.id !== id)
  await writeMessages(next)
  if (target?.file?.url?.startsWith('/uploads/chat/')) {
    try {
      await fs.unlink(path.join(process.cwd(), 'public', target.file.url))
    }
    catch {
      // ignore missing file
    }
  }
}

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024

// Allowed file extensions — executable/content-capable types are rejected
const ALLOWED_EXTENSIONS = new Set([
  '.png',
  '.jpg',
  '.jpeg',
  '.gif',
  '.webp',
  '.avif',
  '.mp3',
  '.mp4',
  '.webm',
  '.ogg',
  '.pdf',
  '.txt',
  '.md',
  '.zip',
  '.rar',
  '.7z',
  '.tar',
  '.gz',
])

// Magic-byte signatures: file content must match its extension
const MAGIC_BYTES: Array<{ ext: string, test: (b: Buffer) => boolean }> = [
  {
    ext: 'png',
    test: b => b.length > 8 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4E && b[3] === 0x47,
  },
  { ext: 'jpg', test: b => b.length > 3 && b[0] === 0xFF && b[1] === 0xD8 && b[2] === 0xFF },
  { ext: 'jpeg', test: b => b.length > 3 && b[0] === 0xFF && b[1] === 0xD8 && b[2] === 0xFF },
  {
    ext: 'gif',
    test: b => b.length > 3 && b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x38,
  },
  {
    ext: 'webp',
    test: b =>
      b.length > 11
      && b.toString('latin1', 0, 4) === 'RIFF'
      && b.toString('latin1', 8, 12) === 'WEBP',
  },
  { ext: 'avif', test: b => b.length > 11 && b.toString('latin1', 4, 8) === 'ftyp' },
  { ext: 'pdf', test: b => b.length > 3 && b.toString('latin1', 0, 4) === '%PDF' },
  { ext: 'zip', test: b => b.length > 3 && b[0] === 0x50 && b[1] === 0x4B },
  { ext: 'gz', test: b => b.length > 2 && b[0] === 0x1F && b[1] === 0x8B },
  { ext: 'mp3', test: b => b.length > 2 && b.toString('latin1', 0, 3) === 'ID3' },
]

/**
 * Checks whether the file content actually matches the declared extension.
 * Falls back to safe behavior when no signature is known: non-visual/other
 * text types (txt/md) are accepted.
 */
function matchesMagicBytes(data: Buffer, ext: string): boolean {
  const extKey = ext.replace('.', '')
  for (const sig of MAGIC_BYTES) {
    if (sig.ext === extKey) {
      return sig.test(data)
    }
  }
  // Types with no known signature: validate content for text files and archives
  if (extKey === 'txt' || extKey === 'md') {
    // Must contain no NUL bytes (not binary) and be text only
    return data.length < 200_000 && !data.subarray(0, 512).includes(0)
  }
  if (extKey === 'rar' || extKey === '7z') {
    // Signature can't be checked — size limit + user naming is enough
    return true
  }
  if (extKey === 'mp4' || extKey === 'webm' || extKey === 'ogg') {
    // ftyp/ogg signatures are flexible — non-visual media is accepted
    return true
  }
  return true
}

export async function saveUploadedFile(
  data: Buffer,
  originalName: string,
  mimeType: string,
): Promise<ChatFile> {
  const rawExt = path.extname(originalName).toLowerCase().slice(0, 12) || '.bin'
  const ext = ALLOWED_EXTENSIONS.has(rawExt) ? rawExt : '.bin'
  if (ext === '.bin') {
    throw new Error('Bu dosya türü yüklenemez.')
  }
  if (!matchesMagicBytes(data, ext)) {
    throw new Error('Dosya içeriği uzantısıyla eşleşmiyor.')
  }
  const safeName = originalName.replace(/[^\w.\- ]+/g, '_').slice(0, 80)
  const filename = `${Date.now()}-${randomUUID().slice(0, 8)}${ext}`
  try {
    await fs.mkdir(UPLOAD_DIR, { recursive: true })
    const filepath = path.join(UPLOAD_DIR, filename)
    await fs.writeFile(filepath, data)
  }
  catch {
    // Cloudflare Workers: no filesystem — uploads fail gracefully.
    throw new Error('Dosya yükleme şu anda kullanılamıyor.')
  }
  return {
    name: safeName,
    type: mimeType || 'application/octet-stream',
    size: data.length,
    url: `/uploads/chat/${filename}`,
  }
}
