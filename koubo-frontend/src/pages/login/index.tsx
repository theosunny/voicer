import { View, Text, Image } from '@tarojs/components'
import Taro, { useLoad } from '@tarojs/taro'
import { useState } from 'react'
import GlowButton from '../../components/glow-button'
import { wxLogin } from '../../api/user'
import './index.scss'

export default function LoginPage() {
  const [loading, setLoading] = useState(false)

  useLoad(() => {
    Taro.setNavigationBarTitle({ title: '登录' })
    // If already logged in, go home
    const token = Taro.getStorageSync('auth_token')
    if (token) redirectHome()
  })

  function redirectHome() {
    Taro.switchTab({ url: '/pages/index/index' })
  }

  async function handleLogin() {
    if (loading) return
    setLoading(true)
    try {
      // Step 1: get wx.login code
      const loginRes = await Taro.login()
      if (!loginRes.code) {
        Taro.showToast({ title: '登录失败，请重试', icon: 'none' })
        setLoading(false)
        return
      }

      // Step 2: try to get user profile (nickname + avatar)
      // getUserProfile requires a user gesture (button tap) — we call it here
      let nickname = ''
      let avatarUrl = ''
      try {
        const profileRes = await Taro.getUserProfile({ desc: '用于完善个人信息' })
        nickname = profileRes.userInfo.nickName
        avatarUrl = profileRes.userInfo.avatarUrl
      } catch {
        // User denied profile, proceed without it
      }

      // Step 3: exchange code for our token
      const res = await wxLogin(loginRes.code, nickname, avatarUrl)
      if (res.success && res.data) {
        Taro.setStorageSync('auth_token', res.data.token)
        Taro.setStorageSync('user_info', JSON.stringify(res.data))
        redirectHome()
      } else {
        Taro.showToast({ title: '登录失败，请重试', icon: 'none' })
      }
    } catch {
      Taro.showToast({ title: '网络错误，请重试', icon: 'none' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <View className="login-page">
      <View className="login-page__top">
        <View className="login-page__logo">
          <Text className="login-page__logo-text">口播</Text>
        </View>
        <Text className="login-page__title">AI 口播创作</Text>
        <Text className="login-page__sub">写文案 · 录视频 · 一键生成</Text>
      </View>

      <View className="login-page__features">
        {[
          { icon: '✦', text: 'AI 智能写文案，30 秒出稿' },
          { icon: '◎', text: '提词器辅助录制，零失误' },
          { icon: '▶', text: '自动生成口播视频' },
        ].map((f) => (
          <View key={f.text} className="login-page__feature">
            <Text className="login-page__feature-icon">{f.icon}</Text>
            <Text className="login-page__feature-text">{f.text}</Text>
          </View>
        ))}
      </View>

      <View className="login-page__bottom">
        <GlowButton onClick={handleLogin} loading={loading} size="lg" fullWidth>
          微信一键登录
        </GlowButton>
        <Text className="login-page__agree">登录即同意用户协议和隐私政策</Text>
      </View>
    </View>
  )
}
