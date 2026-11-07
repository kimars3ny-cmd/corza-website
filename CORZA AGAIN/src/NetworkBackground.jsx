import { useEffect, useRef } from 'react'

export default function NetworkBackground() {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let animationId
    let width = 0
    let height = 0
    let particles = []

    const mouse = {
      x: null,
      y: null,
      radius: 160,
    }

    const reducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches

    function resizeCanvas() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2)

      width = window.innerWidth
      height = window.innerHeight

      canvas.width = width * dpr
      canvas.height = height * dpr

      canvas.style.width = `${width}px`
      canvas.style.height = `${height}px`

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

      const count = Math.min(
        Math.floor((width * height) / 11000),
        110
      )

      particles = Array.from({ length: count }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.45,
        vy: (Math.random() - 0.5) * 0.45,
        radius: Math.random() * 1.7 + 1,
      }))
    }

    function handleMouseMove(event) {
      mouse.x = event.clientX
      mouse.y = event.clientY
    }

    function handleMouseLeave() {
      mouse.x = null
      mouse.y = null
    }

    function draw() {
      ctx.clearRect(0, 0, width, height)

      const connectionDistance = 145

      particles.forEach((particle, index) => {
        particle.x += particle.vx
        particle.y += particle.vy

        if (particle.x < 0 || particle.x > width) {
          particle.vx *= -1
        }

        if (particle.y < 0 || particle.y > height) {
          particle.vy *= -1
        }

        if (mouse.x !== null && mouse.y !== null) {
          const dx = particle.x - mouse.x
          const dy = particle.y - mouse.y
          const distance = Math.sqrt(dx * dx + dy * dy)

          if (distance < mouse.radius && distance > 0) {
            const force = (mouse.radius - distance) / mouse.radius

            particle.x += (dx / distance) * force * 1.2
            particle.y += (dy / distance) * force * 1.2
          }
        }

        for (let j = index + 1; j < particles.length; j++) {
          const other = particles[j]

          const dx = particle.x - other.x
          const dy = particle.y - other.y
          const distance = Math.sqrt(dx * dx + dy * dy)

          if (distance < connectionDistance) {
            const opacity =
              (1 - distance / connectionDistance) * 0.35

            ctx.beginPath()
            ctx.moveTo(particle.x, particle.y)
            ctx.lineTo(other.x, other.y)

            ctx.strokeStyle = `rgba(125, 150, 255, ${opacity})`
            ctx.lineWidth = 0.7
            ctx.stroke()
          }
        }

        if (mouse.x !== null && mouse.y !== null) {
          const dx = particle.x - mouse.x
          const dy = particle.y - mouse.y
          const distance = Math.sqrt(dx * dx + dy * dy)

          if (distance < mouse.radius) {
            ctx.beginPath()
            ctx.moveTo(particle.x, particle.y)
            ctx.lineTo(mouse.x, mouse.y)

            ctx.strokeStyle = `rgba(120, 190, 255, ${
              (1 - distance / mouse.radius) * 0.65
            })`

            ctx.lineWidth = 1
            ctx.stroke()
          }
        }

        ctx.beginPath()
        ctx.arc(
          particle.x,
          particle.y,
          particle.radius,
          0,
          Math.PI * 2
        )

        ctx.fillStyle = 'rgba(160, 175, 255, 0.8)'
        ctx.shadowBlur = 10
        ctx.shadowColor = 'rgba(100, 130, 255, 0.8)'
        ctx.fill()
        ctx.shadowBlur = 0
      })

      if (!reducedMotion) {
        animationId = requestAnimationFrame(draw)
      }
    }

    resizeCanvas()
    draw()

    window.addEventListener('resize', resizeCanvas)
    window.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseleave', handleMouseLeave)

    return () => {
      cancelAnimationFrame(animationId)

      window.removeEventListener('resize', resizeCanvas)
      window.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseleave', handleMouseLeave)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="network-background"
      aria-hidden="true"
    />
  )
}