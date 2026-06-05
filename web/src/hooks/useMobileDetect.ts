import { useState, useEffect } from 'react'

export function useMobileDetect() {
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const check = () => {
      setIsMobile(
        window.matchMedia('(max-width: 768px)').matches ||
        ('ontouchstart' in window && window.innerWidth < 1024)
      )
    }
    check()
    const mq = window.matchMedia('(max-width: 768px)')
    mq.addEventListener('change', check)
    return () => mq.removeEventListener('change', check)
  }, [])

  return isMobile
}
