import { useEffect } from 'react'

export default function MobilePage({ shellClass, children, onMount }) {
  useEffect(() => {
    onMount?.()
  }, [onMount])

  return <div className={shellClass}>{children}</div>
}
