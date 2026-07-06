import { View, Text } from '@tarojs/components'
import Taro, { useRouter } from '@tarojs/taro'
import { useState, useEffect, useRef } from 'react'
import HudCard from '../../components/hud-card'
import GlowButton from '../../components/glow-button'
import StepProgress from '../../components/step-progress'
import Toast, { useToast } from '../../components/toast'
import { useVideoPoller } from '../../hooks/useVideoPoller'
import { API_BASE } from '../../api/client'
import type { VideoStatus } from '../../types/api'
import './status.scss'

type StepState = 'done' | 'active' | 'pending' | 'error'

function buildSteps(status: VideoStatus | null): Array<{ label: string; state: StepState }> {
  if (!status) return [
    { label: '上传完成', state: 'done' },
    { label: '剪辑处理', state: 'pending' },
    { label: '生成完成', state: 'pending' },
  ]
  if (status.status === 'processing') return [
    { label: '上传完成', state: 'done' },
    { label: '剪辑处理', state: 'active' },
    { label: '生成完成', state: 'pending' },
  ]
  if (status.status === 'completed') return [
    { label: '上传完成', state: 'done' },
    { label: '剪辑处理', state: 'done' },
    { label: '生成完成', state: 'done' },
  ]
  return [
    { label: '上传完成', state: 'done' },
    { label: '剪辑处理', state: 'error' },
    { label: '生成完成', state: 'pending' },
  ]
}

