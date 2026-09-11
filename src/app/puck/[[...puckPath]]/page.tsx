import { notFound } from 'next/navigation'
import { getPuckPage } from '@/lib/puck/store'
import Client from './client'

export const dynamic = 'force-dynamic'

export default async function PuckViewPage({
  params,
  searchParams,
}: {
  params: Promise<{ puckPath?: string[] }>
  searchParams: Promise<{ embed?: string }>
}) {
  const { puckPath = [] } = await params
  const { embed } = await searchParams
  const page = puckPath[0] || 'home'
  const data = await getPuckPage(page)
  if (!data) notFound()
  return <Client data={data as Record<string, unknown>} embed={embed === '1'} />
}