import { View } from '@tarojs/components'
import type { ReactNode } from 'react'
import './index.scss'

interface Props {
  children: ReactNode
  onClick?: () => void
  loading?: boolean
  disabled?: boolean
  variant?: 'primary' | 'danger' | 'outline' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  fullWidth?: boolean
}

export default function GlowButton({
  children, onClick, loading = false, disabled = false,
  variant = 'primary', size = 'md', fullWidth = false,
}: Props) {
  const inert = disabled || loading
  const cls = [
    'btn', `btn--${variant}`, `btn--${size}`,
    inert ? 'btn--inert' : '', fullWidth ? 'btn--full' : '',
  ].filter(Boolean).join(' ')

  return (
    <View className={cls} onClick={() => { if (!inert && onClick) onClick() }}>
      {loading ? <View className="btn__spinner" /> : children}
    </View>
  )
}
