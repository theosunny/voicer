import { useState, useEffect, useRef } from 'react'
import { getVideoStatus } from '../api/video'
import type { VideoStatus } from '../types/api'

const POLL_INTERVAL_MS = 3000

interface UseVideoPollerResult {
  status: VideoStatus | null
  loading: boolean
}

export function useVideoPoller(videoId: string | null): UseVideoPollerResult {
  const [status, setStatus] = useState<VideoStatus | null>(null)
  const [loading, setLoading] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const activeRef = useRef(true)

  useEffect(() => {
    if (!videoId) return
    activeRef.current = true

    async function poll() {
      if (!activeRef.current) return
      setLoading(true)
      try {
        const res = await getVideoStatus(videoId!)
        if (!activeRef.current) return
        if (res.success && res.data) {
          setStatus(res.data)
          if (res.data.status === 'processing') {
            timerRef.current = setTimeout(poll, POLL_INTERVAL_MS)
          }
        }
      } catch {
        if (activeRef.current) {
          timerRef.current = setTimeout(poll, POLL_INTERVAL_MS)
        }
      } finally {
        if (activeRef.current) setLoading(false)
      }
    }

    poll()

    return () => {
      activeRef.current = false
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [videoId])

  return { status, loading }
}
