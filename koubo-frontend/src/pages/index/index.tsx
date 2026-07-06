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

  async function loadTemplates(nextPage: number, nextDomain: string, replace = false) {
    if (loading) return
    setLoading(true)
    try {
      const res = await getTrendingTemplates({
        domain: nextDomain === '全部' ? '' : nextDomain,
        limit: 10,
        page: nextPage,
      })
      const list = res.data ?? []
      setTemplates((prev) => replace ? list : [...prev, ...list])
      setHasMore(list.length === 10)
      setPage(nextPage)
    } finally {
      setLoading(false)
    }
  }

  useLoad(() => { loadTemplates(1, domain, true) })

  function handleDomainChange(d: string) {
    setDomain(d)
    loadTemplates(1, d, true)
  }

  useReachBottom(() => {
    if (hasMore && !loading) loadTemplates(page + 1, domain)
  })

  return (
    <View className="page-root index-page">
      <Toast />
      <View className="index-page__header">
        <Text className="index-page__title">口播创作</Text>
        <View className="index-page__bell">🔔</View>
      </View>
      <View className="index-page__cta">
        <GlowButton onClick={() => Taro.navigateTo({ url: '/pages/script/generate' })} size="lg" fullWidth>
          ⚡ 立即创作
        </GlowButton>
      </View>
      <ScrollView scrollX className="index-page__domains">
        {DOMAINS.map((d) => (
          <Chip key={d} label={d} selected={domain === d} onSelect={handleDomainChange} />
        ))}
      </ScrollView>
      <View className="index-page__list">
        {templates.length === 0 && !loading && (
          <View className="index-page__empty">
            <Text className="index-page__empty-icon">🎬</Text>
            <Text className="index-page__empty-text">暂无模板，去自由创作吧</Text>
            <GlowButton onClick={() => Taro.navigateTo({ url: '/pages/script/generate' })} size="sm">
              开始创作
            </GlowButton>
          </View>
        )}
        {templates.map((tpl) => (
          <HudCard key={tpl.id} className="template-card">
            <View className="template-card__head">
              <Text className="template-card__title">{tpl.title}</Text>
              <View className="template-card__badges">
                {tpl.is_featured && <View className="template-card__badge template-card__badge--featured">精选</View>}
                <View className="template-card__domain">{tpl.domain}</View>
              </View>
            </View>
            <Text className="template-card__preview">{tpl.content_structure}</Text>
            <View className="template-card__footer">
              <Text className="template-card__usage">{tpl.usage_count.toLocaleString()} 人用过</Text>
              <View
                className="template-card__use-btn"
                onClick={() => Taro.navigateTo({ url: `/pages/script/generate?template_id=${tpl.id}&domain=${tpl.domain}` })}
              >
                用这个模板 →
              </View>
            </View>
          </HudCard>
        ))}
        {loading && <View className="index-page__loading"><Text>加载中...</Text></View>}
        {!hasMore && templates.length > 0 && <View className="index-page__end"><Text>— 已经到底了 —</Text></View>}
      </View>
    </View>
  )
}
