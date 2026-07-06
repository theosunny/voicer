import { View, Text } from '@tarojs/components'
import Taro from '@tarojs/taro'
import GlowButton from '../../components/glow-button'
import HudCard from '../../components/hud-card'
import './index.scss'

export default function CreatePage() {
  return (
    <View className="page-root create-page">
      <View className="create-page__header">
        <Text className="create-page__title">开始创作</Text>
        <Text className="create-page__sub">选择你的创作方式</Text>
      </View>
      <View className="create-page__cards">
        <HudCard color="primary" className="create-card">
          <View onClick={() => Taro.switchTab({ url: '/pages/index/index' })}>
            <Text className="create-card__icon">📋</Text>
            <Text className="create-card__title">从模板创作</Text>
            <Text className="create-card__desc">从爆款模板出发，AI 按结构填充内容，快速产出高质量文案</Text>
            <View className="create-card__btn-row">
              <GlowButton onClick={() => Taro.switchTab({ url: '/pages/index/index' })} size="sm">浏览模板 →</GlowButton>
            </View>
          </View>
        </HudCard>
        <HudCard color="cyan" className="create-card">
          <View onClick={() => Taro.navigateTo({ url: '/pages/script/generate' })}>
            <Text className="create-card__icon">✍️</Text>
            <Text className="create-card__title">自由创作</Text>
            <Text className="create-card__desc">输入你的主题和风格，让 AI 从零帮你写一篇口播文案</Text>
            <View className="create-card__btn-row">
              <GlowButton onClick={() => Taro.navigateTo({ url: '/pages/script/generate' })} size="sm">自由创作 →</GlowButton>
            </View>
          </View>
        </HudCard>
      </View>
    </View>
  )
}
