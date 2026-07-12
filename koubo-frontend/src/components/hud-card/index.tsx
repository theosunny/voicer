import { View } from '@tarojs/components'
import type { CSSProperties, ReactNode } from 'react'
import './index.scss'

interface Props {
  children: ReactNode
  className?: string
  style?: CSSProperties
  color?: 'primary' | 'cyan' | 'hot'
}

export default function HudCard({ children, className = '', style, color }: Props) {
  const colorClass = color ? ` card--${color}` : ''
  return <View className={`card${colorClass} ${className}`} style={style}>{children}</View>
}
