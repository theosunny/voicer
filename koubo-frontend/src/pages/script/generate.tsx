import { View, Text, Textarea, ScrollView, Input } from '@tarojs/components'
import Taro, { useLoad, useRouter } from '@tarojs/taro'
import { useState, useEffect } from 'react'
import GlowButton from '../../components/glow-button'
import Toast, { useToast } from '../../components/toast'
import { useSSE } from '../../hooks/useSSE'
import { saveDraft } from '../../api/script'
import type { GenerateScriptRequest } from '../../types/api'
import './generate.scss'

const SCRIPT_TYPES = [
  { value: 'promo',   label: '产品种草', desc: '安利好物，引发购买欲' },
  { value: 'insight', label: '干货科普', desc: '知识拆解，建立专业感' },
  { value: 'life',    label: '情感共鸣', desc: '真实故事，引发共情' },
]

const PERSONAS = [
  { value: 'expert',  label: '行业专家',   desc: '权威专业，有深度',     prompt: '你是该领域的权威专家，语气专业、有深度、逻辑清晰，用数据和案例建立信任感。' },
  { value: 'student', label: '避坑课代表', desc: '揭误区，帮粉丝省钱',   prompt: '你是热心的避坑课代表，专门揭露常见误区，语气亲切又有说服力，帮粉丝少走弯路。' },
  { value: 'friend',  label: '邻家小姐姐', desc: '真实亲切，像闺蜜分享', prompt: '你是真实可爱的邻家小姐姐，像和闺蜜分享心得一样自然亲切，真实感拉满。' },
  { value: 'humor',   label: '幽默段子手', desc: '搞笑有梗，让人记住你', prompt: '你是反应快、段子多的幽默达人，用轻松搞笑的方式讲道理，让人在笑中记住你的观点。' },
]

const DURATIONS = [
  { value: '30s',    label: '30秒' },
  { value: '60s',    label: '60秒' },
  { value: '3min',   label: '3分钟' },
  { value: 'custom', label: '自定义' },
]

