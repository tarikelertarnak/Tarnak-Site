import { NextResponse } from 'next/server'
import { fetchRepoReleases } from '@/lib/github'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const owner = (searchParams.get('owner') ?? '').trim()
  const repo = (searchParams.get('repo') ?? '').trim()

  if (!owner || !repo) {
    return NextResponse.json({ success: false, message: 'owner ve repo gerekli.' }, { status: 400 })
  }

  try {
    const releases = await fetchRepoReleases(owner, repo)
    return NextResponse.json({ success: true, releases })
  } catch {
    return NextResponse.json({ success: false, message: 'Releases alınamadı.' }, { status: 500 })
  }
}