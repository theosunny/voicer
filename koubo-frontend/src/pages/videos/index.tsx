import { View, Text } from '@tarojs/components'
import Taro, { useLoad } from '@tarojs/taro'
import { useState } from 'react'
import Chip from '../../components/chip'
import GlowButton from '../../components/glow-button'
import Toast, { useToast } from '../../components/toast'
import type { VideoStatus } from '../../types/api'
import './index.scss'

type StatusFilter = '全部' | '处理中' | '完成' | '失败'
const STATUS_FILTERS: StatusFilter[] = ['全部', '处理中', '完成', '失败']

interface VideoEntry {
  id: string
  title: string
  createdAt: string
  durationSecs: number
  status: VideoStatus['status']
}

function loadLocalVideos(): VideoEntry[] {
  try {
    const raw = Taro.getStorageSync('my_videos') as string | undefined
    return raw ? (JSON.parse(raw) as VideoEntry[]) : []
  } catch { return [] }
}

const STATUS_LABEL: Record<string, string> = { processing: '处理中', completed: '完成', failed: '失败' }
const STATUS_CLASS: Record<string, string> = { processing: 'badge--processing', completed: 'badge--completed', failed: 'badge--failed' }

function formatDate(iso: string): string {
  const d = new Date(iso)
  return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours()}:${d.getMinutes().toString().padStart(2, '0')}`
}

export default function VideosPage() {
  const toast = useToast()
  const [filter, setFilter] = useState<StatusFilter>('全部')
  const [videos, setVideos] = useState<VideoEntry[]>([])

  useLoad(() => setVideos(loadLocalVideos()))

  const filtered = filter === '全部' ? videos : videos.filter((v) => {
    if (filter === '处理中') return v.status === 'processing'
    if (filter === '完成') return v.status === 'completed'
    if (filter === '失败') return v.status === 'failed'
    return true
  })

  function handleLongPress(video: VideoEntry) {
    Taro.showActionSheet({
      itemList: ['删除', '重新录制', '分享'],
      success: (res) => {
        if (res.tapIndex === 0) {
          const updated = videos.filter((v) => v.id !== video.id)
          setVideos(updated)
          Taro.setStorageSync('my_videos', JSON.stringify(updated))
          toast.success('已删除')
        } else if (res.tapIndex === 2) {
          toast.info('分享功能即将上线')
        }
      },
    })
  }

  return (
    <View className="page-root videos-page">
      <Toast />
      <View className="videos-page__header">
        <Text className="videos-page__title">我的作品</Text>
        <Text className="videos-page__count">{videos.length} 个视频</Text>
      </View>
      <View className="videos-page__filters">
        {STATUS_FILTERS.map((f) => (
          <Chip key={f} label={f} selected={filter === f} onSelect={(l) => setFilter(l as StatusFilter)} />
        ))}
      </View>
      <View className="videos-page__list">
        {filtered.length === 0 && (
          <View className="videos-page__empty">
            <Text className="videos-page__empty-icon">🎬</Text>
            <Text className="videos-page__empty-text">还没有作品，去创作第一个吧</Text>
            <GlowButton onClick={() => Taro.switchTab({ url: '/pages/create/index' })} size="sm">去创作</GlowButton>
          </View>
        )}
        {filtered.map((video) => (
          <View key={video.id} className="video-item" onLongPress={() => handleLongPress(video)}>
            <View className="video-item__thumb"><Text className="video-item__thumb-icon">▶</Text></View>
            <View className="video-item__info">
              <View className="video-item__top">
                <Text className="video-item__title">{video.title || '未命名作品'}</Text>
                <View className={`video-item__badge ${STATUS_CLASS[video.status] ?? ''}`}>{STATUS_LABEL[video.status] ?? video.status}</View>
              </View>
              <View className="video-item__meta">
                <Text className="video-item__date">{formatDate(video.createdAt)}</Text>
                {video.durationSecs > 0 && (
                  <Text className="video-item__dur">
                    {Math.floor(video.durationSecs / 60)}:{(video.durationSecs % 60).toString().padStart(2, '0')}
                  </Text>
                )}
              </View>
            </View>
          </View>
        ))}
      </View>
    </View>
  )
}
