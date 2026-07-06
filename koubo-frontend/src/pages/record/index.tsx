import { View, Text } from '@tarojs/components'
import Taro, { useLoad, useRouter, useUnload } from '@tarojs/taro'
import { useState, useEffect, useRef, useCallback } from 'react'
import GlowButton from '../../components/glow-button'
import Toast, { useToast } from '../../components/toast'
import { getScript } from '../../api/script'
import { submitVideo } from '../../api/video'
import { useASRSocket } from '../../hooks/useASRSocket'
import type { FrameMarker } from '../../types/api'
import './index.scss'

type RecordState = 'idle' | 'recording' | 'paused' | 'completed'

function splitParagraphs(text: string): string[] {
  return text.split(/\n\n+/).map((p) => p.trim()).filter(Boolean)
}

function formatTime(ms: number): string {
  const total = Math.floor(ms / 1000)
  const m = Math.floor(total / 60).toString().padStart(2, '0')
  const s = (total % 60).toString().padStart(2, '0')
  return `${m}:${s}`
}

export default function RecordPage() {
  const router = useRouter()
  const toast = useToast()

  const [paragraphs, setParagraphs] = useState<string[]>([])
  const [scriptId, setScriptId] = useState<string | null>(null)
  const [recordState, setRecordState] = useState<RecordState>('idle')
  const [elapsedMs, setElapsedMs] = useState(0)
  const [currentPara, setCurrentPara] = useState(0)
  const [tempFilePath, setTempFilePath] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [showCompletion, setShowCompletion] = useState(false)

  const frameMarkersRef = useRef<FrameMarker[]>([])
  const startTimeRef = useRef(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const recorderRef = useRef<Taro.RecorderManager | null>(null)
  const elapsedRef = useRef(0)
  elapsedRef.current = elapsedMs

  const isRecording = recordState === 'recording'
  const { position, recognizing, connected, send, disconnect } = useASRSocket(paragraphs, isRecording)

  useLoad(async () => {
    const { script_id } = router.params
    if (!script_id) { toast.error('缺少文案 ID'); return }
    setScriptId(script_id)
    try {
      const res = await getScript(script_id)
      if (res.success && res.data) setParagraphs(splitParagraphs(res.data.content))
    } catch {
      toast.error('加载文案失败')
    }
  })

  useEffect(() => {
    if (!position) return
    setCurrentPara(position.paragraph_index)
    frameMarkersRef.current.push({
      paragraph_index: position.paragraph_index,
      word_index: position.word_index,
      timestamp_ms: Date.now() - startTimeRef.current,
    })
  }, [position])

  useEffect(() => {
    if (recordState === 'recording') {
      timerRef.current = setInterval(() => setElapsedMs(Date.now() - startTimeRef.current), 200)
    } else {
      if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [recordState])

  const getRecorder = useCallback((): Taro.RecorderManager => {
    if (!recorderRef.current) {
      recorderRef.current = Taro.getRecorderManager()
      recorderRef.current.onStart(() => { startTimeRef.current = Date.now(); setRecordState('recording') })
      recorderRef.current.onPause(() => setRecordState('paused'))
      recorderRef.current.onResume(() => { startTimeRef.current = Date.now() - elapsedRef.current; setRecordState('recording') })
      recorderRef.current.onStop((res) => { setTempFilePath(res.tempFilePath); setRecordState('completed'); setShowCompletion(true); disconnect() })
      recorderRef.current.onFrameRecorded((res) => { if (res.frameBuffer) send(res.frameBuffer) })
      recorderRef.current.onError((err) => { toast.error('录音错误: ' + (err as { errMsg?: string }).errMsg); setRecordState('idle') })
    }
    return recorderRef.current
  }, [disconnect, send, toast])

  function startRecording() {
    frameMarkersRef.current = []
    setCurrentPara(0)
    setElapsedMs(0)
    getRecorder().start({ format: 'mp3', sampleRate: 16000, numberOfChannels: 1, frameSize: 4 })
  }

  function resetRecording() {
    try { getRecorder().stop() } catch {}
    setRecordState('idle')
    setElapsedMs(0)
    setCurrentPara(0)
    setTempFilePath(null)
    setShowCompletion(false)
    frameMarkersRef.current = []
  }

  async function handleSubmit() {
    if (!tempFilePath || !scriptId || submitting) return
    setSubmitting(true)
    try {
      const res = await submitVideo(tempFilePath, scriptId, frameMarkersRef.current)
      if (res.success && res.data?.video_id) {
        Taro.navigateTo({ url: `/pages/video/status?video_id=${res.data.video_id}` })
      } else {
        toast.error('提交失败，请重试')
        setSubmitting(false)
      }
    } catch {
      toast.error('网络错误，请重试')
      setSubmitting(false)
    }
  }

  useUnload(() => { if (timerRef.current) clearInterval(timerRef.current); disconnect() })

  const indices = [currentPara - 1, currentPara, currentPara + 1, currentPara + 2]

  return (
    <View className="page-root record-page">
      <Toast />
      <View className="record-page__header">
        <View className="record-page__back" onClick={() => Taro.navigateBack()}>←</View>
        <Text className="record-page__title">提词器 · 录制</Text>
        <View className="record-page__asr-status">
          <View className={`asr-dot ${connected ? 'asr-dot--active' : ''}`} />
          <Text className="asr-label">{connected ? 'ASR' : '---'}</Text>
        </View>
      </View>

      <View className="teleprompter">
        {indices.map((i) => {
          if (i < 0 || i >= paragraphs.length) return null
          const isCurrent = i === currentPara
          const opacity = isCurrent ? 1 : i === currentPara - 1 ? 0.4 : i === currentPara + 1 ? 0.4 : 0.2
          return (
            <View key={i} className={`teleprompter__para ${isCurrent ? 'teleprompter__para--current' : ''}`} style={{ opacity }}>
              <Text className="teleprompter__para-text">{paragraphs[i]}</Text>
            </View>
          )
        })}
        {recognizing ? <Text className="teleprompter__recognizing">{recognizing}</Text> : null}
      </View>

      <View className="record-page__controls safe-area-bottom">
        {recordState === 'idle' && (
          <View className="record-page__idle-controls">
            <View className="record-btn record-btn--idle" onClick={startRecording}>
              <View className="record-btn__inner" />
            </View>
            <Text className="record-page__hint">点击开始录制</Text>
          </View>
        )}
        {(recordState === 'recording' || recordState === 'paused') && (
          <View className="record-page__active-controls">
            <Text className="record-page__timer">{formatTime(elapsedMs)}</Text>
            <View className="record-page__btns">
              {recordState === 'recording'
                ? <View className="ctrl-btn ctrl-btn--pause" onClick={() => getRecorder().pause()}>⏸ 暂停</View>
                : <View className="ctrl-btn ctrl-btn--resume" onClick={() => getRecorder().resume()}>▶ 继续</View>
              }
              <View className={`record-btn ${recordState === 'recording' ? 'record-btn--recording' : 'record-btn--paused'}`} onClick={() => getRecorder().stop()}>
                <View className="record-btn__stop" />
              </View>
              <View className="ctrl-btn ctrl-btn--reset" onClick={resetRecording}>↩ 重录</View>
            </View>
          </View>
        )}
      </View>

      {showCompletion && (
        <View className="completion-modal">
          <View className="completion-modal__backdrop" onClick={() => setShowCompletion(false)} />
          <View className="completion-modal__card">
            <Text className="completion-modal__title">录制完成 🎬</Text>
            <Text className="completion-modal__duration">录制时长：{formatTime(elapsedMs)}</Text>
            <View className="completion-modal__actions">
              <View className="completion-modal__reset" onClick={resetRecording}>重新录制</View>
              <GlowButton onClick={handleSubmit} loading={submitting} size="md">提交剪辑 →</GlowButton>
            </View>
          </View>
        </View>
      )}
    </View>
  )
}