export default function GeneratePage() {
  const router = useRouter()
  const toast = useToast()

  const [topic, setTopic] = useState('')
  const [scriptType, setScriptType] = useState('promo')
  const [persona, setPersona] = useState('friend')
  const [duration, setDuration] = useState<string>('60s')
  const [customMinutes, setCustomMinutes] = useState('')

  const [sseEnabled, setSseEnabled] = useState(false)
  const [requestBody, setRequestBody] = useState<GenerateScriptRequest | null>(null)
  const [generationComplete, setGenerationComplete] = useState(false)
  const [saving, setSaving] = useState(false)

  const { fullText, done, error, scriptId } = useSSE(
    '/api/script/generate', requestBody, sseEnabled && requestBody !== null,
  )

  useLoad(() => {
    Taro.setNavigationBarTitle({ title: 'AI 文案' })
    const { template_content, template_duration, template_script_type, persona: tplPersona, persona_type: tplPersonaType } = router.params

    if (template_content) {
      const decodedTopic = decodeURIComponent(template_content)
      const decodedPersona = tplPersona ? decodeURIComponent(tplPersona) : ''
      const dur = (template_duration as GenerateScriptRequest['duration']) || '60s'
      const sType = template_script_type || 'promo'
      const userID = Taro.getStorageSync('user_id') as string || ''
      setTopic(decodedTopic)
      setDuration(dur)
      setScriptType(sType)
      setRequestBody({
        topic: decodedTopic,
        domain: '',
        script_type: sType,
        style: 'casual',
        duration: dur,
        template_id: router.params.template_id,
        persona: decodedPersona,
        persona_type: tplPersonaType || 'general',
        user_id: userID,
      })
      setSseEnabled(true)
    }
  })

  useEffect(() => {
    if (done && scriptId) { setSseEnabled(false); setGenerationComplete(true) }
  }, [done, scriptId])

  useEffect(() => {
    if (error) { setSseEnabled(false); toast.error('生成失败：' + error) }
  }, [error])

  function handleGenerate() {
    const t = topic.trim()
    if (!t) { toast.error('先告诉 AI 你想聊什么吧'); return }
    let durationSec = 0
    if (duration === 'custom') {
      const mins = parseInt(customMinutes)
      if (!mins || mins <= 0) { toast.error('请输入自定义时长（分钟）'); return }
      durationSec = mins * 60
    }
    const personaObj = PERSONAS.find((p) => p.value === persona)!
    const userID = Taro.getStorageSync('user_id') as string || ''
    setRequestBody({
      topic: t,
      domain: '',
      script_type: scriptType,
      style: 'casual',
      duration: duration === 'custom' ? '3min' : (duration as GenerateScriptRequest['duration']),
      duration_sec: durationSec || undefined,
      template_id: router.params.template_id,
      persona: personaObj.prompt,
      persona_type: personaObj.value,
      user_id: userID,
    })
    setSseEnabled(true)
  }

  function handleStop() {
    setSseEnabled(false)
    setGenerationComplete(false)
    setRequestBody(null)
  }

  async function handleSave() {
    if (saving || !fullText) return
    setSaving(true)
    try {
      const res = await saveDraft({
        id: scriptId ?? undefined,
        title: (requestBody?.topic ?? '').slice(0, 40) || '口播文案',
        content: fullText,
        script_type: requestBody?.script_type ?? 'promo',
        style: requestBody?.style ?? 'casual',
      })
      if (res.success) toast.success('已保存')
      else toast.error('保存失败')
    } catch { toast.error('网络错误') }
    finally { setSaving(false) }
  }

  function handleRecord() {
    if (scriptId) Taro.navigateTo({ url: `/pages/record/index?script_id=${scriptId}` })
  }

  const isStreaming = sseEnabled && !done && !error
  const showTerminal = sseEnabled || generationComplete

  if (showTerminal) {
    return (
      <View className="page-root generate-page">
        <Toast />
        <View className="generate-page__stream">
          <View className="stream-hd">
            <View className={`stream-hd__dot${done ? ' stream-hd__dot--done' : ''}`} />
            <Text className="stream-hd__title">{done ? '生成完成' : 'AI 创作中…'}</Text>
            {isStreaming && <View className="stream-hd__stop" onClick={handleStop}>停止</View>}
          </View>
          <ScrollView scrollY className="stream-bd">
            <View className="stream-bd__in">
              <Text className="stream-bd__text">
                {fullText || (isStreaming && ' ')}
                {!done && <Text className="stream-bd__cursor"> </Text>}
              </Text>
            </View>
          </ScrollView>
          <View className="stream-ft safe-area-bottom">
            {generationComplete ? (
              <View className="stream-ft__actions">
                <GlowButton onClick={handleSave} size="md" variant="outline" fullWidth>{saving ? '保存中…' : '保存文案'}</GlowButton>
                <GlowButton onClick={handleRecord} size="md" fullWidth>去录制</GlowButton>
              </View>
            ) : (
              <View className="stream-ft__status">
                <View className="stream-ft__spin" />
                <Text className="stream-ft__count">已生成 {fullText.length} 字</Text>
              </View>
            )}
          </View>
        </View>
      </View>
    )
  }

  return (
    <View className="page-root generate-page">
      <Toast />
      <ScrollView scrollY className="generate-page__form">

        {/* Step 1 */}
        <View className="gen-step">
          <View className="gen-step__hd">
            <Text className="gen-step__num">1</Text>
            <Text className="gen-step__title">想聊什么？</Text>
          </View>
          <View className="gen-topic">
            <Textarea
              className="gen-topic__input"
              value={topic}
              onInput={(e) => setTopic(e.detail.value)}
              placeholder="输入产品名、话题或你想表达的内容&#10;例如：兰蔻小黑瓶精华、我最近发现一个护肤秘诀…"
              maxlength={100}
              autoHeight
            />
            <Text className="gen-topic__count">{topic.length}/100</Text>
          </View>
        </View>

        {/* Step 2 */}
        <View className="gen-step">
          <View className="gen-step__hd">
            <Text className="gen-step__num">2</Text>
            <Text className="gen-step__title">内容类型</Text>
          </View>
          <View className="gen-row3">
            {SCRIPT_TYPES.map((t) => (
              <View
                key={t.value}
                className={`gen-option${scriptType === t.value ? ' gen-option--active' : ''}`}
                onClick={() => setScriptType(t.value)}
              >
                <Text className="gen-option__label">{t.label}</Text>
                <Text className="gen-option__desc">{t.desc}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Step 3 */}
        <View className="gen-step">
          <View className="gen-step__hd">
            <Text className="gen-step__num">3</Text>
            <Text className="gen-step__title">说话人设</Text>
          </View>
          <View className="gen-row2">
            {PERSONAS.map((p) => (
              <View
                key={p.value}
                className={`gen-option gen-option--persona${persona === p.value ? ' gen-option--active' : ''}`}
                onClick={() => setPersona(p.value)}
              >
                <Text className="gen-option__label">{p.label}</Text>
                <Text className="gen-option__desc">{p.desc}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Step 4 */}
        <View className="gen-step">
          <View className="gen-step__hd">
            <Text className="gen-step__num">4</Text>
            <Text className="gen-step__title">视频时长</Text>
          </View>
          <View className="gen-durations">
            {DURATIONS.map((d) => (
              <View
                key={d.value}
                className={`gen-dur${duration === d.value ? ' gen-dur--active' : ''}`}
                onClick={() => setDuration(d.value)}
              >
                {d.label}
              </View>
            ))}
          </View>
          {duration === 'custom' && (
            <View className="gen-custom-dur">
              <Input
                className="gen-custom-dur__input"
                type="number"
                value={customMinutes}
                onInput={(e) => setCustomMinutes(e.detail.value)}
                placeholder="输入分钟数"
              />
              <Text className="gen-custom-dur__unit">分钟</Text>
            </View>
          )}
        </View>

        <View className="gen-cta">
          <GlowButton onClick={handleGenerate} size="lg" fullWidth>一键生成爆款文案</GlowButton>
        </View>

      </ScrollView>
    </View>
  )
}
