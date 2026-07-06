import { View } from '@tarojs/components'
import type { ReactNode } from 'react'
import './index.scss'

interface GlowButtonProps {
  children: ReactNode
  onClick?: () => void
  loading?: boolean
  disabled?: boolean
  variant?: 'primary' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  fullWidth?: boolean
}

export default function GlowButton({
  children,
  onClick,
  loading = false,
  disabled = false,
  variant = 'primary',
  size = 'md',
  fullWidth = false,
}: GlowButtonProps) {
  const isInert = disabled || loading

  return (
    <View
      className={[
        'glow-btn',
        `glow-btn--${variant}`,
        `glow-btn--${size}`,
        isInert ? 'glow-btn--inert' : '',
        fullWidth ? 'glow-btn--full' : '',
      ].filter(Boolean).join(' ')}
      onClick={() => { if (!isInert && onClick) onClick() }}
    >
      {loading ? (
        <View className="glow-btn__spinner" />
      ) : (
        <View className="glow-btn__label">{children}</View>
      )}
    </View>
  )
}
