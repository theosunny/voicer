import { View, Text } from '@tarojs/components'
import Taro from '@tarojs/taro'
import Icon from '../../components/icon'
import './index.scss'

export default function CreatePage() {
  return (
    <View className="page-root create-page">
      <View className="create-page__header">
        <Text className="create-page__eyebrow">AI 口播工作室</Text>
        <Text className="create-page__title">开始创作</Text>
        <Text className="create-page__sub">选择你的创作方式，AI 全程辅助</Text>
      </View>

      <View className="create-page__cards">
        {/* Template card */}
        <View className="create-card create-card--template"
          onClick={() => Taro.switchTab({ url: '/pages/index/index' })}>
          <View className="create-card__bg-deco" />
          <View className="create-card__top">
            <View className="create-card__icon-wrap create-card__icon-wrap--primary">
              <Icon name="film" size={24} color="#fff" />
            </View>
            <View className="create-card__tag">热门</View>
          </View>
          <Text className="create-card__title">从模板创作</Text>
          <Text className="create-card__desc">从爆款模板出发，AI 按结构填充内容，快速产出高质量文案</Text>
          <View className="create-card__footer">
            <Text className="create-card__cta">浏览模板 →</Text>
            <Text className="create-card__stat">1000+ 套模板</Text>
          </View>
        </View>

        {/* Free create card */}
        <View className="create-card create-card--free"
          onClick={() => Taro.navigateTo({ url: '/pages/script/generate' })}>
          <View className="create-card__bg-deco" />
          <View className="create-card__top">
            <View className="create-card__icon-wrap create-card__icon-wrap--cyan">
              <Icon name="sparkle" size={24} color="#fff" />
            </View>
          </View>
          <Text className="create-card__title">自由创作</Text>
          <Text className="create-card__desc">输入你的主题和风格，让 AI 从零帮你写一篇口播文案</Text>
          <View className="create-card__footer">
            <Text className="create-card__cta">立即创作 →</Text>
            <Text className="create-card__stat">30 秒出稿</Text>
          </View>
        </View>
      </View>

      <View className="create-page__tip">
        <Icon name="sparkle" size={13} color="var(--color-text-4)" />
        <Text className="create-page__tip-text">AI 生成内容仅供参考，请根据实际情况调整</Text>
      </View>
    </View>
  )
}
