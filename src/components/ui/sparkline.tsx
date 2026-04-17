import { useMemo } from 'react'

interface SparklineProps {
  data: number[]
  width?: number
  height?: number
  stroke?: string
  fillOpacity?: number
  strokeWidth?: number
  className?: string
}

export function Sparkline({
  data,
  width = 120,
  height = 32,
  stroke = '#D4FF3A',
  fillOpacity = 0.18,
  strokeWidth = 1.5,
  className,
}: SparklineProps) {
  const { path, area } = useMemo(() => {
    if (data.length < 2) return { path: '', area: '' }
    const min = Math.min(...data)
    const max = Math.max(...data)
    const range = max - min || 1
    const step = width / (data.length - 1)
    const points = data.map((v, i) => {
      const x = i * step
      const y = height - ((v - min) / range) * height * 0.9 - height * 0.05
      return [x, y] as const
    })
    const line = points
      .map(([x, y], i) => (i === 0 ? `M${x},${y}` : `L${x},${y}`))
      .join(' ')
    const fill = `${line} L${width},${height} L0,${height} Z`
    return { path: line, area: fill }
  }, [data, width, height])

  if (!path) return null

  const gradientId = useMemo(() => `spark-grad-${Math.random().toString(36).slice(2, 8)}`, [])

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={className}
      preserveAspectRatio="none"
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={stroke} stopOpacity={fillOpacity} />
          <stop offset="100%" stopColor={stroke} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${gradientId})`} />
      <path
        d={path}
        fill="none"
        stroke={stroke}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
