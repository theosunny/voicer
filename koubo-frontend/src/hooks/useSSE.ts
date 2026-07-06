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

export function useSSE(path: string, body: unknown, enabled: boolean): UseSSEResult {
  const [chunks, setChunks] = useState<string[]>([])
  const [fullText, setFullText] = useState('')
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [scriptId, setScriptId] = useState<string | null>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const taskRef = useRef<Taro.RequestTask<any> | null>(null)
  const bufferRef = useRef('')

  useEffect(() => {
    if (!enabled) return
    setChunks([])
    setFullText('')
    setDone(false)
    setError(null)
    setScriptId(null)
    bufferRef.current = ''

    const url = `${API_BASE}${path}`
    const isMiniProgram = typeof wx !== 'undefined' || typeof tt !== 'undefined'

    function processSSEText(text: string) {
      bufferRef.current += text
      const lines = bufferRef.current.split('\n')
      bufferRef.current = lines.pop() ?? ''
      for (const line of lines) {
        if (!line.startsWith('data: ')) continue
        const jsonStr = line.slice(6).trim()
        if (!jsonStr || jsonStr === '[DONE]') continue
        try {
          const evt = JSON.parse(jsonStr) as SSEEvent
          if (evt.error) {
            setError(evt.error)
          } else if (evt.type === 'done' || evt.done) {
            setDone(true)
            if (evt.script_id) setScriptId(evt.script_id)
          } else {
            const chunk = evt.chunk ?? evt.content ?? ''
            if (chunk) {
              setChunks((prev) => [...prev, chunk])
              setFullText((prev) => prev + chunk)
            }
          }
        } catch {
          // ignore malformed JSON
        }
      }
    }

    if (isMiniProgram) {
      taskRef.current = Taro.request({
        url,
        method: 'POST',
        data: body,
        header: { 'Content-Type': 'application/json' },
        enableChunked: true,
        success: () => {},
        fail: (err: { errMsg?: string }) => setError(err.errMsg ?? 'Request failed'),
      }) as unknown as Taro.RequestTask<unknown>
      taskRef.current.onChunkReceived?.((res: { data: ArrayBuffer }) => {
        const text = new TextDecoder().decode(new Uint8Array(res.data))
        processSSEText(text)
      })
    } else {
      const controller = new AbortController()
      fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: controller.signal,
      })
        .then(async (res) => {
          const reader = res.body?.getReader()
          if (!reader) { setError('No response body'); return }
          const decoder = new TextDecoder()
          while (true) {
            const { done: streamDone, value } = await reader.read()
            if (streamDone) break
            processSSEText(decoder.decode(value, { stream: true }))
          }
        })
        .catch((err: Error) => {
          if (err.name !== 'AbortError') setError(err.message)
        })
      return () => controller.abort()
    }

    return () => {
      taskRef.current?.abort()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, path, JSON.stringify(body)])

  return { chunks, fullText, done, error, scriptId }
}
