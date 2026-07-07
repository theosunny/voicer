import { View } from '@tarojs/components'
import type { CSSProperties, ReactNode } from 'react'
import './index.scss'

interface Props {
  children: ReactNode
  className?: string
  style?: CSSProperties
  color?: 'primary' | 'cyan' | 'hot'
}

export default function HudCard({ children, className = '', style }: Props) {
  return <View className={`card ${className}`} style={style}>{children}</View>
}
