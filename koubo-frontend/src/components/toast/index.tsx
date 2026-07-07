import { View } from '@tarojs/components'
import { useState, useCallback, useRef } from 'react'
import './index.scss'

type ToastVariant = 'success' | 'error' | 'info'

interface ToastState {
  visible: boolean; message: string; variant: ToastVariant
}

let _setState: ((s: ToastState) => void) | null = null
let _timer: ReturnType<typeof setTimeout> | null = null

export function showToast(msg: string, _variant: ToastVariant = 'info', duration = 2000) {
  if (!_setState) return
  if (_timer) clearTimeout(_timer)
  _setState({ visible: true, message: msg, variant: 'info' })
  _timer = setTimeout(() => {
    _setState?.({ visible: false, message: '', variant: 'info' })
  }, duration)
}

export function useToast() {
  return {
    success: (msg: string) => showToast(msg, 'success'),
    error: (msg: string) => showToast(msg, 'error'),
    info: (msg: string) => showToast(msg, 'info'),
  }
}

export default function Toast() {
  const [state, setState] = useState<ToastState>({ visible: false, message: '', variant: 'info' })
  const ref = useRef(setState); ref.current = setState
  _setState = useCallback((s: ToastState) => ref.current(s), [])
  if (!state.visible) return null

  const icon = state.variant === 'error' ? '✕ ' : state.variant === 'success' ? '✓ ' : ''
  return <View className="toast">{icon}{state.message}</View>
}
