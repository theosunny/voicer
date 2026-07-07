import { View, Text } from '@tarojs/components'
import Taro, { useLoad, usePullDownRefresh } from '@tarojs/taro'
import { useState } from 'react'
import Chip from '../../components/chip'
import GlowButton from '../../components/glow-button'
import Toast, { useToast } from '../../components/toast'
import { listVideos } from '../../api/video'
import type { VideoListItem } from '../../api/video'
import './index.scss'

type StatusFilter = '全部' | '处理中' | '完成' | '失败'
const STATUS_FILTERS: StatusFilter[] = ['全部', '处理中', '完成', '失败']

const STATUS_LABEL: Record<string, string> = { processing: '处理中', completed: '完成', failed: '失败' }
const STATUS_CLASS: Record<string, string> = { processing: 'badge--processing', completed: 'badge--completed', failed: 'badge--failed' }

function formatDate(iso: string): string {
  const d = new Date(iso)
  return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours()}:${d.getMinutes().toString().padStart(2, '0')}`
}

export default function VideosPage() {
  const toast = useToast()
  const [filter, setFilter] = useState<StatusFilter>('全部')
  const [videos, setVideos] = useState<VideoListItem[]>([])
  const [loading, setLoading] = useState(true)

  async function loadVideos() {
    setLoading(true)
    try {
      const res = await listVideos()
      if (res.success && res.data) setVideos(res.data)
    } catch { /* ignore */ }
    finally { setLoading(false); Taro.stopPullDownRefresh() }
  }

  useLoad(() => { loadVideos() })
  usePullDownRefresh(() => { loadVideos() })

  const filtered = filter === '全部' ? videos : videos.filter((v) => {
    if (filter === '处理中') return v.status === 'processing'
    if (filter === '完成') return v.status === 'completed'
    if (filter === '失败') return v.status === 'failed'
    return true
  })

  function openVideo(v: VideoListItem) {
    Taro.navigateTo({ url: `/pages/video/status?video_id=${v.id}` })
  }

  function handleLongPress(v: VideoListItem) {
    Taro.showActionSheet({
      itemList: v.status === 'completed' ? ['试听', '查看状态'] : ['查看状态'],
      success: (res) => {
        if (res.tapIndex === 0) openVideo(v)
      },
    })
  }

  return (
    <View className="page-root videos-page">
      <Toast />
      <View className="videos-page__header">
        <Text className="videos-page__title">我的作品</Text>
        <Text className="videos-page__count">{videos.length} 个</Text>
      </View>
      <View className="videos-page__filters">
        {STATUS_FILTERS.map((f) => (
          <Chip key={f} label={f} selected={filter === f} onSelect={(l) => setFilter(l as StatusFilter)} />
        ))}
      </View>
      <View className="videos-page__list">
        {loading && <View className="videos-page__loading">加载中…</View>}

        {!loading && filtered.length === 0 && (
          <View className="videos-page__empty">
            <Text className="videos-page__empty-icon">🎬</Text>
            <Text className="videos-page__empty-text">{videos.length === 0 ? '还没有作品，去创作第一个吧' : '没有匹配的作品'}</Text>
            <GlowButton onClick={() => Taro.switchTab({ url: '/pages/create/index' })} size="sm">去创作</GlowButton>
          </View>
        )}

        {filtered.map((v) => (
          <View key={v.id} className="video-item" onClick={() => openVideo(v)} onLongPress={() => handleLongPress(v)}>
            <View className="video-item__thumb"><Text className="video-item__thumb-icon">▶</Text></View>
            <View className="video-item__info">
              <View className="video-item__top">
                <Text className="video-item__title">{v.script_id ? v.script_id.slice(0, 8) : v.id.slice(0, 8)}</Text>
                <View className={`video-item__badge ${STATUS_CLASS[v.status] ?? ''}`}>{STATUS_LABEL[v.status] ?? v.status}</View>
              </View>
              <View className="video-item__meta">
                <Text className="video-item__date">{formatDate(v.created_at)}</Text>
              </View>
            </View>
          </View>
        ))}
      </View>
    </View>
  )
}
