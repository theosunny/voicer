import { View, Text } from '@tarojs/components'
import Taro, { useRouter } from '@tarojs/taro'
import HudCard from '../../components/hud-card'
import GlowButton from '../../components/glow-button'
import StepProgress from '../../components/step-progress'
import Toast, { useToast } from '../../components/toast'
import { useVideoPoller } from '../../hooks/useVideoPoller'
import type { VideoStatus } from '../../types/api'
import './status.scss'

type StepState = 'done' | 'active' | 'pending' | 'error'

function buildSteps(status: VideoStatus | null): Array<{ label: string; state: StepState }> {
  if (!status) return [
    { label: '上传完成', state: 'done' },
    { label: '剪辑静音片段', state: 'pending' },
    { label: '生成字幕', state: 'pending' },
    { label: '导出视频', state: 'pending' },
  ]
  if (status.status === 'processing') {
    const prog = status.progress ?? 0
    return [
      { label: '上传完成', state: 'done' },
      { label: '剪辑静音片段', state: prog < 50 ? 'active' : 'done' },
      { label: '生成字幕', state: prog >= 50 && prog < 85 ? 'active' : prog >= 85 ? 'done' : 'pending' },
      { label: '导出视频', state: prog >= 85 ? 'active' : 'pending' },
    ]
  }
  if (status.status === 'completed') return [
    { label: '上传完成', state: 'done' },
    { label: '剪辑静音片段', state: 'done' },
    { label: '生成字幕', state: 'done' },
    { label: '导出视频', state: 'done' },
  ]
  return [
    { label: '上传完成', state: 'done' },
    { label: '剪辑静音片段', state: 'error' },
    { label: '生成字幕', state: 'pending' },
    { label: '导出视频', state: 'pending' },
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

  function handleSaveToAlbum() {
    if (!status?.processed_video_url) return
    Taro.saveVideoToPhotosAlbum({
      filePath: status.processed_video_url,
      success: () => toast.success('视频已保存到相册'),
      fail: () => toast.error('保存失败，请检查相册权限'),
    })
  }

  return (
    <View className="page-root status-page">
      <Toast />
      <View className="status-page__header">
        <View className="status-page__back" onClick={() => Taro.navigateBack()}>←</View>
        <Text className="status-page__title">视频处理</Text>
        <View className="status-page__ph" />
      </View>
      <View className="status-page__body">
        <HudCard color={isFailed ? 'hot' : isCompleted ? 'cyan' : 'primary'} className="status-page__steps-card">
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
            <Text className="status-page__processing-label">AI 剪辑处理中...</Text>
            <Text className="status-page__processing-hint">预计还需 1-2 分钟</Text>
          </HudCard>
        )}

        {isCompleted && (
          <View className="status-page__completed">
            <HudCard color="cyan" className="status-page__video-card">
              <View className="video-thumb"><Text className="video-thumb__icon">▶</Text></View>
              <View className="video-info">
                <Text className="video-info__ready">视频已就绪 ✓</Text>
                <Text className="video-info__hint">可保存到相册或重新录制</Text>
              </View>
            </HudCard>
            <View className="status-page__completed-actions">
              <GlowButton onClick={handleSaveToAlbum} size="lg" fullWidth>💾 保存到相册</GlowButton>
              <View className="status-page__re-record" onClick={() => Taro.navigateBack({ delta: 2 })}>重新录制</View>
            </View>
          </View>
        )}

        {isFailed && (
          <View className="status-page__failed">
            <HudCard color="hot" className="status-page__error-card">
              <Text className="error-icon">⚠</Text>
              <Text className="error-msg">{status.error_msg ?? '处理失败，请重新提交'}</Text>
            </HudCard>
            <GlowButton onClick={() => Taro.navigateBack()} variant="danger" size="md" fullWidth>重新提交</GlowButton>
          </View>
        )}
      </View>
    </View>
  )
}
