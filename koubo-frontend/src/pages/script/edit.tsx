import { View, Text, Textarea } from '@tarojs/components'
import Taro, { useLoad, useRouter } from '@tarojs/taro'
import { useState } from 'react'
import GlowButton from '../../components/glow-button'
import Toast, { useToast } from '../../components/toast'
import { getScript, saveDraft } from '../../api/script'
import './edit.scss'

function estimateDuration(text: string): string {
  const s = Math.round(text.replace(/\s/g, '').length / 4)
  if (s < 60) return `约 ${s} 秒`
  const m = Math.floor(s / 60); const ss = s % 60
  return `约 ${m} 分${ss > 0 ? ` ${ss} 秒` : ''}`
}

export default function EditPage() {
  const router = useRouter()
  const toast = useToast()
  const [content, setContent] = useState('')
  const [title] = useState('')
  const [scriptType] = useState('产品推广')
  const [style] = useState('轻松随性')
  const [saving, setSaving] = useState(false)
  const [scriptId, setScriptId] = useState<string | null>(null)

  useLoad(async () => {
    Taro.setNavigationBarTitle({ title: '编辑' })
    const { script_id } = router.params
    if (!script_id) return
    setScriptId(script_id)
    try {
      const res = await getScript(script_id)
      if (res.success && res.data) setContent(res.data.content)
    } catch { toast.error('加载文案失败') }
  })

  async function handleSave() {
    if (saving) return
    setSaving(true)
    try {
      const res = await saveDraft({ id: scriptId ?? undefined, title, content, script_type: scriptType, style })
      if (res.success) { if (res.data?.id) setScriptId(res.data.id); toast.success('已保存') }
      else toast.error('保存失败')
    } catch { toast.error('网络错误') }
    finally { setSaving(false) }
  }

  function handleRecord() {
    if (!scriptId) { toast.error('请先保存'); return }
    Taro.navigateTo({ url: `/pages/record/index?script_id=${scriptId}` })
  }

  const charCount = content.replace(/\s/g, '').length

  return (
    <View className="page-root edit-page">
      <Toast />

      <View className="edit-page__meta">
        <Text className="edit-page__stat edit-page__stat--bold">{charCount}</Text>
        <Text className="edit-page__stat">字</Text>
        <Text className="edit-page__stat-sep">·</Text>
        <Text className="edit-page__stat">{estimateDuration(content)}</Text>
      </View>

      <View className="edit-page__editor-wrap">
        <Textarea className="edit-page__editor" value={content} onInput={(e) => setContent(e.detail.value)} placeholder="编辑你的文案…" autoHeight maxlength={5000} />
      </View>

      <View className="edit-page__btm safe-area-bottom">
        <View className="edit-page__save" onClick={handleSave}>{saving ? '保存中…' : '保存'}</View>
        <GlowButton onClick={handleRecord} size="md" fullWidth>开始录制</GlowButton>
      </View>
    </View>
  )
}
