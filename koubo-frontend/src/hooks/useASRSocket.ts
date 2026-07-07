import Taro from '@tarojs/taro'
import { useState, useEffect, useRef, useCallback } from 'react'
import type { ASRPosition } from '../types/api'
import { API_BASE } from '../api/client'

interface ASRMessage {
  type: string
  paragraph_index?: number
  word_index?: number
  recognized?: string
}

interface UseASRSocketResult {
  position: ASRPosition | null
  recognizing: string
  connected: boolean
  sendPCM: (audio: ArrayBuffer) => void
  disconnect: () => void
}

const MAX_RETRIES = 2

export function useASRSocket(
  scriptId: string | null,
  scriptContent: string,
  enabled: boolean,
): UseASRSocketResult {
  const [position, setPosition] = useState<ASRPosition | null>(null)
  const [recognizing, setRecognizing] = useState('')
  const [connected, setConnected] = useState(false)

  const socketRef = useRef<Taro.SocketTask | null>(null)
  const connectedRef = useRef(false)
  const retriesRef = useRef(0)
  const queueRef = useRef<ArrayBuffer[]>([])
  const unmountedRef = useRef(false)

  useEffect(() => { connectedRef.current = connected }, [connected])
  useEffect(() => { unmountedRef.current = false; return () => { unmountedRef.current = true } }, [])

  const closeQuietly = useCallback((task: Taro.SocketTask | null) => {
    if (!task || !connectedRef.current) return
    connectedRef.current = false
    try { task.close({ code: 1000, reason: 'done' }) } catch { /* already closed */ }
  }, [])

  const connect = useCallback(() => {
    if (!enabled || !scriptId || unmountedRef.current) return

    const wsUrl = API_BASE.replace(/^http/, 'ws') + '/api/asr/stream'

    // Taro.connectSocket returns Promise<SocketTask>
    let task: Taro.SocketTask | undefined
    try {
      const result = Taro.connectSocket({ url: wsUrl })
      if (result instanceof Promise) {
        result.then((t) => {
          task = t
          setupSocket(t)
        }).catch(() => {
          // WebSocket not available (dev tools), silently ignore
          setConnected(false)
        })
      } else {
        task = result as unknown as Taro.SocketTask
        setupSocket(task)
      }
    } catch {
      setConnected(false)
    }

    function setupSocket(t: Taro.SocketTask) {
      if (unmountedRef.current) { closeQuietly(t); return }
      socketRef.current = t

      t.onOpen(() => {
        if (unmountedRef.current) { closeQuietly(t); return }
        setConnected(true)
        retriesRef.current = 0
        t.send({
          data: JSON.stringify({ script_id: scriptId, content: scriptContent }),
        })
        while (queueRef.current.length > 0) {
          const buf = queueRef.current.shift()!
          try { t.send({ data: buf }) } catch {}
        }
      })

      t.onMessage((res) => {
        if (unmountedRef.current) return
        try {
          const msg = JSON.parse(res.data as string) as ASRMessage
          if (msg.paragraph_index !== undefined) {
            setPosition({
              paragraph_index: msg.paragraph_index,
              word_index: msg.word_index ?? 0,
              timestamp_ms: Date.now(),
            })
          }
          if (msg.recognized) setRecognizing(msg.recognized)
        } catch { /* ignore */ }
      })

      t.onClose(() => {
        setConnected(false)
        if (!unmountedRef.current && enabled && retriesRef.current < MAX_RETRIES) {
          retriesRef.current++
          setTimeout(connect, 1500)
        }
      })

      t.onError(() => setConnected(false))
    }
  }, [enabled, scriptId, scriptContent, closeQuietly])

  useEffect(() => {
    if (enabled) connect()
    return () => { closeQuietly(socketRef.current) }
  }, [enabled, connect, closeQuietly])

  const sendPCM = useCallback((audio: ArrayBuffer) => {
    const task = socketRef.current
    if (task && connectedRef.current) {
      try { task.send({ data: audio }) } catch {}
    } else if (queueRef.current.length < 50) {
      queueRef.current.push(audio)
    }
  }, [])

  const disconnect = useCallback(() => {
    closeQuietly(socketRef.current)
    retriesRef.current = MAX_RETRIES
  }, [closeQuietly])

  return { position, recognizing, connected, sendPCM, disconnect }
}
