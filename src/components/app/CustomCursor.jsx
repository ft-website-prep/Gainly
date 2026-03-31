import { useEffect, useRef } from 'react'

export default function CustomCursor() {
  const dotRef = useRef(null)

  useEffect(() => {
    let mouse = { x: -100, y: -100 }
    let dot = { x: -100, y: -100 }
    let rafId

    const onMove = (e) => {
      mouse.x = e.clientX
      mouse.y = e.clientY
    }

    const animate = () => {
      dot.x += (mouse.x - dot.x) * 0.1
      dot.y += (mouse.y - dot.y) * 0.1
      if (dotRef.current) {
        dotRef.current.style.transform = `translate(${dot.x - 2.5}px, ${dot.y - 2.5}px)`
      }
      rafId = requestAnimationFrame(animate)
    }

    window.addEventListener('mousemove', onMove)
    rafId = requestAnimationFrame(animate)

    return () => {
      window.removeEventListener('mousemove', onMove)
      cancelAnimationFrame(rafId)
    }
  }, [])

  return (
    <div
      ref={dotRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: 5,
        height: 5,
        background: '#e10600',
        opacity: 0.45,
        borderRadius: '50%',
        pointerEvents: 'none',
        zIndex: 99999,
        willChange: 'transform',
      }}
    />
  )
}
