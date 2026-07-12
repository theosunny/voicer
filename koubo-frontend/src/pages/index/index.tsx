import { View, Text, ScrollView, Textarea, Input } from '@tarojs/components'
import Taro, { useReachBottom, useLoad } from '@tarojs/taro'
import { useState } from 'react'
import Chip from '../../components/chip'
import GlowButton from '../../components/glow-button'
import Toast from '../../components/toast'
import { getTrendingTemplates } from '../../api/template'
import type { Template } from '../../types/api'
import './index.scss'

const DOMAINS = ['全部', '产品', '生活', '知识', '美食', '美妆', '科技']

const DURATION_LABEL: Record<string, string> = { '30s': '30秒', '60s': '60秒', '3min': '3分钟' }

const SHEET_DURATIONS = [
  { value: '30s',    label: '30秒' },
  { value: '60s',    label: '60秒' },
  { value: '3min',   label: '3分钟' },
  { value: 'custom', label: '自定义' },
]

const CARD_BG = [
  { bg: 'linear-gradient(140deg,#FFF0F3 0%,#fff 100%)', accent: '#FE2C55' },
  { bg: 'linear-gradient(140deg,#F0FBFF 0%,#fff 100%)', accent: '#00B8CC' },
  { bg: 'linear-gradient(140deg,#FFFBF0 0%,#fff 100%)', accent: '#FF9500' },
  { bg: 'linear-gradient(140deg,#F4F0FF 0%,#fff 100%)', accent: '#7B5CF0' },
  { bg: 'linear-gradient(140deg,#F0FFF4 0%,#fff 100%)', accent: '#22C55E' },
]

const PERSONAS = [
  { value: 'expert',  label: '行业专家',   desc: '权威专业，有深度',     prompt: '你是该领域的权威专家，语气专业、有深度、逻辑清晰，用数据和案例建立信任感。' },
  { value: 'student', label: '避坑课代表', desc: '揭误区，帮粉丝省钱',   prompt: '你是热心的避坑课代表，专门揭露常见误区，语气亲切又有说服力，帮粉丝少走弯路。' },
  { value: 'friend',  label: '邻家小姐姐', desc: '真实亲切，像闺蜜分享', prompt: '你是真实可爱的邻家小姐姐，像和闺蜜分享心得一样自然亲切，真实感拉满。' },
  { value: 'humor',   label: '幽默段子手', desc: '搞笑有梗，让人记住你', prompt: '你是反应快、段子多的幽默达人，用轻松搞笑的方式讲道理，让人在笑中记住你的观点。' },
]

