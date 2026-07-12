import { View, Text, ScrollView, Camera, Video } from '@tarojs/components'
import Taro, { useLoad, useRouter, useUnload } from '@tarojs/taro'
import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import GlowButton from '../../components/glow-button'
import Icon from '../../components/icon'
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
  const [recordedFile, setRecordedFile] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [showCompletion, setShowCompletion] = useState(false)
  const [cameraReady, setCameraReady] = useState(false)
  const [cameraBlocked, setCameraBlocked] = useState(false)
  const [userScrolling, setUserScrolling] = useState(false)
  const [playing, setPlaying] = useState(false)
  const [showVideoPreview, setShowVideoPreview] = useState(false)
  const isVideoFile = recordedFile?.endsWith('.mp4') ?? false

  const frameMarkersRef = useRef<FrameMarker[]>([])
  const startTimeRef = useRef(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const cameraCtxRef = useRef<Taro.CameraContext | null>(null)
  const recorderRef = useRef<Taro.RecorderManager | null>(null)
  const audioRef = useRef<Taro.InnerAudioContext | null>(null)
  const elapsedRef = useRef(0); elapsedRef.current = elapsedMs

  const isRecording = recordState === 'recording'
  const scrollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const { position, connected: asrOn, sendPCM, disconnect: asrOff } =
    useASRSocket(scriptId, scriptContent, isRecording)

  useLoad(async () => {
    Taro.setNavigationBarTitle({ title: '录制' })
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

  useEffect(() => {
    if (!position) return
    setCurrentPara(position.paragraph_index)
    frameMarkersRef.current.push({ paragraph_index: position.paragraph_index, word_index: position.word_index, timestamp_ms: position.timestamp_ms ?? Date.now() - startTimeRef.current })
    setUserScrolling(false)
  }, [position])

  const timeline = useMemo(() => {
    let a = 0; return paragraphs.map((p) => { const s = a; a += paraMs(p); return { s, e: a } })
  }, [paragraphs])

  useEffect(() => {
    if (recordState !== 'recording' || asrOn || userScrolling) return
    let n = 0; for (let i = 0; i < timeline.length; i++) if (elapsedMs >= timeline[i].s) n = i
    if (n !== currentPara) { setCurrentPara(n); frameMarkersRef.current.push({ paragraph_index: n, word_index: 0, timestamp_ms: elapsedMs }) }
  }, [elapsedMs, recordState, timeline, asrOn, userScrolling, currentPara])

  useEffect(() => {
    if (recordState === 'recording') timerRef.current = setInterval(() => setElapsedMs(Date.now() - startTimeRef.current), 200)
    else { if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null } }
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [recordState])

  const pcmRecorder = useCallback((): Taro.RecorderManager => {
    if (!recorderRef.current) {
      const rm = Taro.getRecorderManager()
      rm.onFrameRecorded((res) => { if (res.frameBuffer) sendPCM(res.frameBuffer) })
      rm.onError(() => {})
      recorderRef.current = rm
    }
    return recorderRef.current
  }, [sendPCM])

  function startRecording() {
    frameMarkersRef.current = []; setCurrentPara(0); setElapsedMs(0); setUserScrolling(false)
    const hasCamera = cameraCtxRef.current && cameraReady
    if (hasCamera) {
      try { pcmRecorder().start({ format: 'PCM', sampleRate: 16000, numberOfChannels: 1, frameSize: 10 }) } catch {}
      cameraCtxRef.current!.startRecord({ timeoutCallback: () => cameraCtxRef.current?.stopRecord({ success: (r) => { setRecordedFile(r.tempVideoPath); finish() } }) })
    } else {
      const rm = pcmRecorder()
      rm.onStop((r) => { setRecordedFile(r.tempFilePath); finish() })
      rm.onError((e) => { console.error('Recorder error:', e) })
      rm.start({ format: 'mp3', sampleRate: 44100, numberOfChannels: 1, encodeBitRate: 128000, duration: 600000 })
    }
    startTimeRef.current = Date.now()
    setRecordState('recording')
  }

  function finish() {
    try { pcmRecorder().stop() } catch {}
    asrOff()
    setRecordState('completed'); setShowCompletion(true)
    if (timerRef.current) clearInterval(timerRef.current)
  }

  function stopRecording() {
    if (cameraCtxRef.current && cameraReady) {
      try { pcmRecorder().stop() } catch {}
      cameraCtxRef.current.stopRecord({ success: (r) => { setRecordedFile(r.tempVideoPath); finish() }, fail: () => finish() })
    } else { try { Taro.getRecorderManager().stop() } catch {} }
  }

  function resetRecording() {
    try { pcmRecorder().stop() } catch {}; try { Taro.getRecorderManager().stop() } catch {}
    asrOff(); try { audioRef.current?.destroy(); audioRef.current = null } catch {}
    setPlaying(false); setShowVideoPreview(false); setRecordState('idle'); setElapsedMs(0); setCurrentPara(0)
    setRecordedFile(null); setShowCompletion(false); setUserScrolling(false)
    frameMarkersRef.current = []
  }

  function play() {
    if (!recordedFile) return
    if (isVideoFile) { setShowVideoPreview(true); return }
    if (!audioRef.current) {
      const a = Taro.createInnerAudioContext(); a.src = recordedFile
      a.onEnded(() => setPlaying(false)); a.onError(() => { setPlaying(false); toast.error('预览失败') })
      audioRef.current = a
    }
    audioRef.current.play(); setPlaying(true)
  }
  function pause() { audioRef.current?.pause(); setPlaying(false) }

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
    if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current)
    scrollTimeoutRef.current = t
  }

  useUnload(() => { if (timerRef.current) clearInterval(timerRef.current); try { pcmRecorder().stop() } catch {}; asrOff(); try { audioRef.current?.destroy() } catch {} })

  const cur = paragraphs[currentPara] ?? ''
  const pct = paragraphs.length ? currentPara / paragraphs.length : 0

  return (
    <View className="page-root record-page">
      <Toast />

      {/* ── Camera (top) ── */}
      <View className="cam-zone">
        {cameraBlocked || cameraReady ? (
          <Camera className="cam-view" devicePosition="front" mode="normal"
            onInitDone={() => { setCameraReady(true); cameraCtxRef.current = Taro.createCameraContext() }}
            onError={() => { setCameraBlocked(true); setCameraReady(false) }} />
        ) : (
          <View className="cam-fallback">
            <Icon name="camera" size={32} color="var(--color-text-3)" />
            <Text style={{ fontSize: 13, color: 'var(--color-text-3)', marginTop: 8 }}>摄像头 · 真机扫码可用</Text>
          </View>
        )}
        {cameraBlocked && (
          <View className="cam-fallback" style={{ position: 'absolute', inset: 0, zIndex: 5 }}>
            <Icon name="mic" size={32} color="var(--color-text-3)" />
            <Text style={{ fontSize: 13, color: 'var(--color-text-3)', marginTop: 8 }}>未授权 · 使用麦克风录音</Text>
          </View>
        )}
        {isRecording && (
          <View className="cam-dot">
            <View className="cam-dot__d" />
            <Text className="cam-dot__t">{fmtMs(elapsedMs)}</Text>
          </View>
        )}
      </View>

      {/* ── Teleprompter (scrollable middle) ── */}
      <ScrollView scrollY className="teleprompter" onTouchStart={onTouch}>
        <View className="teleprompter-inner">
          {paragraphs.map((p, i) => {
            if (i >= currentPara) return null
            return <View key={i} className="tp tp--past"><Text className="tp-text">{p}</Text></View>
          })}
          <View className={`tp tp--cur${isRecording ? ' tp--live' : ''}`} style={{ opacity: 1 }}>
            <Text className="tp-text tp-text--cur">{cur}</Text>
            {isRecording && asrOn && (
              <View style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 4 }}>
                <Icon name="mic" size={11} color="var(--color-success)" />
                <Text style={{ fontSize: 11, color: 'var(--color-success)' }}>语音追踪中</Text>
              </View>
            )}
          </View>
          {paragraphs.map((p, i) => {
            if (i <= currentPara) return null
            return <View key={i} className="tp" style={{ opacity: i === currentPara + 1 ? .5 : .25 }}><Text className="tp-text">{p}</Text></View>
          })}
          {!paragraphs.length && <Text style={{ textAlign: 'center', color: 'var(--color-text-3)', padding: 40 }}>文案加载中…</Text>}
        </View>
      </ScrollView>

      {/* ── Progress ── */}
      {isRecording && <View className="rec-bar"><View className="rec-bar__f" style={{ width: `${Math.round(pct * 100)}%` }} /></View>}

      {/* ── Controls ── */}
      <View className="rec-ctl safe-area-bottom">
        {recordState === 'idle' && (
          <View className="ctl-idle">
            <View className="rbtn rbtn--idle" onClick={startRecording}><View className="rbtn__in" /></View>
            <Text className="ctl-hint">轻点开始录制 · 看着镜头朗读文案</Text>
          </View>
        )}
        {(recordState === 'recording' || recordState === 'paused') && (
          <View className="ctl-act">
            <View className="ctl-row">
              {recordState === 'recording'
                ? <View className="ctl-sm ctl-sm--pause" onClick={() => { try { pcmRecorder().pause() } catch {}; cameraCtxRef.current?.pauseRecord(); setRecordState('paused') }}>暂停</View>
                : <View className="ctl-sm ctl-sm--play" onClick={() => { try { pcmRecorder().resume() } catch {}; cameraCtxRef.current?.resumeRecord(); startTimeRef.current = Date.now() - elapsedRef.current; setRecordState('recording') }}>继续</View>
              }
              <View className={`rbtn ${isRecording ? 'rbtn--live' : 'rbtn--pau'}`} onClick={stopRecording}><View className="rbtn__stop" /></View>
              <View className="ctl-sm ctl-sm--retry" onClick={resetRecording}>重录</View>
            </View>
            <Text className="ctl-time">{fmtMs(elapsedMs)}</Text>
          </View>
        )}
      </View>

      {/* ── Completion Sheet ── */}
      {showCompletion && (
        <View className="sheet">
          <View className="sheet__bg" onClick={() => { setShowCompletion(false); setShowVideoPreview(false) }} />
          <View className="sheet__card">
            <View className="sheet__handle" />

            {showVideoPreview && isVideoFile ? (
              <View className="sheet__video">
                <Video className="sheet__video-el" src={recordedFile!} autoplay controls showCenterPlayBtn={false} onEnded={() => setShowVideoPreview(false)} />
                <View className="sheet__video-x" onClick={() => setShowVideoPreview(false)}>✕</View>
              </View>
            ) : (
              <>
                <Text className="sheet__t">录制完成</Text>
                <Text className="sheet__d">时长 {fmtMs(elapsedMs)}</Text>
                {!isVideoFile && (
                  <View style={{ display: 'flex', gap: 10, width: '100%', justifyContent: 'center' }}>
                    {playing ? <GlowButton onClick={pause} size="sm" variant="outline">暂停</GlowButton>
                      : <GlowButton onClick={play} size="sm" variant="outline">预览</GlowButton>}
                  </View>
                )}
                <View className="sheet__row">
                  <View className="sheet__re" onClick={resetRecording}>重新录制</View>
                  <GlowButton onClick={doSubmit} loading={submitting} size="md" fullWidth>提交</GlowButton>
                </View>
              </>
            )}
          </View>
        </View>
      )}
    </View>
  )
}
