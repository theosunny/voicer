import { View, Text } from '@tarojs/components'
import Taro, { useLoad, useRouter } from '@tarojs/taro'
import { useState, useEffect, useRef } from 'react'
import HudCard from '../../components/hud-card'
import GlowButton from '../../components/glow-button'
import StepProgress from '../../components/step-progress'
import Icon from '../../components/icon'
import Toast, { useToast } from '../../components/toast'
import { useVideoPoller } from '../../hooks/useVideoPoller'
import { API_BASE } from '../../api/client'
import type { VideoStatus } from '../../types/api'
import './status.scss'

type SS = 'done' | 'active' | 'pending' | 'error'

function steps(s: VideoStatus | null): Array<{ label: string; state: SS }> {
  if (!s) return [{ label: '上传完成', state: 'done' }, { label: '处理中', state: 'pending' }, { label: '完成', state: 'pending' }]
  if (s.status === 'processing') return [{ label: '上传完成', state: 'done' }, { label: '处理中', state: 'active' }, { label: '完成', state: 'pending' }]
  if (s.status === 'completed') return [{ label: '上传完成', state: 'done' }, { label: '处理中', state: 'done' }, { label: '完成', state: 'done' }]
  return [{ label: '上传完成', state: 'done' }, { label: '处理中', state: 'error' }, { label: '完成', state: 'pending' }]
}

function fmtSec(s: number): string {
  const m = Math.floor(s / 60).toString().padStart(2, '0')
  const sec = (s % 60).toString().padStart(2, '0')
  return `${m}:${sec}`
}

export default function VideoStatusPage() {
  const router = useRouter()
  const toast = useToast()
  const videoId = router.params.video_id ?? null
  const { status } = useVideoPoller(videoId)
  const st = steps(status)
  const isProcessing = !status || status.status === 'processing'
  const isCompleted = status?.status === 'completed'
  const isFailed = status?.status === 'failed'

  const [playing, setPlaying] = useState(false)
  const [curTime, setCurTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const audioRef = useRef<Taro.InnerAudioContext | null>(null)

  useLoad(() => { Taro.setNavigationBarTitle({ title: '处理状态' }) })
  useEffect(() => () => { audioRef.current?.destroy(); audioRef.current = null }, [])

  function audioUrl(): string | null {
    if (!status?.processed_video_url) return null
    const u = status.processed_video_url
    if (u.startsWith('http')) return u
    // strip any accidental uploads/ prefix before building URL
    const name = u.replace(/^uploads\//, '')
    return API_BASE + '/uploads/' + name
  }

  function play() {
    const url = audioUrl()
    if (!url) { toast.error('文件不可用'); return }
    if (!audioRef.current) {
      const a = Taro.createInnerAudioContext(); a.src = url; a.autoplay = false
      a.onPlay(() => setPlaying(true)); a.onPause(() => setPlaying(false))
      a.onStop(() => { setPlaying(false); setCurTime(0) })
      a.onEnded(() => { setPlaying(false); setCurTime(0) })
      a.onTimeUpdate(() => setCurTime(Math.floor(a.currentTime)))
      a.onCanplay(() => setDuration(Math.floor(a.duration)))
      a.onError(() => { setPlaying(false); toast.error('播放失败') })
      audioRef.current = a
    }
    audioRef.current.play()
  }
  function pause() { audioRef.current?.pause() }

  function handleSave() {
    const url = audioUrl()
    if (!url) { toast.error('文件不可用'); return }
    const isVideo = url.endsWith('.mp4')
    Taro.showLoading({ title: '下载中…' })
    Taro.downloadFile({
      url,
      success: (r) => {
        Taro.hideLoading()
        if (r.statusCode !== 200) { toast.error('下载失败'); return }
        if (isVideo) {
          // mp4 → save to photos album
          Taro.saveVideoToPhotosAlbum({
            filePath: r.tempFilePath,
            success: () => toast.success('视频已保存到相册'),
            fail: () => toast.error('保存失败，请检查相册权限'),
          })
        } else {
          // mp3/m4a → save to local filesystem
          Taro.saveFile({
            tempFilePath: r.tempFilePath,
            success: () => toast.success('音频已保存到本地'),
            fail: () => toast.error('保存失败'),
          })
        }
      },
      fail: () => { Taro.hideLoading(); toast.error('下载失败') },
    })
  }

  return (
    <View className="page-root status-page">
      <Toast />

      <View className="status-page__body">
        <HudCard><StepProgress steps={st} /></HudCard>

        {isProcessing && (
          <HudCard>
            <View className="proc">
              <View className="proc-icon"><Icon name="film" size={32} color="var(--color-primary-light)" /></View>
              <View className="proc-bars">
                <View className="b" /><View className="b" /><View className="b" /><View className="b" /><View className="b" />
              </View>
              <Text className="status-page__label">处理中…</Text>
              <Text className="status-page__hint">稍等片刻</Text>
            </View>
          </HudCard>
        )}

        {isCompleted && (
          <View className="status-page__actions">
            <HudCard>
              <View className="player">
                <View className="player-btn" onClick={playing ? pause : play}>
                  <Icon name={playing ? 'pause' : 'play'} size={22} color="var(--color-primary-light)" />
                </View>
                <View className="player-info">
                  <Text className="player-title">音频已就绪</Text>
                  <View className="player-bar-wrap">
                    <View className="player-bar"><View className="player-bar__f" style={{ width: duration > 0 ? `${(curTime / duration) * 100}%` : '0%' }} /></View>
                    <Text className="player-time">{fmtSec(curTime)}/{duration > 0 ? fmtSec(duration) : '--:--'}</Text>
                  </View>
                </View>
              </View>
            </HudCard>

            <View style={{ display: 'flex', gap: 10 }}>
              {playing ? <GlowButton onClick={pause} size="md" fullWidth variant="outline">暂停</GlowButton>
                : <GlowButton onClick={play} size="md" fullWidth variant="outline">试听</GlowButton>}
              <GlowButton onClick={handleSave} size="md" fullWidth>保存</GlowButton>
            </View>

            <View className="status-page__link" onClick={() => Taro.navigateBack({ delta: 2 })}>重新录制</View>
          </View>
        )}

        {isFailed && (
          <View className="status-page__actions">
            <HudCard>
              <View className="status-page__error-row">
                <Icon name="warn" size={20} color="var(--color-error)" />
                <Text className="status-page__error-msg">{status?.error_msg ?? '处理失败，请重试'}</Text>
              </View>
            </HudCard>
            <GlowButton onClick={() => Taro.navigateBack()} variant="danger" size="md" fullWidth>返回重试</GlowButton>
          </View>
        )}
      </View>
    </View>
  )
}
