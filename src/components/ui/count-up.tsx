import { useEffect, useState } from 'react'

interface CountUpProps {
  value: number
  duration?: number
  format?: (n: number) => string
  className?: string
  decimals?: number
}

export function CountUp({
  value,
  duration = 900,
  format,
  className,
  decimals = 0,
}: CountUpProps) {
  const [n, setN] = useState(0)

  useEffect(() => {
    let raf = 0
    const start = performance.now()
    const from = 0
    const to = value
    const step = (t: number) => {
      const p = Math.min(1, (t - start) / duration)
      const eased = 1 - Math.pow(1 - p, 3)
      setN(from + (to - from) * eased)
      if (p < 1) raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [value, duration])

  const display = format ? format(n) : n.toFixed(decimals)
  return <span className={className}>{display}</span>
}
