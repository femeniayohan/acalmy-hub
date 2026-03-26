'use client'

import { useMemo } from 'react'

interface SparklineProps {
  data: number[]
  width?: number
  height?: number
  color?: string
  fillColor?: string
}

export function Sparkline({
  data,
  width = 120,
  height = 32,
  color = '#16a34a',
  fillColor,
}: SparklineProps) {
  const path = useMemo(() => {
    if (data.length < 2) return null

    const max = Math.max(...data, 1)
    const min = Math.min(...data)
    const range = max - min || 1
    const padding = 2

    const points = data.map((value, index) => {
      const x = (index / (data.length - 1)) * width
      const y = height - padding - ((value - min) / range) * (height - padding * 2)
      return `${x.toFixed(1)},${y.toFixed(1)}`
    })

    const linePath = `M ${points.join(' L ')}`

    if (fillColor) {
      const lastPoint = points[points.length - 1]
      const fillPath = `${linePath} L ${width},${height} L 0,${height} Z`
      return { linePath, fillPath }
    }

    return { linePath, fillPath: null }
  }, [data, width, height, fillColor])

  if (!path || data.length < 2) {
    return (
      <svg width={width} height={height} className="overflow-visible">
        <line
          x1="0"
          y1={height / 2}
          x2={width}
          y2={height / 2}
          stroke="rgba(0,0,0,0.1)"
          strokeWidth="1"
          strokeDasharray="4 2"
        />
      </svg>
    )
  }

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className="overflow-visible"
    >
      {path.fillPath && (
        <path
          d={path.fillPath}
          fill={fillColor}
          opacity={0.12}
        />
      )}
      <path
        d={path.linePath}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
