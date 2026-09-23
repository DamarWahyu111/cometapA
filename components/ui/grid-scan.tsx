'use client'

import { CSSProperties, MouseEvent, useState } from 'react'
import styles from './grid-scan.module.css'

type GridScanProps = {
  sensitivity?: number
  lineThickness?: number
  linesColor?: string
  gridScale?: number
  scanColor?: string
  scanOpacity?: number
  enablePost?: boolean
  bloomIntensity?: number
  chromaticAberration?: number
  noiseIntensity?: number
  lineJitter?: number
  scanGlow?: number
  scanSoftness?: number
  enableWebcam?: boolean
  showPreview?: boolean
  className?: string
}

export default function GridScan({
  sensitivity = 0.55,
  lineThickness = 1,
  linesColor = '#2F293A',
  gridScale = 0.1,
  scanColor = '#FF9FFC',
  scanOpacity = 0.4,
  enablePost = true,
  bloomIntensity = 0.6,
  chromaticAberration = 0.002,
  noiseIntensity = 0.01,
  lineJitter = 0.1,
  scanGlow = 0.5,
  scanSoftness = 2,
  className,
}: GridScanProps) {
  const [position, setPosition] = useState({ x: 50, y: 50 })

  const handleMove = (event: MouseEvent<HTMLDivElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect()
    setPosition({
      x: ((event.clientX - bounds.left) / bounds.width) * 100,
      y: ((event.clientY - bounds.top) / bounds.height) * 100,
    })
  }

  const customStyle = {
    '--grid-color': linesColor,
    '--scan-color': scanColor,
    '--scan-opacity': scanOpacity,
    '--line-width': `${Math.max(1, lineThickness)}px`,
    '--grid-size': `${Math.max(24, gridScale * 560)}px`,
    '--bloom': enablePost ? bloomIntensity : 0,
    '--noise-opacity': noiseIntensity,
    '--jitter': `${lineJitter * 2}px`,
    '--softness': `${Math.max(1, scanSoftness) * 10}px`,
    '--aberration': `${chromaticAberration * 100}px`,
    '--glow': scanGlow,
    '--pointer-x': `${position.x}%`,
    '--pointer-y': `${position.y}%`,
    '--rotation': `${(position.x - 50) * -0.012}deg`,
    '--vertical-shift': `${(position.y - 50) * 0.035}px`,
    '--sensitivity': sensitivity,
  } as CSSProperties

  return (
    <div
      aria-hidden="true"
      className={`${styles.gridScan}${className ? ` ${className}` : ''}`}
      style={customStyle}
      onMouseMove={handleMove}
      onMouseLeave={() => setPosition({ x: 50, y: 50 })}
    >
      <div className={styles.grid} />
      <div className={styles.scanLine} />
      <div className={styles.glow} />
      <div className={styles.noise} />
    </div>
  )
}
