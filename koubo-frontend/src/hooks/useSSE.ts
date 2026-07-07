import Taro from '@tarojs/taro'
import { useState, useEffect, useRef } from 'react'
import { API_BASE } from '../api/client'

interface SSEEvent {
  type?: string
  chunk?: string
  content?: string
  done?: boolean
  error?: string
  script_id?: string
}

interface UseSSEResult {
  chunks: string[]
  fullText: string
  done: boolean
  error: string | null
  scriptId: string | null
}

function isRealDevice(): boolean {
  try {
    const sys = Taro.getSystemInfoSync?.()
    // devtools = no chunked support; iOS/Android = chunked works
    if (sys && sys.platform !== 'devtools') return true
  } catch { /* ignore */ }
  return false
}

export function useSSE(path: string, body: unknown, enabled: boolean): UseSSEResult {
  const [chunks, setChunks] = useState<string[]>([])
  const [fullText, setFullText] = useState('')
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [scriptId, setScriptId] = useState<string | null>(null)
  const cancelledRef = useRef(false)

  useEffect(() => {
    if (!enabled) return
    setChunks([])
    setFullText('')
    setDone(false)
    setError(null)
    setScriptId(null)
    cancelledRef.current = false

    let url = `${API_BASE}${path}`
    const device = isRealDevice()

    function parseSSEBody(text: string) {
      if (typeof text !== 'string' || !text) return
      const lines = text.split('\n')
      for (const line of lines) {
        if (!line.startsWith('data: ')) continue
        const jsonStr = line.slice(6).trim()
        if (!jsonStr || jsonStr === '[DONE]') continue
        try {
          const evt = JSON.parse(jsonStr) as SSEEvent
          if (evt.error) { setError(evt.error); return }
          if (evt.type === 'done' || evt.done) {
            if (!cancelledRef.current) {
              setDone(true)
              if (evt.script_id) setScriptId(evt.script_id)
            }
            return
          }
          const chunk = evt.chunk ?? evt.content ?? ''
          if (chunk && !cancelledRef.current) {
            setChunks((prev) => [...prev, chunk])
            setFullText((prev) => prev + chunk)
          }
        } catch { /* ignore */ }
      }
    }

    if (!device) {
      // Dev tools: plain JSON POST
      url += (url.includes('?') ? '&' : '?') + 'stream=0'
      Taro.request({
        url,
        method: 'POST',
        data: body,
        header: { 'Content-Type': 'application/json' },
        success: (res) => {
          if (cancelledRef.current) return
          const obj = (res as { data?: unknown }).data as Record<string, unknown> | undefined
          if (obj?.success) {
            const data = obj.data as { id?: string; content?: string } | undefined
            if (data?.content) {
              setFullText(data.content)
              setChunks([data.content])
            }
            if (data?.id) {
              setScriptId(data.id)
              setDone(true)
            }
          } else if (obj?.error) {
            setError(String(obj.error))
          } else {
            // Maybe SSE body was returned raw — try parsing
            const raw = (res as { data?: unknown }).data
            if (typeof raw === 'string') parseSSEBody(raw)
            if (!done) setDone(true)
          }
        },
        fail: (err: { errMsg?: string }) => {
          if (!cancelledRef.current) setError(err.errMsg ?? 'Request failed')
        },
      })
      return () => { cancelledRef.current = true }
    }

    // Real device: SSE via enableChunked
    const task = Taro.request({
      url,
      method: 'POST',
      data: body,
      header: { 'Content-Type': 'application/json' },
      enableChunked: true,
      success: () => {
        // chunks arrived via onChunkReceived — nothing to do here
      },
      fail: (err: { errMsg?: string }) => {
        if (!cancelledRef.current) setError(err.errMsg ?? 'Request failed')
      },
    })
    task.onChunkReceived?.((res: { data: ArrayBuffer }) => {
      if (cancelledRef.current) return
      const text = new TextDecoder().decode(new Uint8Array(res.data))
      parseSSEBody(text)
    })
    return () => { cancelledRef.current = true; task.abort() }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, path, JSON.stringify(body)])

  return { chunks, fullText, done, error, scriptId }
}
