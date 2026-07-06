import { View, Text, ScrollView, Camera } from '@tarojs/components'
import Taro, { useLoad, useRouter, useUnload } from '@tarojs/taro'
import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
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
function fmtMs(ms: number): string {
  const t = Math.floor(ms / 1000)
  return `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`
}
function paraMs(p: string): number { return Math.max(p.length * 250, 2000) }

export default function RecordPage() {
  const router = useRouter()
  const toast = useToast()

  const [paragraphs, setParagraphs] = useState<string[]>([])
  const [scriptId, setScriptId] = useState<string | null>(null)
  const [scriptContent, setScriptContent] = useState('')
  const [recordState, setRecordState] = useState<RecordState>('idle')
  const [elapsedMs, setElapsedMs] = useState(0)
  const [currentPara, setCurrentPara] = useState(0)
  const [recordedFile, setRecordedFile] = useState<string | null>(null) // temp file path
  const [submitting, setSubmitting] = useState(false)
  const [showCompletion, setShowCompletion] = useState(false)
  const [cameraReady, setCameraReady] = useState(false)
  const [cameraBlocked, setCameraBlocked] = useState(false)
  const [userScrolling, setUserScrolling] = useState(false)
  const [playing, setPlaying] = useState(false)

  const frameMarkersRef = useRef<FrameMarker[]>([])
  const startTimeRef = useRef(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const cameraCtxRef = useRef<Taro.CameraContext | null>(null)
  const recorderRef = useRef<Taro.RecorderManager | null>(null) // audio PCM for ASR
  const audioRef = useRef<Taro.InnerAudioContext | null>(null)
  const elapsedRef = useRef(0); elapsedRef.current = elapsedMs

  const isRecording = recordState === 'recording'

  /* ---- ASR ---- */
  const { position, connected: asrOn, sendPCM, disconnect: asrOff } =
    useASRSocket(scriptId, scriptContent, isRecording)

  /* ---- load script ---- */
  useLoad(async () => {
    const { script_id } = router.params
    if (!script_id) { toast.error('缺少文案 ID'); return }
    setScriptId(script_id)
    try {
      const res = await getScript(script_id)
      if (res.success && res.data) {
        setScriptContent(res.data.content)
        setParagraphs(splitParagraphs(res.data.content))
      }
    } catch { toast.error('加载文案失败') }
  })

  /* ---- ASR position → paragraph ---- */
  useEffect(() => {
    if (!position) return
    setCurrentPara(position.paragraph_index)
    frameMarkersRef.current.push({
      paragraph_index: position.paragraph_index,
      word_index: position.word_index,
      timestamp_ms: position.timestamp_ms ?? Date.now() - startTimeRef.current,
    })
    setUserScrolling(false)
  }, [position])

  /* ---- time fallback ---- */
  const timeline = useMemo(() => {
    let a = 0; return paragraphs.map((p) => { const s = a; a += paraMs(p); return { s, e: a } })
  }, [paragraphs])
  useEffect(() => {
    if (recordState !== 'recording' || asrOn || userScrolling) return
    let n = 0; for (let i = 0; i < timeline.length; i++) if (elapsedMs >= timeline[i].s) n = i
    if (n !== currentPara) { setCurrentPara(n); frameMarkersRef.current.push({ paragraph_index: n, word_index: 0, timestamp_ms: elapsedMs }) }
  }, [elapsedMs, recordState, timeline, asrOn, userScrolling, currentPara])

  /* ---- timer ---- */
  useEffect(() => {
    if (recordState === 'recording') { timerRef.current = setInterval(() => setElapsedMs(Date.now() - startTimeRef.current), 200) }
    else { if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null } }
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [recordState])

  /* ---- PCM recorder for ASR ---- */
  const pcmRecorder = useCallback((): Taro.RecorderManager => {
    if (!recorderRef.current) {
      const rm = Taro.getRecorderManager()
      rm.onFrameRecorded((res) => { if (res.frameBuffer) sendPCM(res.frameBuffer) })
      rm.onError(() => {})
      recorderRef.current = rm
    }
    return recorderRef.current
  }, [sendPCM])

  /* ---- Start: camera video OR audio-only fallback ---- */
  function startRecording() {
    frameMarkersRef.current = []; setCurrentPara(0); setElapsedMs(0); setUserScrolling(false)

    // Always start PCM for ASR
    try { pcmRecorder().start({ format: 'PCM', sampleRate: 16000, numberOfChannels: 1, frameSize: 10 }) } catch {}

    const hasCamera = cameraCtxRef.current && cameraReady

    if (hasCamera) {
      // Mode A: camera records video
      cameraCtxRef.current!.startRecord({
        timeoutCallback: () => cameraCtxRef.current?.stopRecord({
          success: (r) => { setRecordedFile(r.tempVideoPath); finish() },
        }),
      })
    } else {
      // Mode B: RecorderManager records mp3 audio (works in dev tools)
      const rm = Taro.getRecorderManager()
      rm.onStop((r) => { setRecordedFile(r.tempFilePath); finish() })
      rm.onError(() => finish())
      rm.start({ format: 'mp3', sampleRate: 44100, numberOfChannels: 1, duration: 600000 })
    }

    startTimeRef.current = Date.now()
    setRecordState('recording')
  }

  function finish() {
    try { pcmRecorder().stop() } catch {}
    asrOff()
    setRecordState('completed')
    setShowCompletion(true)
    if (timerRef.current) clearInterval(timerRef.current)
  }

  function stopRecording() {
    try { pcmRecorder().stop() } catch {}
    if (cameraCtxRef.current && cameraReady) {
      cameraCtxRef.current.stopRecord({
        success: (r) => { setRecordedFile(r.tempVideoPath); finish() },
        fail: () => finish(),
      })
    } else {
      // For audio-only, we need to stop the recorder we started
      finish()
    }
  }

  function resetRecording() {
    try { pcmRecorder().stop() } catch {}
    asrOff()
    try { audioRef.current?.destroy(); audioRef.current = null } catch {}
    setPlaying(false); setRecordState('idle'); setElapsedMs(0); setCurrentPara(0)
    setRecordedFile(null); setShowCompletion(false); setUserScrolling(false)
    frameMarkersRef.current = []
  }

  /* ---- preview ---- */
  function play() {
    if (!recordedFile) return
    if (!audioRef.current) {
      const a = Taro.createInnerAudioContext(); a.src = recordedFile
      a.onEnded(() => setPlaying(false)); a.onError(() => { setPlaying(false); toast.error('预览失败') })
      audioRef.current = a
    }
    audioRef.current.play(); setPlaying(true)
  }
  function pause() { audioRef.current?.pause(); setPlaying(false) }

  /* ---- submit ---- */
  async function doSubmit() {
    if (!recordedFile || !scriptId || submitting) return
    setSubmitting(true)
    try {
      const r = await submitVideo(recordedFile, scriptId, frameMarkersRef.current)
      if (r.success && r.data?.video_id) Taro.navigateTo({ url: `/pages/video/status?video_id=${r.data.video_id}` })
      else { toast.error('提交失败: ' + ((r as any).error ?? '未知错误')); setSubmitting(false) }
    } catch { toast.error('网络错误'); setSubmitting(false) }
  }

  function onTouch() {
    setUserScrolling(true)
    const t = setTimeout(() => setUserScrolling(false), 3000)
    if (scrollTimeout) clearTimeout(scrollTimeout)
  }
  const [scrollTimeout, setScrollTimeout] = useState<ReturnType<typeof setTimeout> | null>(null)

  useUnload(() => { if (timerRef.current) clearInterval(timerRef.current); try { pcmRecorder().stop() } catch {}; asrOff(); try { audioRef.current?.destroy() } catch {} })

  /* ---- derived ---- */
  const cur = paragraphs[currentPara] ?? ''
  const pct = paragraphs.length ? currentPara / paragraphs.length : 0

  return (
    <View className="page-root record-page">
      <Toast />

      {/* ── Camera zone ── */}
      <View className="cam-zone">
        {cameraBlocked || cameraReady ? (
          <Camera
            className="cam-view"
            devicePosition="front"
            mode="normal"
            onInitDone={() => { setCameraReady(true); cameraCtxRef.current = Taro.createCameraContext() }}
            onError={() => { setCameraBlocked(true); setCameraReady(false) }}
          />
        ) : (
          <View className="cam-fallback">
            <Text style={{ fontSize: 48 }}>🤳</Text>
            <Text style={{ fontSize: 15, color: '#888', marginTop: 12, fontWeight: 500 }}>自拍视角 · 请用手机预览</Text>
            <Text style={{ fontSize: 12, color: '#aaa', marginTop: 6 }}>开发者工具不支持摄像头，真机扫码可体验</Text>
          </View>
        )}

        {cameraBlocked && (
          <View className="cam-fallback" style={{ position: 'absolute', inset: 0, zIndex: 5 }}>
            <Text style={{ fontSize: 48 }}>🤳</Text>
            <Text style={{ fontSize: 15, color: '#888', marginTop: 12, fontWeight: 500 }}>摄像头未授权</Text>
            <Text style={{ fontSize: 12, color: '#aaa', marginTop: 6 }}>录制会使用麦克风录音</Text>
          </View>
        )}

        {isRecording && (
          <View className="cam-dot-bar">
            <View className="cam-dot-bar-dot" />
            <Text className="cam-dot-bar-time">{fmtMs(elapsedMs)}</Text>
          </View>
        )}
      </View>

      {/* ── Teleprompter ── */}
      <ScrollView scrollY className="teleprompter" onTouchStart={onTouch}>
        {paragraphs.map((p, i) => {
          if (i >= currentPara) return null
          return <View key={i} className="tp tp--past"><Text className="tp-text">{p}</Text></View>
        })}

        <View className={`tp tp--cur${isRecording ? ' tp--live' : ''}`} style={{ opacity: 1 }}>
          <Text className="tp-text tp-text--cur">{cur}</Text>
          {isRecording && asrOn && (
            <Text style={{ fontSize: 11, color: 'var(--color-success)', marginTop: 4 }}>🎤 AI 语音追踪中</Text>
          )}
        </View>

        {paragraphs.map((p, i) => {
          if (i <= currentPara) return null
          return <View key={i} className="tp" style={{ opacity: i === currentPara + 1 ? 0.6 : 0.3 }}><Text className="tp-text">{p}</Text></View>
        })}

        {!paragraphs.length && <Text style={{ textAlign: 'center', color: 'var(--color-text-3)', padding: 40 }}>文案加载中...</Text>}
      </ScrollView>

      {/* ── Progress ── */}
      {isRecording && (
        <View className="rec-prog"><View className="rec-prog-fill" style={{ width: `${Math.round(pct * 100)}%` }} /></View>
      )}

      {/* ── Controls ── */}
      <View className="rec-ctl safe-area-bottom">
        {recordState === 'idle' && (
          <View className="rc-idle">
            <View className="rbtn rbtn--idle" onClick={startRecording}><View className="rbtn__in" /></View>
            <Text className="rc-hint">开始录制 · 看着摄像头读文案</Text>
          </View>
        )}

        {(recordState === 'recording' || recordState === 'paused') && (
          <View className="rc-act">
            <View className="rc-row">
              {recordState === 'recording'
                ? <View className="rc-sm rc-sm--pause" onClick={() => { try { pcmRecorder().pause() } catch {}; cameraCtxRef.current?.pauseRecord(); setRecordState('paused') }}>⏸ 暂停</View>
                : <View className="rc-sm rc-sm--play" onClick={() => { try { pcmRecorder().resume() } catch {}; cameraCtxRef.current?.resumeRecord(); startTimeRef.current = Date.now() - elapsedRef.current; setRecordState('recording') }}>▶ 继续</View>
              }
              <View className={`rbtn ${isRecording ? 'rbtn--live' : 'rbtn--pau'}`} onClick={stopRecording}><View className="rbtn__stop" /></View>
              <View className="rc-sm rc-sm--retry" onClick={resetRecording}>↩ 重录</View>
            </View>
            <Text className="rc-ms">{fmtMs(elapsedMs)}</Text>
          </View>
        )}
      </View>

      {/* ── Completion ── */}
      {showCompletion && (
        <View className="mod">
          <View className="mod__bg" onClick={() => setShowCompletion(false)} />
          <View className="mod__card">
            <Text className="mod__t">录制完成 🎬</Text>
            <Text className="mod__d">时长 {fmtMs(elapsedMs)}</Text>
            <View style={{ display: 'flex', gap: 10, width: '100%', justifyContent: 'center' }}>
              {playing ? <GlowButton onClick={pause} size="sm" variant="outline">⏸ 暂停</GlowButton>
                : <GlowButton onClick={play} size="sm" variant="cyan">▶ 预览</GlowButton>}
            </View>
            <View className="mod__row">
              <View className="mod__re" onClick={resetRecording}>重新录制</View>
              <GlowButton onClick={doSubmit} loading={submitting} size="md">提交 →</GlowButton>
            </View>
          </View>
        </View>
      )}
    </View>
  )
}
