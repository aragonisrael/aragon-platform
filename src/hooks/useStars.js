import { useEffect } from 'react'

export function useStars(containerId, count = 45) {
  useEffect(() => {
    const el = document.getElementById(containerId)
    if (!el || el.childElementCount > 0) return

    for (let i = 0; i < count; i++) {
      const s = document.createElement('div')
      s.className = 'star'
      const size = Math.random() * 2 + 0.5
      s.style.cssText = `width:${size}px;height:${size}px;left:${Math.random() * 100}%;top:${Math.random() * 100}%;--d:${(Math.random() * 3 + 1.5).toFixed(1)}s;animation-delay:${(Math.random() * 3).toFixed(1)}s`
      el.appendChild(s)
    }
  }, [containerId, count])
}
