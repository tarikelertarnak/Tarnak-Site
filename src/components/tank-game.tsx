'use client'

import { Icon } from '@iconify/react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useLocale } from '@/components/locale-provider'

interface Tank {
  x: number
  y: number
  angle: number
  speed: number
}

interface Bullet {
  x: number
  y: number
  dx: number
  dy: number
}

interface Glitch {
  x: number
  y: number
  size: number
  opacity: number
}

export function TankGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isOpen, setIsOpen] = useState(false)
  const [gameOver, setGameOver] = useState<'win' | 'lose' | 'counterattack' | null>(null)
  const keysRef = useRef<Set<string>>(new Set())
  const tankRef = useRef<Tank>({ x: 400, y: 300, angle: 0, speed: 3 })
  const bulletsRef = useRef<Bullet[]>([])
  const glitchesRef = useRef<Glitch[]>([])
  const targetsRef = useRef<{ x: number, y: number, hit: boolean }[]>([])
  const animRef = useRef<number>(0)
  const [score, setScore] = useState(0)
  const { locale } = useLocale()
  const isEn = locale === 'en'

  const resetGame = useCallback(() => {
    tankRef.current = { x: 400, y: 300, angle: 0, speed: 3 }
    bulletsRef.current = []
    glitchesRef.current = []
    targetsRef.current = Array.from({ length: 5 }, () => ({
      x: Math.random() * 700 + 50,
      y: Math.random() * 400 + 50,
      hit: false,
    }))
    setScore(0)
    setGameOver(null)
  }, [])

  useEffect(() => {
    if (!isOpen)
      return
    resetGame()

    const handleKeyDown = (e: KeyboardEvent) => {
      keysRef.current.add(e.key.toLowerCase())
      if (e.key === 'Escape') {
        setIsOpen(false)
      }
      if (e.key === ' ') {
        const t = tankRef.current
        bulletsRef.current.push({
          x: t.x + Math.cos(t.angle) * 20,
          y: t.y + Math.sin(t.angle) * 20,
          dx: Math.cos(t.angle) * 6,
          dy: Math.sin(t.angle) * 6,
        })
      }
    }

    const handleKeyUp = (e: KeyboardEvent) => {
      keysRef.current.delete(e.key.toLowerCase())
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)

    const canvas = canvasRef.current
    if (!canvas)
      return
    const ctx = canvas.getContext('2d')
    if (!ctx)
      return

    const loop = () => {
      const keys = keysRef.current
      const t = tankRef.current

      // Movement
      if (keys.has('w') || keys.has('arrowup')) {
        t.x += Math.cos(t.angle) * t.speed
        t.y += Math.sin(t.angle) * t.speed
      }
      if (keys.has('s') || keys.has('arrowdown')) {
        t.x -= Math.cos(t.angle) * t.speed * 0.6
        t.y -= Math.sin(t.angle) * t.speed * 0.6
      }
      if (keys.has('a') || keys.has('arrowleft'))
        t.angle -= 0.05
      if (keys.has('d') || keys.has('arrowright'))
        t.angle += 0.05

      // Border control
      t.x = Math.max(15, Math.min(canvas.width - 15, t.x))
      t.y = Math.max(15, Math.min(canvas.height - 15, t.y))

      // TARIK ELER / TARNAK protection zone (bottom center)
      const protectedX = canvas.width / 2
      const protectedY = canvas.height - 60
      const distToProtected = Math.hypot(t.x - protectedX, t.y - protectedY)
      if (distToProtected < 80 && !gameOver) {
        setGameOver('counterattack')
      }

      // Bullets
      bulletsRef.current = bulletsRef.current.filter((b) => {
        b.x += b.dx
        b.y += b.dy
        if (b.x < 0 || b.x > canvas.width || b.y < 0 || b.y > canvas.height)
          return false
        // Target check
        for (const target of targetsRef.current) {
          if (!target.hit) {
            const dist = Math.hypot(b.x - target.x, b.y - target.y)
            if (dist < 18) {
              target.hit = true
              glitchesRef.current.push({ x: target.x, y: target.y, size: 40, opacity: 1 })
              setScore(s => s + 1)
              return false
            }
          }
        }
        return true
      })

      // Glitch effects
      glitchesRef.current = glitchesRef.current.filter((g) => {
        g.opacity -= 0.02
        g.size += 0.5
        return g.opacity > 0
      })

      // All targets hit?
      if (targetsRef.current.every(t => t.hit) && !gameOver) {
        setGameOver('win')
      }

      // Draw
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      // Background
      ctx.fillStyle = 'rgba(10, 10, 15, 0.95)'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      // Grid
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)'
      ctx.lineWidth = 1
      for (let x = 0; x < canvas.width; x += 40) {
        ctx.beginPath()
        ctx.moveTo(x, 0)
        ctx.lineTo(x, canvas.height)
        ctx.stroke()
      }
      for (let y = 0; y < canvas.height; y += 40) {
        ctx.beginPath()
        ctx.moveTo(0, y)
        ctx.lineTo(canvas.width, y)
        ctx.stroke()
      }

      // Tank
      ctx.save()
      ctx.translate(t.x, t.y)
      ctx.rotate(t.angle)
      // Body
      ctx.fillStyle = '#FBBF24'
      ctx.fillRect(-15, -10, 30, 20)
      // Barrel
      ctx.fillStyle = '#FDE68A'
      ctx.fillRect(5, -3, 18, 6)
      // Treads
      ctx.fillStyle = '#92400e'
      ctx.fillRect(-15, -12, 30, 3)
      ctx.fillRect(-15, 9, 30, 3)
      ctx.restore()

      // Targets
      targetsRef.current.forEach((target) => {
        if (target.hit)
          return
        ctx.save()
        ctx.translate(target.x, target.y)
        ctx.fillStyle = '#ef4444'
        ctx.beginPath()
        ctx.arc(0, 0, 12, 0, Math.PI * 2)
        ctx.fill()
        ctx.fillStyle = '#ffffff'
        ctx.font = 'bold 14px monospace'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText('</>', 0, 0)
        ctx.restore()
      })

      // Bullets
      bulletsRef.current.forEach((b) => {
        ctx.fillStyle = '#FBBF24'
        ctx.beginPath()
        ctx.arc(b.x, b.y, 3, 0, Math.PI * 2)
        ctx.fill()
      })

      // Glitch effects
      glitchesRef.current.forEach((g) => {
        ctx.save()
        ctx.globalAlpha = g.opacity
        ctx.fillStyle = '#ef4444'
        ctx.fillRect(g.x - g.size / 2, g.y - g.size / 2, g.size, g.size)
        ctx.fillStyle = '#00ff00'
        ctx.font = 'bold 10px monospace'
        ctx.textAlign = 'center'
        ctx.fillText('GLITCH', g.x, g.y)
        ctx.restore()
      })

      // Score
      ctx.fillStyle = '#FBBF24'
      ctx.font = 'bold 16px Montserrat, sans-serif'
      ctx.textAlign = 'left'
      ctx.fillText(
        isEn ? `Score: ${targetsRef.current.filter(t => t.hit).length}/${targetsRef.current.length}` : `Skor: ${targetsRef.current.filter(t => t.hit).length}/${targetsRef.current.length}`,
        15,
        25,
      )

      // TARIK ELER / TARNAK protection zone
      ctx.save()
      ctx.globalAlpha = 0.15
      ctx.fillStyle = '#FBBF24'
      ctx.beginPath()
      ctx.arc(protectedX, protectedY, 80, 0, Math.PI * 2)
      ctx.fill()
      ctx.globalAlpha = 0.6
      ctx.fillStyle = '#FBBF24'
      ctx.font = 'bold 12px Montserrat, sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText('TARIK ELER / TARNAK', protectedX, protectedY - 5)
      ctx.font = '10px Montserrat, sans-serif'
      ctx.fillText(
        isEn ? 'You cannot destroy me!' : 'Beni yok edemezsin!',
        protectedX,
        protectedY + 12,
      )
      ctx.restore()

      // Instructions
      if (!gameOver) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.4)'
        ctx.font = '12px Montserrat, sans-serif'
        ctx.textAlign = 'center'
        ctx.fillText(
          isEn
            ? 'WASD/Arrows: Move | Space: Fire | ESC: Exit'
            : 'WASD/Oklar: Hareket | Space: Ateş | ESC: Çık',
          canvas.width / 2,
          canvas.height - 15,
        )
      }

      animRef.current = requestAnimationFrame(loop)
    }
    animRef.current = requestAnimationFrame(loop)

    return () => {
      cancelAnimationFrame(animRef.current)
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [isOpen, gameOver, resetGame, isEn])

  if (!isOpen)
    return null

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black">
      <div className="relative">
        <button
          type="button"
          onClick={() => setIsOpen(false)}
          className="absolute -top-3 -right-3 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-danger text-white shadow-lg transition-colors hover:bg-danger/80"
        >
          <Icon icon="mdi:close" width={18} height={18} />
        </button>
        <canvas
          ref={canvasRef}
          width={800}
          height={500}
          className="rounded-2xl border border-foreground-200/20 shadow-2xl"
          tabIndex={0}
        />
        {gameOver && (
          <div className="absolute inset-0 flex flex-col items-center justify-center rounded-2xl bg-black">
            <h2
              className={`mb-4 text-4xl font-black ${
                gameOver === 'win'
                  ? 'text-green-400'
                  : gameOver === 'counterattack'
                    ? 'text-red-500'
                    : 'text-red-400'
              }`}
            >
              {gameOver === 'win'
                ? isEn
                  ? 'YOU WIN!'
                  : 'KAZANDIN!'
                : gameOver === 'counterattack'
                  ? isEn
                    ? 'YOU CANNOT DESTROY ME!'
                    : 'BENİ YOK EDEMEZSİN!'
                  : isEn
                    ? 'YOU LOST!'
                    : 'KAYBETTİN!'}
            </h2>
            <p className="text-foreground-500 mb-6 max-w-md text-center">
              {gameOver === 'win'
                ? isEn
                  ? 'You hit all </> targets!'
                  : 'Tüm </> hedeflerini vurdun!'
                : gameOver === 'counterattack'
                  ? isEn
                    ? 'You attacked the TARIK ELER / TARNAK banner — counterattack! The website beat you.'
                    : 'TARIK ELER / TARNAK yazısına saldırmaya çalıştın — karşı saldırı! Website seni yendi.'
                  : isEn
                    ? 'Your tank was destroyed!'
                    : 'Tankın yok edildi!'}
            </p>
            <button
              type="button"
              onClick={() => {
                resetGame()
              }}
              className="rounded-xl bg-primary px-6 py-3 font-bold text-black transition-colors hover:bg-primary/80"
            >
              {isEn ? 'Play Again' : 'Tekrar Oyna'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
