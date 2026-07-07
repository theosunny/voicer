import { View, Text, ScrollView } from '@tarojs/components'
import Taro, { useReachBottom, useLoad } from '@tarojs/taro'
import { useState } from 'react'
import HudCard from '../../components/hud-card'
import Chip from '../../components/chip'
import GlowButton from '../../components/glow-button'
import Toast from '../../components/toast'
import { getTrendingTemplates } from '../../api/template'
import type { Template } from '../../types/api'
import './index.scss'

const DOMAINS = ['全部', '产品', '生活', '知识', '美食', '美妆', '科技']

export default function IndexPage() {
  const [domain, setDomain] = useState('全部')
  const [templates, setTemplates] = useState<Template[]>([])
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [loading, setLoading] = useState(false)

  async function loadTemplates(p: number, d: string, replace = false) {
    if (loading) return
    setLoading(true)
    try {
      const res = await getTrendingTemplates({ domain: d === '全部' ? '' : d, limit: 10, page: p })
      const list = res.data ?? []
      setTemplates((prev) => replace ? list : [...prev, ...list])
      setHasMore(list.length === 10)
      setPage(p)
    } finally { setLoading(false) }
  }

  useLoad(() => { loadTemplates(1, domain, true) })

  function handleDomain(d: string) { setDomain(d); loadTemplates(1, d, true) }
  useReachBottom(() => { if (hasMore && !loading) loadTemplates(page + 1, domain) })

  return (
    <View className="page-root index-page">
      <Toast />

      <View className="index-page__hero">
        <Text className="index-page__title">口播创作</Text>
        <Text className="index-page__sub">AI 帮你写文案，录制你的声音</Text>
      </View>

      <View className="index-page__cta">
        <GlowButton onClick={() => Taro.navigateTo({ url: '/pages/script/generate' })} size="lg" fullWidth>
          立即创作
        </GlowButton>
      </View>

      <ScrollView scrollX className="index-page__domains">
        {DOMAINS.map((d) => (
          <Chip key={d} label={d} selected={domain === d} onSelect={handleDomain} />
        ))}
      </ScrollView>

      <View className="index-page__list">
        {templates.length === 0 && !loading && (
          <View className="index-page__empty">
            <Text className="index-page__empty-icon">🎬</Text>
            <Text className="index-page__empty-text">暂无模板，去自由创作吧</Text>
            <GlowButton onClick={() => Taro.navigateTo({ url: '/pages/script/generate' })} size="sm">开始创作</GlowButton>
          </View>
        )}

        {templates.map((tpl) => (
          <HudCard key={tpl.id} className="tpl-card">
            <View className="tpl-card__head">
              <Text className="tpl-card__title">{tpl.title}</Text>
              <View className="tpl-card__badges">
                {tpl.is_featured && <View className="tpl-card__badge tpl-card__badge--hot">精选</View>}
                <View className="tpl-card__domain">{tpl.domain}</View>
              </View>
            </View>
            <Text className="tpl-card__preview">{tpl.content_structure}</Text>
            <View className="tpl-card__foot">
              <Text className="tpl-card__count">{tpl.usage_count.toLocaleString()} 人用过</Text>
              <View className="tpl-card__use" onClick={() => Taro.navigateTo({ url: `/pages/script/generate?template_id=${tpl.id}&domain=${tpl.domain}` })}>
                用这个模板 →
              </View>
            </View>
          </HudCard>
        ))}

        {loading && <View className="index-page__loading">加载中...</View>}
        {!hasMore && templates.length > 0 && <View className="index-page__end">— 已经到底了 —</View>}
      </View>
    </View>
  )
}
