import Taro from '@tarojs/taro'
import { useState, useEffect, useRef, useCallback } from 'react'
import type { ASRPosition } from '../types/api'
import { API_BASE } from '../api/client'

interface ASRMessage {
  type: 'position' | 'partial' | 'error'
  paragraph_index?: number
  word_index?: number
  text?: string
  error?: string
}

interface UseASRSocketResult {
  position: ASRPosition | null
  recognizing: string
  connected: boolean
  send: (audio: ArrayBuffer) => void
  disconnect: () => void
}

const MAX_RETRIES = 3
const RETRY_DELAY_MS = 1500

export function useASRSocket(scriptParagraphs: string[], enabled: boolean): UseASRSocketResult {
  const [position, setPosition] = useState<ASRPosition | null>(null)
  const [recognizing, setRecognizing] = useState('')
  const [connected, setConnected] = useState(false)

  const socketRef = useRef<null>(null)
  const retriesRef = useRef(0)
  const audioQueueRef = useRef<ArrayBuffer[]>([])
  const enabledRef = useRef(enabled)
  enabledRef.current = enabled

  const connectSocket = useCallback(() => {
    const wsUrl = API_BASE.replace(/^http/, 'ws') + '/api/asr/stream'

    Taro.onSocketOpen(() => {
      retriesRef.current = 0
      setConnected(true)
      Taro.sendSocketMessage({ data: JSON.stringify({ type: 'init', paragraphs: scriptParagraphs }) })
      while (audioQueueRef.current.length > 0) {
        const buf = audioQueueRef.current.shift()!
        Taro.sendSocketMessage({ data: buf })
      }
    })

    Taro.onSocketMessage((evt: Taro.onSocketMessage.CallbackResult) => {
      try {
        const msg = JSON.parse(evt.data as string) as ASRMessage
        if (msg.type === 'position' && msg.paragraph_index !== undefined) {
          setPosition({ paragraph_index: msg.paragraph_index, word_index: msg.word_index ?? 0 })
        } else if (msg.type === 'partial' && msg.text) {
          setRecognizing(msg.text)
        }
      } catch { /* ignore */ }
    })

    Taro.onSocketClose(() => {
      setConnected(false)
      if (enabledRef.current && retriesRef.current < MAX_RETRIES) {
        retriesRef.current += 1
        setTimeout(() => { if (enabledRef.current) connectSocket() }, RETRY_DELAY_MS)
      }
    })

    Taro.onSocketError(() => { setConnected(false) })

    Taro.connectSocket({ url: wsUrl, success: () => {}, fail: () => {} })
  }, [scriptParagraphs])

  useEffect(() => {
    if (!enabled) return
    connectSocket()
    return () => {
      Taro.closeSocket({})
      setConnected(false)
    }
  }, [enabled, connectSocket])

  const send = useCallback((audio: ArrayBuffer) => {
    if (connected) {
      Taro.sendSocketMessage({ data: audio })
    } else {
      audioQueueRef.current.push(audio)
    }
  }, [connected])

  const disconnect = useCallback(() => {
    Taro.closeSocket({})
    setConnected(false)
    retriesRef.current = MAX_RETRIES
  }, [])

  return { position, recognizing, connected, send, disconnect }
}