export default function IndexPage() {
  const [domain, setDomain] = useState('全部')
  const [templates, setTemplates] = useState<Template[]>([])
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [loading, setLoading] = useState(false)

  const [activeTemplate, setActiveTemplate] = useState<Template | null>(null)
  const [sheetTopic, setSheetTopic] = useState('')
  const [sheetPersona, setSheetPersona] = useState('friend')
  const [sheetDuration, setSheetDuration] = useState('60s')
  const [sheetCustomMins, setSheetCustomMins] = useState('')
  const [sheetVisible, setSheetVisible] = useState(false)

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

  function openSheet(tpl: Template) {
    setActiveTemplate(tpl)
    setSheetTopic('')
    setSheetPersona('friend')
    setSheetDuration(tpl.duration || '60s')
    setSheetCustomMins('')
    setSheetVisible(true)
  }

  function closeSheet() { setSheetVisible(false); setActiveTemplate(null) }

  function handleGenerate() {
    const t = sheetTopic.trim()
    if (!t || !activeTemplate) {
      Taro.showToast({ title: '请填写主题', icon: 'none' })
      return
    }
    if (sheetDuration === 'custom' && !sheetCustomMins) {
      Taro.showToast({ title: '请输入自定义时长', icon: 'none' })
      return
    }
    const personaObj = PERSONAS.find((p) => p.value === sheetPersona)!
    const dur = sheetDuration === 'custom' ? `${sheetCustomMins}min` : sheetDuration
    closeSheet()
    Taro.navigateTo({
      url: `/pages/script/generate?template_id=${activeTemplate.id}&template_content=${encodeURIComponent(t)}&template_duration=${dur}&template_script_type=${activeTemplate.script_type}&persona=${encodeURIComponent(personaObj.prompt)}&persona_type=${personaObj.value}`,
    })
  }

  return (
    <View className="page-root index-page">
      <Toast />

      <View className="index-page__hero">
        <Text className="index-page__label">AI 口播</Text>
        <Text className="index-page__title">选爆款模板，秒出文案</Text>
        <Text className="index-page__sub">选一个模板 · 填主题 · 一键生成口播稿</Text>
      </View>

      <View className="index-page__cta">
        <GlowButton onClick={() => Taro.navigateTo({ url: '/pages/script/generate' })} size="lg" variant="outline">
          自由创作
        </GlowButton>
      </View>

      <ScrollView scrollX className="index-page__domains">
        {DOMAINS.map((d) => (
          <Chip key={d} label={d} selected={domain === d} onSelect={handleDomain} />
        ))}
      </ScrollView>

      <View className="index-page__gallery">
        {templates.length === 0 && !loading && (
          <View className="index-page__empty">
            <Text className="index-page__empty-text">暂无模板，去自由创作吧</Text>
            <GlowButton onClick={() => Taro.navigateTo({ url: '/pages/script/generate' })} size="sm">开始创作</GlowButton>
          </View>
        )}

        {templates.map((tpl, i) => {
          const style = CARD_BG[i % CARD_BG.length]
          return (
            <View key={tpl.id} className="tpl-card" style={{ background: style.bg }}>
              <View className="tpl-card__top">
                <View className="tpl-card__tags">
                  {tpl.is_featured && <View className="tpl-tag tpl-tag--hot">精选</View>}
                  <View className="tpl-tag">{tpl.domain}</View>
                  <View className="tpl-tag tpl-tag--dur">{DURATION_LABEL[tpl.duration] ?? tpl.duration}</View>
                </View>
              </View>

              <Text className="tpl-card__title" style={{ color: style.accent }}>【{tpl.title}】</Text>
              <Text className="tpl-card__desc">{tpl.description}</Text>

              <View className="tpl-card__structure">
                <Text className="tpl-card__structure-label">公式结构</Text>
                <Text className="tpl-card__structure-text">{tpl.content_structure}</Text>
              </View>

              <View className="tpl-card__foot">
                <Text className="tpl-card__count">{tpl.usage_count.toLocaleString()} 人用过</Text>
                <View className="tpl-card__btn" style={{ color: style.accent, borderColor: style.accent }} onClick={() => openSheet(tpl)}>
                  用这个模板
                </View>
              </View>
            </View>
          )
        })}

        {loading && <View className="index-page__loading">加载中...</View>}
        {!hasMore && templates.length > 0 && <View className="index-page__end">— 已经到底了 —</View>}
      </View>

      {/* Bottom sheet */}
      {sheetVisible && (
        <View className="sheet-mask" onClick={closeSheet}>
          <View className="sheet" onClick={(e) => e.stopPropagation()}>
            <View className="sheet__handle" />

            <View className="sheet__tpl-row">
              <Text className="sheet__tpl-name">【{activeTemplate?.title}】</Text>
              <View className="sheet__tpl-dur">{DURATION_LABEL[activeTemplate?.duration ?? '60s']}</View>
            </View>

            <Text className="sheet__prompt">你想聊的产品或主题是什么？</Text>
            <View className="sheet__input-wrap">
              <Textarea
                className="sheet__input"
                value={sheetTopic}
                onInput={(e) => setSheetTopic(e.detail.value)}
                placeholder="例如：抗衰面霜 / 职场防小人 / 减肥减不下来…"
                maxlength={80}
                autoHeight
                focus
              />
              <Text className="sheet__count">{sheetTopic.length}/80</Text>
            </View>

            <Text className="sheet__section-label">选你的口播人设</Text>
            <View className="sheet__personas">
              {PERSONAS.map((p) => (
                <View
                  key={p.value}
                  className={`sheet__persona${sheetPersona === p.value ? ' sheet__persona--active' : ''}`}
                  onClick={() => setSheetPersona(p.value)}
                >
                  <Text className="sheet__persona-label">{p.label}</Text>
                  <Text className="sheet__persona-desc">{p.desc}</Text>
                </View>
              ))}
            </View>

            <Text className="sheet__section-label">视频时长</Text>
            <View className="sheet__durations">
              {SHEET_DURATIONS.map((d) => (
                <View
                  key={d.value}
                  className={`sheet__dur${sheetDuration === d.value ? ' sheet__dur--active' : ''}`}
                  onClick={() => setSheetDuration(d.value)}
                >
                  {d.label}
                </View>
              ))}
            </View>
            {sheetDuration === 'custom' && (
              <View className="sheet__custom-dur">
                <Input
                  className="sheet__custom-dur__input"
                  type="number"
                  value={sheetCustomMins}
                  onInput={(e) => setSheetCustomMins(e.detail.value)}
                  placeholder="输入分钟数"
                />
                <Text className="sheet__custom-dur__unit">分钟</Text>
              </View>
            )}

            <GlowButton onClick={handleGenerate} size="lg" fullWidth>一键生成爆款文案</GlowButton>
          </View>
        </View>
      )}
    </View>
  )
}
