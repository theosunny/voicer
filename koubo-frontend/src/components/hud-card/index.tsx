import { View } from '@tarojs/components'
import type { CSSProperties, ReactNode } from 'react'
import './index.scss'

interface HudCardProps {
  children: ReactNode
  className?: string
  style?: CSSProperties
  color?: 'primary' | 'cyan' | 'hot'
}

export default function HudCard({ children, className = '', style, color = 'primary' }: HudCardProps) {
  return (
    <View className={`hud-card hud-card--${color} ${className}`} style={style}>
      <View className="hud-card__corner hud-card__corner--tr" />
      <View className="hud-card__corner hud-card__corner--bl" />
      <View className="hud-card__content">{children}</View>
    </View>
  )
}
