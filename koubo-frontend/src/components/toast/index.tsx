import { View } from '@tarojs/components'
import { useState, useCallback, useRef } from 'react'
import './index.scss'

type ToastVariant = 'success' | 'error' | 'info'

interface ToastState {
  visible: boolean
  message: string
  variant: ToastVariant
}

let _setState: ((s: ToastState) => void) | null = null
let _timer: ReturnType<typeof setTimeout> | null = null

export function showToast(message: string, variant: ToastVariant = 'info', duration = 2000) {
  if (!_setState) return
  if (_timer) clearTimeout(_timer)
  _setState({ visible: true, message, variant })
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
  const setStateRef = useRef(setState)
  setStateRef.current = setState
  _setState = useCallback((s: ToastState) => setStateRef.current(s), [])

  if (!state.visible) return null

  return (
    <View className={`toast toast--${state.variant}`}>
      <View className="toast__icon">
        {state.variant === 'success' && '✓'}
        {state.variant === 'error' && '✕'}
        {state.variant === 'info' && 'i'}
      </View>
      <View className="toast__msg">{state.message}</View>
    </View>
  )
}
