'use client'

import type { ReactNode } from 'react'
import { Divider } from 'antd'
import { Card } from '@/components/ui/card'

export function PanelCard({ title, children, className }: { title?: string, children: ReactNode, className?: string }) {
  return (
    <Card className={`p-4 sm:p-5 bg-background ${className ?? ''}`}>
      {title ? (
        <div className="pb-3">
          <h2 className="text-base sm:text-lg font-semibold">{title}</h2>
          <Divider className="mt-2" />
        </div>
      ) : null}
      {children}
    </Card>
  )
}