export default function VideoStatusPage() {
  const router = useRouter()
  const toast = useToast()
  const videoId = router.params.video_id ?? null
  const { status } = useVideoPoller(videoId)
  const steps = buildSteps(status)
  const isProcessing = !status || status.status === 'processing'
  const isCompleted = status?.status === 'completed'
  const isFailed = status?.status === 'failed'

  // ---- audio player ----
  const [playing, setPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [audioDuration, setAudioDuration] = useState(0)
  const audioCtxRef = useRef<Taro.InnerAudioContext | null>(null)

  useEffect(() => {
    return () => {
      if (audioCtxRef.current) { audioCtxRef.current.destroy(); audioCtxRef.current = null }
    }
  }, [])

  function getAudioUrl(): string | null {
    if (!status?.processed_video_url) return null
    const url = status.processed_video_url
    // If it's already an absolute URL, use it directly
    if (url.startsWith('http://') || url.startsWith('https://')) return url
    // Otherwise prepend API base
    return API_BASE + url
  }

  function playAudio() {
    const url = getAudioUrl()
    if (!url) { toast.error('音频文件不可用'); return }

    if (!audioCtxRef.current) {
      const ctx = Taro.createInnerAudioContext()
      ctx.src = url
      ctx.autoplay = false
      ctx.onPlay(() => setPlaying(true))
      ctx.onPause(() => setPlaying(false))
      ctx.onStop(() => { setPlaying(false); setCurrentTime(0) })
      ctx.onEnded(() => { setPlaying(false); setCurrentTime(0) })
      ctx.onTimeUpdate(() => setCurrentTime(Math.floor(ctx.currentTime)))
      ctx.onCanplay(() => setAudioDuration(Math.floor(ctx.duration)))
      ctx.onError((err) => {
        setPlaying(false)
        toast.error('播放失败: ' + (err as any).errMsg)
      })
      audioCtxRef.current = ctx
    }

    audioCtxRef.current.play()
  }

  function pauseAudio() {
    audioCtxRef.current?.pause()
  }

  function formatSeconds(s: number): string {
    const m = Math.floor(s / 60).toString().padStart(2, '0')
    const sec = (s % 60).toString().padStart(2, '0')
    return `${m}:${sec}`
  }

  function handleSave() {
    const url = getAudioUrl()
    if (!url) { toast.error('文件不可用'); return }

    Taro.showLoading({ title: '下载中...' })
    Taro.downloadFile({
      url,
      success: (res) => {
        Taro.hideLoading()
        if (res.statusCode === 200) {
          // Save to album — for audio, we share it instead
          Taro.shareFileMessage({
            filePath: res.tempFilePath,
            success: () => {},
            fail: () => {
              // Fallback: open the file
              Taro.openDocument({
                filePath: res.tempFilePath,
                showMenu: true,
                success: () => toast.success('文件已打开'),
                fail: () => toast.error('无法打开文件'),
              })
            },
          })
        } else {
          toast.error('下载失败')
        }
      },
      fail: () => {
        Taro.hideLoading()
        toast.error('下载失败，请检查网络')
      },
    })
  }

  return (
    <View className="page-root status-page">
      <Toast />
      <View className="status-page__header">
        <View className="status-page__back" onClick={() => Taro.navigateBack()}>←</View>
        <Text className="status-page__title">录音处理</Text>
        <View className="status-page__ph" />
      </View>
      <View className="status-page__body">
        <HudCard color={isFailed ? 'hot' : isCompleted ? 'cyan' : 'primary'}>
          <StepProgress steps={steps} />
        </HudCard>

        {isProcessing && (
          <HudCard className="status-page__processing-card">
            <View className="processing-anim">
              <Text className="processing-anim__icon">🎬</Text>
              <View className="processing-anim__bars">
                <View className="bar" /><View className="bar" /><View className="bar" />
                <View className="bar" /><View className="bar" />
              </View>
            </View>
            <Text className="status-page__processing-label">处理中...</Text>
            <Text className="status-page__processing-hint">稍等片刻</Text>
          </HudCard>
        )}

        {isCompleted && (
          <View className="status-page__completed">
            {/* Audio player card */}
            <HudCard color="cyan">
              <View style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <View style={{
                  width: 48, height: 48, borderRadius: '50%',
                  background: 'var(--color-primary-dim)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '20px',
                }}>
                  {playing ? '⏸' : '▶'}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontWeight: 600, fontSize: '14px', color: 'var(--color-text-1)' }}>
                    录音已就绪 ✓
                  </Text>
                  <View style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px' }}>
                    {/* Progress bar */}
                    <View style={{
                      flex: 1, height: 3, borderRadius: 2,
                      background: 'var(--border-default)',
                      overflow: 'hidden',
                    }}>
                      <View style={{
                        height: '100%', width: audioDuration > 0 ? `${(currentTime / audioDuration) * 100}%` : '0%',
                        background: 'var(--color-primary)',
                        transition: 'width 200ms linear',
                      }} />
                    </View>
                    <Text style={{ fontSize: '11px', color: 'var(--color-text-3)', fontFamily: 'var(--font-mono)' }}>
                      {formatSeconds(currentTime)}/{audioDuration > 0 ? formatSeconds(audioDuration) : '--:--'}
                    </Text>
                  </View>
                </View>
              </View>
            </HudCard>

            <View style={{ display: 'flex', gap: '10px', width: '100%' }}>
              {playing ? (
                <View style={{ flex: 1 }}>
                  <GlowButton onClick={pauseAudio} size="md" fullWidth variant="outline">⏸ 暂停</GlowButton>
                </View>
              ) : (
                <View style={{ flex: 1 }}>
                  <GlowButton onClick={playAudio} size="md" fullWidth variant="cyan">▶ 试听</GlowButton>
                </View>
              )}
              <View style={{ flex: 1 }}>
                <GlowButton onClick={handleSave} size="md" fullWidth variant="primary">💾 保存</GlowButton>
              </View>
            </View>

            <View onClick={() => Taro.navigateBack({ delta: 2 })}
              style={{ textAlign: 'center', padding: '12px', color: 'var(--color-text-2)', fontSize: '14px' }}>
              重新录制
            </View>
          </View>
        )}

        {isFailed && (
          <View className="status-page__failed">
            <HudCard color="hot">
              <View style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', padding: '24px' }}>
                <Text style={{ fontSize: '36px' }}>⚠</Text>
                <Text style={{ fontSize: '14px', color: 'var(--color-error)', textAlign: 'center', lineHeight: 1.6 }}>
                  {status?.error_msg ?? '处理失败，请重新提交'}
                </Text>
              </View>
            </HudCard>
            <GlowButton onClick={() => Taro.navigateBack()} variant="danger" size="md" fullWidth>返回重试</GlowButton>
          </View>
        )}
      </View>
    </View>
  )
}
