import { View, Text, Textarea, ScrollView } from '@tarojs/components'
import Taro, { useLoad, useRouter } from '@tarojs/taro'
import { useState, useEffect } from 'react'
import Chip from '../../components/chip'
import GlowButton from '../../components/glow-button'
import Toast, { useToast } from '../../components/toast'
import { useSSE } from '../../hooks/useSSE'
import type { GenerateScriptRequest } from '../../types/api'
import './generate.scss'

const DOMAINS = ['美妆', '科技', '生活', '美食', '知识', '母婴', '健康']
const SCRIPT_TYPES = ['产品推广', '个人感悟', '生活分享', '知识科普', '情感故事']
const STYLES = ['轻松随性', '专业权威', '情感共鸣', '幽默风趣']
const DURATIONS: Array<{ label: string; value: GenerateScriptRequest['duration'] }> = [
  { label: '30秒', value: '30s' },
  { label: '60秒', value: '60s' },
  { label: '3分钟', value: '3min' },
]
const DOMAIN_KEYWORDS: Record<string, string[]> = {
  美妆: ['护肤', '口红', '底妆', '彩妆', '精华'],
  科技: ['AI', '手机', '耳机', '智能家居', '芯片'],
  生活: ['收纳', '健康', '早起', '效率', '好物'],
  美食: ['食谱', '探店', '零食', '减脂餐', '甜品'],
  知识: ['读书', '思维', '历史', '心理学', '职场'],
}

type Mode = 'domain' | 'free'

export default function GeneratePage() {
  const router = useRouter()
  const toast = useToast()
  const [mode, setMode] = useState<Mode>('domain')
  const [domain, setDomain] = useState('美妆')
  const [freeTopic, setFreeTopic] = useState('')
  const [scriptType, setScriptType] = useState('产品推广')
  const [style, setStyle] = useState('轻松随性')
  const [duration, setDuration] = useState<GenerateScriptRequest['duration']>('60s')
  const [sseEnabled, setSseEnabled] = useState(false)
  const [requestBody, setRequestBody] = useState<GenerateScriptRequest | null>(null)
  const [generationComplete, setGenerationComplete] = useState(false)

  const { fullText, done, error, scriptId } = useSSE(
    '/api/script/generate', requestBody, sseEnabled && requestBody !== null,
  )

  useLoad(() => {
    Taro.setNavigationBarTitle({ title: 'AI 文案' })
    const qDomain = router.params.domain
    if (qDomain && DOMAINS.includes(qDomain)) setDomain(qDomain)
  })

  useEffect(() => {
    if (done && scriptId) { setSseEnabled(false); setGenerationComplete(true) }
  }, [done, scriptId])

  useEffect(() => {
    if (error) { setSseEnabled(false); toast.error('生成失败：' + error) }
  }, [error])

  function handleEdit() {
    if (scriptId) Taro.navigateTo({ url: `/pages/script/edit?script_id=${scriptId}` })
  }
  function handleRecord() {
    if (scriptId) Taro.navigateTo({ url: `/pages/record/index?script_id=${scriptId}` })
  }
  function handleGenerate() {
    const topic = mode === 'domain' ? domain : freeTopic.trim()
    if (!topic) { toast.error('请选择领域或输入主题'); return }
    setRequestBody({ topic, domain: mode === 'domain' ? domain : '', script_type: scriptType, style, duration, template_id: router.params.template_id })
    setSseEnabled(true)
  }

  const isStreaming = sseEnabled && !done && !error
  const showTerminal = sseEnabled || generationComplete

  return (
    <View className="page-root generate-page">
      <Toast />

      {!showTerminal ? (
        <ScrollView scrollY className="generate-page__form">
          <View className="generate-page__segment">
            <View className={`seg-btn ${mode === 'domain' ? 'seg-btn--active' : ''}`} onClick={() => setMode('domain')}>领域推荐</View>
            <View className={`seg-btn ${mode === 'free' ? 'seg-btn--active' : ''}`} onClick={() => setMode('free')}>自由输入</View>
          </View>

          {mode === 'domain' && (
            <View className="generate-page__section">
              <Text className="generate-page__label">选择领域</Text>
              <View className="generate-page__chips">
                {DOMAINS.map((d) => <Chip key={d} label={d} selected={domain === d} onSelect={setDomain} />)}
              </View>
              {DOMAIN_KEYWORDS[domain] && (
                <>
                  <Text className="generate-page__label generate-page__label--sub">热门关键词</Text>
                  <View className="generate-page__chips">
                    {DOMAIN_KEYWORDS[domain].map((kw) => (
                      <Chip key={kw} label={kw} onSelect={(k) => setFreeTopic((prev) => prev ? prev + ' ' + k : k)} />
                    ))}
                  </View>
                </>
              )}
            </View>
          )}

          {mode === 'free' && (
            <View className="generate-page__section">
              <Text className="generate-page__label">输入主题</Text>
              <View className="generate-page__textarea-wrap">
                <Textarea className="generate-page__textarea" value={freeTopic} onInput={(e) => setFreeTopic(e.detail.value)} placeholder="输入你想创作的主题" maxlength={50} autoHeight />
                <Text className="generate-page__char-count">{freeTopic.length}/50</Text>
              </View>
            </View>
          )}

          <View className="generate-page__section">
            <Text className="generate-page__label">内容类型</Text>
            <View className="generate-page__chips">
              {SCRIPT_TYPES.map((t) => <Chip key={t} label={t} selected={scriptType === t} onSelect={setScriptType} />)}
            </View>
          </View>

          <View className="generate-page__section">
            <Text className="generate-page__label">表达风格</Text>
            <View className="generate-page__chips">
              {STYLES.map((s) => <Chip key={s} label={s} selected={style === s} onSelect={setStyle} />)}
            </View>
          </View>

          <View className="generate-page__section">
            <Text className="generate-page__label">视频时长</Text>
            <View className="generate-page__duration-row">
              {DURATIONS.map((d) => (
                <View key={d.value} className={`dur-btn ${duration === d.value ? 'dur-btn--active' : ''}`} onClick={() => setDuration(d.value)}>{d.label}</View>
              ))}
            </View>
          </View>

          <View className="generate-page__submit">
            <GlowButton onClick={handleGenerate} size="lg" fullWidth>生成文案</GlowButton>
          </View>
        </ScrollView>
      ) : (
        <View className="generate-page__stream">
          <View className="stream-hd">
            <View className={`stream-hd__dot${done ? ' stream-hd__dot--done' : ''}`} />
            <Text className="stream-hd__title">{done ? '生成完成' : 'AI 创作中…'}</Text>
          </View>
          <ScrollView scrollY className="stream-bd">
            <View className="stream-bd__in">
              <Text className="stream-bd__text">
                {fullText || (isStreaming && ' ')}
                {!done && <Text className="stream-bd__cursor"> </Text>}
              </Text>
            </View>
          </ScrollView>
          <View className="stream-ft">
            {generationComplete ? (
              <View className="stream-ft__actions">
                <GlowButton onClick={handleEdit} size="md" variant="outline">编辑</GlowButton>
                <GlowButton onClick={handleRecord} size="md">去录制</GlowButton>
              </View>
            ) : (
              <View className="stream-ft__status">
                <View className="stream-ft__spin" />
                <Text>已生成 {fullText.length} 字</Text>
              </View>
            )}
          </View>
        </View>
      )}
    </View>
  )
}
