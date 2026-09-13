import { NextResponse } from 'next/server'
import { fetchFileContent } from '@/lib/github'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const owner = (searchParams.get('owner') ?? '').trim()
  const repo = (searchParams.get('repo') ?? '').trim()
  const path = (searchParams.get('path') ?? '').trim()
  const branch = (searchParams.get('branch') ?? 'main').trim()

  if (!owner || !repo || !path) {
    return NextResponse.json({ success: false, message: 'owner, repo ve path gerekli.' }, { status: 400 })
  }

  try {
    const file = await fetchFileContent(owner, repo, path, branch)
    return NextResponse.json({ success: true, file })
  }
  catch {
    return NextResponse.json({ success: false, message: 'Dosya içeriği alınamadı.' }, { status: 500 })
  }
}
