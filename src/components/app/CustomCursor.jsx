import { useEffect, useRef, useState } from 'react'

export default function CustomCursor() {
  const dotRef = useRef(null)
  const ringRef = useRef(null)
  const [clicking, setClicking] = useState(false)
  const [hovering, setHovering] = useState(false)

  useEffect(() => {
    let mouse = { x: -100, y: -100 }
    let ring = { x: -100, y: -100 }
    let rafId

    const onMove = (e) => {
      mouse.x = e.clientX
      mouse.y = e.clientY
      if (dotRef.current) {
        dotRef.current.style.transform = `translate(${mouse.x - 4}px, ${mouse.y - 4}px)`
      }
      // Check if hovering interactive element
      const target = document.elementFromPoint(e.clientX, e.clientY)
      const isInteractive = target?.closest('button, a, input, select, textarea, [role="button"]')
      setHovering(!!isInteractive)
    }

    const animate = () => {
      ring.x += (mouse.x - ring.x) * 0.13
      ring.y += (mouse.y - ring.y) * 0.13
      if (ringRef.current) {
        ringRef.current.style.transform = `translate(${ring.x - 16}px, ${ring.y - 16}px)`
      }
      rafId = requestAnimationFrame(animate)
    }

    const onDown = () => setClicking(true)
    const onUp = () => setClicking(false)

    window.addEventListener('mousemove', onMove)
    window.addEventListener('mousedown', onDown)
    window.addEventListener('mouseup', onUp)
    rafId = requestAnimationFrame(animate)

    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mousedown', onDown)
      window.removeEventListener('mouseup', onUp)
      cancelAnimationFrame(rafId)
    }
  }, [])

  return (
    <>
      {/* Inner dot */}
      <div
        ref={dotRef}
        style={{
          position: 'fixed',
          top: 0, left: 0,
          width: clicking ? 6 : 8,
          height: clicking ? 6 : 8,
          background: hovering ? '#fff' : '#e10600',
          borderRadius: '50%',
          pointerEvents: 'none',
          zIndex: 99999,
          willChange: 'transform',
          transition: 'width 0.1s, height 0.1s, background 0.15s',
          mixBlendMode: 'normal',
        }}
      />
      {/* Outer ring */}
      <div
        ref={ringRef}
        style={{
          position: 'fixed',
          top: 0, left: 0,
          width: hovering ? 40 : clicking ? 24 : 32,
          height: hovering ? 40 : clicking ? 24 : 32,
          border: `1.5px solid ${hovering ? '#e10600' : '#e10600'}`,
          borderRadius: '50%',
          pointerEvents: 'none',
          zIndex: 99998,
          opacity: clicking ? 0.3 : 0.55,
          willChange: 'transform',
          transition: 'width 0.2s, height 0.2s, opacity 0.1s, border-color 0.15s',
        }}
      />
    </>
  )
}
