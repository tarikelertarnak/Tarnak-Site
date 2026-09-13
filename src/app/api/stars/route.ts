import { promises as fs } from 'node:fs'
import path from 'node:path'
import { NextResponse } from 'next/server'

const DATA_DIR = path.join(process.cwd(), 'data')
const STARS_FILE = path.join(DATA_DIR, 'stars.json')

interface StarsData {
  [key: string]: { total: number, count: number }
}

// Cloudflare Workers: no filesystem — writes are in-memory for the worker lifetime.
let memoryStars: StarsData | null = null

async function readStars(): Promise<StarsData> {
  if (memoryStars)
    return memoryStars
  try {
    const raw = await fs.readFile(STARS_FILE, 'utf-8')
    const parsed = JSON.parse(raw) as StarsData
    memoryStars = parsed
    return parsed
  }
  catch {
    memoryStars = {}
    return {}
  }
}

async function writeStars(data: StarsData): Promise<void> {
  memoryStars = data
  try {
    await fs.mkdir(DATA_DIR, { recursive: true })
    await fs.writeFile(STARS_FILE, `${JSON.stringify(data, null, 2)}\n`, 'utf-8')
  }
  catch { /* Workers: in-memory only */ }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      itemId: string
      itemType: string
      rating: number
      unstar?: boolean
    }
    const { itemId, itemType, rating, unstar } = body

    if (!itemId || !itemType || (typeof rating !== 'number' || rating < 1 || rating > 5)) {
      return NextResponse.json({ error: 'Geçersiz veri' }, { status: 400 })
    }

    const stars = await readStars()
    const key = `${itemType}:${itemId}`
    const existing = stars[key] ?? { total: 0, count: 0 }

    if (unstar) {
      // Undo the star — total never drops below 0
      existing.total = Math.max(0, existing.total - rating)
      existing.count = Math.max(0, existing.count - 1)
    }
    else {
      existing.total += rating
      existing.count += 1
    }

    stars[key] = existing
    await writeStars(stars)

    return NextResponse.json({
      totalStars: existing.total,
      count: existing.count,
      average: existing.count > 0 ? Math.round((existing.total / existing.count) * 10) / 10 : 0,
    })
  }
  catch {
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 })
  }
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const itemId = url.searchParams.get('itemId')
    const itemType = url.searchParams.get('itemType')
    const list = url.searchParams.get('list')

    // Bulk read: return all star records for an itemType
    // (for the popularity sort of the projects grid)
    if (list && itemType) {
      const stars = await readStars()
      const entries = Object.entries(stars)
        .filter(([key]) => key.startsWith(`${itemType}:`))
        .map(([key, value]) => ({
          itemId: key.slice(itemType.length + 1),
          totalStars: value.total,
          count: value.count,
          average: value.count > 0 ? Math.round((value.total / value.count) * 10) / 10 : 0,
        }))
      return NextResponse.json({ success: true, items: entries })
    }

    if (!itemId || !itemType) {
      return NextResponse.json({ error: 'Eksik parametre' }, { status: 400 })
    }

    const stars = await readStars()
    const key = `${itemType}:${itemId}`
    const data = stars[key] ?? { total: 0, count: 0 }
    return NextResponse.json({
      totalStars: data.total,
      count: data.count,
      average: data.count > 0 ? Math.round((data.total / data.count) * 10) / 10 : 0,
    })
  }
  catch {
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 })
  }
}
