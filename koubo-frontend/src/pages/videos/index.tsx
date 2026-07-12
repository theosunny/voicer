import { View, Text, ScrollView } from '@tarojs/components'
import Taro, { useLoad, usePullDownRefresh, useReachBottom } from '@tarojs/taro'
import { useState, useRef } from 'react'
import GlowButton from '../../components/glow-button'
import Icon from '../../components/icon'
import Toast, { useToast } from '../../components/toast'
import { listVideos, deleteVideo } from '../../api/video'
import { listScripts } from '../../api/script'
import type { VideoListItem } from '../../api/video'
import type { Script } from '../../types/api'
import './index.scss'

type Tab = 'scripts' | 'videos'
type StatusFilter = '全部' | '处理中' | '完成' | '失败'
const STATUS_FILTERS: StatusFilter[] = ['全部', '处理中', '完成', '失败']
const STATUS_LABEL: Record<string, string> = { processing: '处理中', completed: '完成', failed: '失败' }
const STATUS_CLASS: Record<string, string> = { processing: 'badge--processing', completed: 'badge--completed', failed: 'badge--failed' }
const DELETE_BTN_W = 72

function formatDate(iso: string): string {
  const d = new Date(iso)
  return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours()}:${d.getMinutes().toString().padStart(2, '0')}`
}

function estimateDuration(sec: number): string {
  if (sec < 60) return `约${sec}秒`
  const m = Math.floor(sec / 60); const s = sec % 60
  return `约${m}分${s > 0 ? s + '秒' : ''}`
}

export default function VideosPage() {
  const toast = useToast()
  const [tab, setTab] = useState<Tab>('scripts')

  // Scripts tab state
  const [scripts, setScripts] = useState<Script[]>([])
  const [scriptsLoading, setScriptsLoading] = useState(false)
  const [scriptsHasMore, setScriptsHasMore] = useState(true)
  const scriptsOffsetRef = useRef(0)

  // Videos tab state
  const [filter, setFilter] = useState<StatusFilter>('全部')
  const [videos, setVideos] = useState<VideoListItem[]>([])
  const [videosLoading, setVideosLoading] = useState(false)
  const [videosHasMore, setVideosHasMore] = useState(true)
  const videosOffsetRef = useRef(0)
  const [offsets, setOffsets] = useState<Record<string, number>>({})
  const touchStartX = useRef(0)
  const touchItemId = useRef('')

  const PAGE_SIZE = 20

  async function loadScripts(offset: number, replace = false) {
    if (scriptsLoading && !replace && offset > 0) return
    setScriptsLoading(true)
    try {
      const res = await listScripts(PAGE_SIZE, offset)
      if (res.success && res.data) {
        setScripts((prev) => replace ? res.data : [...prev, ...res.data])
        setScriptsHasMore(res.data.length === PAGE_SIZE)
        scriptsOffsetRef.current = offset + res.data.length
      }
    } catch { /* ignore */ }
    finally { setScriptsLoading(false); Taro.stopPullDownRefresh() }
  }

  async function loadVideos(offset: number, replace = false) {
    if (videosLoading && !replace && offset > 0) return
    setVideosLoading(true)
    try {
      const res = await listVideos(PAGE_SIZE, offset)
      if (res.success && res.data) {
        setVideos((prev) => replace ? res.data! : [...prev, ...res.data!])
        setVideosHasMore(res.data.length === PAGE_SIZE)
        videosOffsetRef.current = offset + res.data.length
      }
    } catch { /* ignore */ }
    finally { setVideosLoading(false); Taro.stopPullDownRefresh() }
  }

  useLoad(() => { loadScripts(0, true); loadVideos(0, true) })

  usePullDownRefresh(() => {
    if (tab === 'scripts') { scriptsOffsetRef.current = 0; loadScripts(0, true) }
    else { videosOffsetRef.current = 0; loadVideos(0, true) }
  })

  useReachBottom(() => {
    if (tab === 'scripts' && scriptsHasMore && !scriptsLoading) loadScripts(scriptsOffsetRef.current)
    if (tab === 'videos' && videosHasMore && !videosLoading) loadVideos(videosOffsetRef.current)
  })

  const filteredVideos = filter === '全部' ? videos : videos.filter((v) => {
    if (filter === '处理中') return v.status === 'processing'
    if (filter === '完成') return v.status === 'completed'
    if (filter === '失败') return v.status === 'failed'
    return true
  })

  function closeAll() { setOffsets({}) }
  function onTouchStart(id: string, e: any) { touchStartX.current = e.touches[0].clientX; touchItemId.current = id }
  function onTouchMove(id: string, e: any) {
    const dx = e.touches[0].clientX - touchStartX.current
    if (Math.abs(dx) < 5) return
    const next = Math.max(-DELETE_BTN_W, Math.min(0, (offsets[id] ?? 0) + dx))
    touchStartX.current = e.touches[0].clientX
    setOffsets((prev) => ({ ...prev, [id]: next }))
  }
  function onTouchEnd(id: string) {
    const snapped = (offsets[id] ?? 0) < -(DELETE_BTN_W / 2) ? -DELETE_BTN_W : 0
    setOffsets((prev) => ({ ...prev, [id]: snapped }))
  }
  function openVideo(v: VideoListItem) {
    if ((offsets[v.id] ?? 0) !== 0) { closeAll(); return }
    Taro.navigateTo({ url: `/pages/video/status?video_id=${v.id}` })
  }
  async function confirmDelete(v: VideoListItem) {
    Taro.showModal({
      title: '删除作品', content: `确定删除「录制 ${formatDate(v.created_at)}」？此操作不可恢复`,
      confirmText: '删除', confirmColor: '#FE2C55',
      success: async (res) => {
        if (!res.confirm) return
        try {
          const r = await deleteVideo(v.id)
          if (r.success) {
            setVideos((prev) => prev.filter((x) => x.id !== v.id))
            setOffsets((prev) => { const n = { ...prev }; delete n[v.id]; return n })
            toast.show('已删除', 'success')
          } else { toast.error('删除失败') }
        } catch { toast.error('网络错误') }
      },
    })
  }

  return (
    <View className="page-root videos-page" onClick={closeAll}>
      <Toast />

      <View className="videos-page__header">
        <Text className="videos-page__title">作品</Text>
        <Text className="videos-page__count">{tab === 'scripts' ? scripts.length : videos.length} 个</Text>
      </View>

      {/* Tab switcher */}
      <View className="works-tabs">
        <View className={`works-tab${tab === 'scripts' ? ' works-tab--active' : ''}`} onClick={() => setTab('scripts')}>文案草稿</View>
        <View className={`works-tab${tab === 'videos' ? ' works-tab--active' : ''}`} onClick={() => setTab('videos')}>录制视频</View>
      </View>

      {/* Scripts tab */}
      {tab === 'scripts' && (
        <View className="videos-page__list">
          {scriptsLoading && scripts.length === 0 && <View className="videos-page__loading">加载中…</View>}
          {!scriptsLoading && scripts.length === 0 && (
            <View className="videos-page__empty">
              <View className="videos-page__empty-icon"><Icon name="edit" size={28} color="var(--color-primary-light)" /></View>
              <Text className="videos-page__empty-text">还没有保存的文案，去生成第一篇吧</Text>
              <GlowButton onClick={() => Taro.navigateTo({ url: '/pages/script/generate' })} size="sm">去生成</GlowButton>
            </View>
          )}
          {scripts.map((s) => (
            <View key={s.id} className="script-item" onClick={() => Taro.navigateTo({ url: `/pages/script/edit?script_id=${s.id}` })}>
              <View className="script-item__main">
                <Text className="script-item__title">{s.title || '未命名文案'}</Text>
                <Text className="script-item__preview" numberOfLines={2}>{s.content}</Text>
                <View className="script-item__meta">
                  <Text className="script-item__dur">{estimateDuration(s.duration_estimate)}</Text>
                  <Text className="script-item__date">{formatDate(s.updated_at ?? s.created_at ?? '')}</Text>
                </View>
              </View>
              <View className="script-item__actions">
                <View className="script-item__btn script-item__btn--record"
                  onClick={(e) => { e.stopPropagation(); Taro.navigateTo({ url: `/pages/record/index?script_id=${s.id}` }) }}>
                  去录制
                </View>
              </View>
            </View>
          ))}
          {scriptsLoading && scripts.length > 0 && <View className="videos-page__loading">加载中…</View>}
          {!scriptsHasMore && scripts.length > 0 && <View className="videos-page__end">— 已经到底了 —</View>}
        </View>
      )}

      {/* Videos tab */}
      {tab === 'videos' && (
        <>
          <View className="videos-page__filters">
            {STATUS_FILTERS.map((f) => (
              <View key={f} className={`filter-chip${filter === f ? ' filter-chip--active' : ''}`} onClick={() => setFilter(f as StatusFilter)}>{f}</View>
            ))}
          </View>
          <View className="videos-page__list">
            {videosLoading && videos.length === 0 && <View className="videos-page__loading">加载中…</View>}
            {!videosLoading && filteredVideos.length === 0 && (
              <View className="videos-page__empty">
                <View className="videos-page__empty-icon"><Icon name="film" size={28} color="var(--color-primary-light)" /></View>
                <Text className="videos-page__empty-text">{videos.length === 0 ? '还没有作品，去创作第一个吧' : '没有匹配的作品'}</Text>
                <GlowButton onClick={() => Taro.navigateTo({ url: '/pages/script/generate' })} size="sm">去创作</GlowButton>
              </View>
            )}
            {filteredVideos.map((v) => {
              const offset = offsets[v.id] ?? 0
              return (
                <View key={v.id} className="swipe-row"
                  onTouchStart={(e) => onTouchStart(v.id, e)}
                  onTouchMove={(e) => onTouchMove(v.id, e)}
                  onTouchEnd={() => onTouchEnd(v.id)}
                >
                  <View className="swipe-row__action" onClick={(e) => { e.stopPropagation(); confirmDelete(v) }}>
                    <Icon name="close" size={20} color="#fff" />
                    <Text className="swipe-row__action-label">删除</Text>
                  </View>
                  <View className="video-item"
                    style={{ transform: `translateX(${offset}px)`, transition: offset === 0 || offset === -DELETE_BTN_W ? 'transform 0.2s ease' : 'none' }}
                    onClick={() => openVideo(v)}
                  >
                    <View className="video-item__thumb"><Icon name="play" size={20} color="var(--color-text-3)" /></View>
                    <View className="video-item__info">
                      <View className="video-item__top">
                        <Text className="video-item__title">录制 {formatDate(v.created_at)}</Text>
                        <View className={`video-item__badge ${STATUS_CLASS[v.status] ?? ''}`}>{STATUS_LABEL[v.status] ?? v.status}</View>
                      </View>
                      <Text className="video-item__date">{v.status === 'processing' ? '处理中…' : v.status === 'completed' ? '已完成' : '处理失败'}</Text>
                    </View>
                  </View>
                </View>
              )
            })}
            {videosLoading && videos.length > 0 && <View className="videos-page__loading">加载中…</View>}
            {!videosHasMore && videos.length > 0 && <View className="videos-page__end">— 已经到底了 —</View>}
          </View>
        </>
      )}
    </View>
  )
}
