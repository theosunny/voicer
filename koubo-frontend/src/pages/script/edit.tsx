import { View, Text, Textarea } from '@tarojs/components'
import Taro, { useLoad, useRouter } from '@tarojs/taro'
import { useState } from 'react'
import GlowButton from '../../components/glow-button'
import Toast, { useToast } from '../../components/toast'
import { getScript, saveDraft } from '../../api/script'
import './edit.scss'

function estimateDuration(text: string): string {
  const secs = Math.round(text.replace(/\s/g, '').length / 4)
  if (secs < 60) return `约 ${secs} 秒`
  const m = Math.floor(secs / 60)
  const s = secs % 60
  return `约 ${m} 分${s > 0 ? ` ${s} 秒` : ''}`
}

export default function EditPage() {
  const router = useRouter()
  const toast = useToast()

  const [content, setContent] = useState('')
  const [title, setTitle] = useState('')
  const [scriptType, setScriptType] = useState('产品推广')
  const [style, setStyle] = useState('轻松随性')
  const [saving, setSaving] = useState(false)
  const [scriptId, setScriptId] = useState<string | null>(null)

  useLoad(async () => {
    const { script_id } = router.params
    if (!script_id) return
    setScriptId(script_id)
    try {
      const res = await getScript(script_id)
      if (res.success && res.data) {
        setContent(res.data.content)
        setTitle(res.data.title ?? '')
        setScriptType(res.data.script_type ?? '产品推广')
        setStyle(res.data.style ?? '轻松随性')
      }
    } catch {
      toast.error('加载文案失败')
    }
  })

  async function handleSave() {
    if (saving) return
    setSaving(true)
    try {
      const res = await saveDraft({ id: scriptId ?? undefined, title, content, script_type: scriptType, style })
      if (res.success) {
        if (res.data?.id) setScriptId(res.data.id)
        toast.success('已保存草稿')
      } else {
        toast.error('保存失败')
      }
    } catch {
      toast.error('网络错误，请重试')
    } finally {
      setSaving(false)
    }
  }

  function handleRecord() {
    if (!scriptId) { toast.error('请先保存草稿'); return }
    Taro.navigateTo({ url: `/pages/record/index?script_id=${scriptId}` })
  }

  const charCount = content.replace(/\s/g, '').length

  return (
    <View className="page-root edit-page">
      <Toast />
      <View className="edit-page__header">
        <View className="edit-page__back" onClick={() => Taro.navigateBack()}>←</View>
        <Text className="edit-page__title">编辑文案</Text>
        <View className="edit-page__regen" onClick={() => Taro.navigateBack()}>重新生成</View>
      </View>
      <View className="edit-page__stats">
        <View className="edit-page__stat">
          <Text className="edit-page__stat-value">{charCount}</Text>
          <Text className="edit-page__stat-label">字</Text>
        </View>
        <View className="edit-page__stat-sep">·</View>
        <View className="edit-page__stat">
          <Text className="edit-page__stat-value stat-duration">{estimateDuration(content)}</Text>
        </View>
      </View>
      <View className="edit-page__editor-wrap">
        <Textarea
          className="edit-page__editor"
          value={content}
          onInput={(e) => setContent(e.detail.value)}
          placeholder="在这里编辑文案..."
          autoHeight
          maxlength={5000}
        />
      </View>
      <View className="edit-page__bottom safe-area-bottom">
        <View className="edit-page__save-btn" onClick={handleSave}>
          {saving ? '保存中...' : '保存草稿'}
        </View>
        <GlowButton onClick={handleRecord} size="md">开始录制 →</GlowButton>
      </View>
    </View>
  )
}
