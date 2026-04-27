import { useEffect, useRef, useState } from 'react'

export default function CustomCursor() {
  const shadowRef = useRef(null)
  const frameRef = useRef(0)
  const [enabled, setEnabled] = useState(false)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const mediaQuery = window.matchMedia('(hover: hover) and (pointer: fine)')

    const syncEnabled = () => {
      setEnabled(mediaQuery.matches)
    }

    syncEnabled()
    mediaQuery.addEventListener('change', syncEnabled)

    return () => {
      mediaQuery.removeEventListener('change', syncEnabled)
    }
  }, [])

  useEffect(() => {
    if (!enabled) return undefined

    let mouse = { x: window.innerWidth / 2, y: window.innerHeight / 2 }
    let shadow = { x: mouse.x, y: mouse.y }

    const animate = () => {
      shadow.x += (mouse.x - shadow.x) * 0.22
      shadow.y += (mouse.y - shadow.y) * 0.22

      if (shadowRef.current) {
        shadowRef.current.style.transform = `translate3d(${shadow.x + 10}px, ${shadow.y + 12}px, 0) translate(-50%, -50%)`
      }

      frameRef.current = window.requestAnimationFrame(animate)
    }

    const onMove = (event) => {
      mouse.x = event.clientX
      mouse.y = event.clientY
      setVisible(true)
    }

    const onLeave = () => setVisible(false)
    const onEnter = () => setVisible(true)

    window.addEventListener('mousemove', onMove, { passive: true })
    document.addEventListener('mouseleave', onLeave)
    document.addEventListener('mouseenter', onEnter)
    frameRef.current = window.requestAnimationFrame(animate)

    return () => {
      window.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseleave', onLeave)
      document.removeEventListener('mouseenter', onEnter)
      window.cancelAnimationFrame(frameRef.current)
    }
  }, [enabled])

  if (!enabled) return null

  return (
    <div className={`custom-cursor-layer ${visible ? 'is-visible' : ''}`} aria-hidden="true">
      <div ref={shadowRef} className="custom-cursor-shadow" />
    </div>
  )
}
