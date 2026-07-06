import { View, Text } from '@tarojs/components'
import './index.scss'

export default function ProfilePage() {
  return (
    <View className="page-root profile-page">
      <View className="profile-page__header">
        <View className="profile-avatar">
          <Text className="profile-avatar__letter">U</Text>
        </View>
        <Text className="profile-page__name">创作者</Text>
        <Text className="profile-page__id">ID: ---</Text>
      </View>
      <View className="profile-page__coming-soon">
        <Text className="profile-page__cs-icon">🚀</Text>
        <Text className="profile-page__cs-title">个人中心即将上线</Text>
        <Text className="profile-page__cs-desc">数据统计、创作历史、账号设置正在开发中</Text>
      </View>
    </View>
  )
}
