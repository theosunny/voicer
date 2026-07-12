import { View, Text, Image, Textarea } from '@tarojs/components'
import Taro, { useLoad } from '@tarojs/taro'
import { useState } from 'react'
import GlowButton from '../../components/glow-button'
import Icon from '../../components/icon'
import { updateProfile, getProfile } from '../../api/user'
import type { UserInfo } from '../../api/user'
import './index.scss'

const PERSONA_PRESETS = ['美妆博主，喜欢分享护肤心得', '科技达人，专注数码产品测评', '宝妈，分享育儿好物和生活技巧', '健身教练，传递运动健康理念']

export default function ProfilePage() {
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null)
  const [editingPersona, setEditingPersona] = useState(false)
  const [personaDraft, setPersonaDraft] = useState('')

  useLoad(async () => {
    Taro.setNavigationBarTitle({ title: '我的' })
    const raw = Taro.getStorageSync('user_info') as string
    if (raw) {
      try {
        const info = JSON.parse(raw) as UserInfo
        setUserInfo(info)
        setPersonaDraft(info.persona ?? '')
      } catch {}
    }
    // Sync latest persona from server
    const token = Taro.getStorageSync('auth_token')
    if (token) {
      try {
        const res = await getProfile()
        if (res.success && res.data) {
          const updated = { ...JSON.parse(Taro.getStorageSync('user_info') || '{}'), ...res.data }
          setUserInfo(updated)
          setPersonaDraft(res.data.persona ?? '')
          Taro.setStorageSync('user_info', JSON.stringify(updated))
        }
      } catch {}
    }
  })

  function handleLogout() {
    Taro.showModal({
      title: '退出登录',
      content: '确定要退出吗？',
      confirmText: '退出',
      confirmColor: '#FE2C55',
      success: (res) => {
        if (res.confirm) {
          Taro.removeStorageSync('auth_token')
          Taro.removeStorageSync('user_info')
          Taro.redirectTo({ url: '/pages/login/index' })
        }
      },
    })
  }

  async function handleUpdateProfile() {
    try {
      const profileRes = await Taro.getUserProfile({ desc: '更新头像和昵称' })
      const { nickName, avatarUrl } = profileRes.userInfo
      const res = await updateProfile(nickName, avatarUrl, userInfo?.persona ?? '')
      if (res.success) {
        const updated = { ...userInfo!, nickname: nickName, avatar_url: avatarUrl }
        setUserInfo(updated)
        Taro.setStorageSync('user_info', JSON.stringify(updated))
        Taro.showToast({ title: '更新成功', icon: 'success' })
      }
    } catch {
      Taro.showToast({ title: '更新失败', icon: 'none' })
    }
  }

  async function handleSavePersona() {
    const res = await updateProfile(userInfo?.nickname ?? '', userInfo?.avatar_url ?? '', personaDraft)
    if (res.success) {
      const updated = { ...userInfo!, persona: personaDraft }
      setUserInfo(updated)
      Taro.setStorageSync('user_info', JSON.stringify(updated))
      setEditingPersona(false)
      Taro.showToast({ title: '人设已保存', icon: 'success' })
    } else {
      Taro.showToast({ title: '保存失败', icon: 'none' })
    }
  }

  const firstLetter = userInfo?.nickname ? userInfo.nickname[0] : '我'

  return (
    <View className="page-root profile-page">
      <View className="profile-page__header">
        {userInfo?.avatar_url ? (
          <Image className="profile-avatar profile-avatar--img" src={userInfo.avatar_url} mode="aspectFill" />
        ) : (
          <View className="profile-avatar">
            <Text className="profile-avatar__letter">{firstLetter}</Text>
          </View>
        )}
        <Text className="profile-page__name">{userInfo?.nickname || '未登录'}</Text>
        <Text className="profile-page__id">
          {userInfo ? `ID: ${userInfo.user_id.slice(0, 8)}` : '点击下方登录'}
        </Text>
      </View>

      {!userInfo ? (
        <View className="profile-page__login-tip">
          <GlowButton onClick={() => Taro.navigateTo({ url: '/pages/login/index' })} size="md">
            微信登录
          </GlowButton>
        </View>
      ) : (
        <View>
          {/* Persona card */}
          <View className="profile-section">
            <View className="profile-section__hd">
              <Text className="profile-section__title">我的人设</Text>
              <Text className="profile-section__hint">AI 会根据人设生成更贴近你风格的文案</Text>
            </View>
            {editingPersona ? (
              <View className="profile-persona__edit">
                <Textarea
                  className="profile-persona__input"
                  value={personaDraft}
                  onInput={(e) => setPersonaDraft(e.detail.value)}
                  placeholder="用一两句话描述你的创作者身份，例如：28岁宝妈，分享母婴好物和育儿心得"
                  maxlength={100}
                  autoHeight
                />
                <Text className="profile-persona__count">{personaDraft.length}/100</Text>
                <View className="profile-persona__presets">
                  {PERSONA_PRESETS.map((p) => (
                    <View key={p} className={`profile-persona__preset${personaDraft === p ? ' profile-persona__preset--active' : ''}`} onClick={() => setPersonaDraft(p)}>
                      {p}
                    </View>
                  ))}
                </View>
                <View className="profile-persona__actions">
                  <GlowButton onClick={() => setEditingPersona(false)} size="sm" variant="outline">取消</GlowButton>
                  <GlowButton onClick={handleSavePersona} size="sm">保存</GlowButton>
                </View>
              </View>
            ) : (
              <View className="profile-persona__display" onClick={() => setEditingPersona(true)}>
                {userInfo.persona ? (
                  <Text className="profile-persona__text">{userInfo.persona}</Text>
                ) : (
                  <Text className="profile-persona__empty">点击设置你的创作者人设 →</Text>
                )}
              </View>
            )}
          </View>

          {/* Actions */}
          <View className="profile-page__actions">
            <View className="profile-action" onClick={handleUpdateProfile}>
              <Icon name="user" size={20} color="var(--color-text-2)" />
              <Text className="profile-action__label">更新头像和昵称</Text>
              <Text className="profile-action__arrow">›</Text>
            </View>
            <View className="profile-action profile-action--danger" onClick={handleLogout}>
              <Icon name="close" size={20} color="var(--color-error)" />
              <Text className="profile-action__label profile-action__label--danger">退出登录</Text>
              <Text className="profile-action__arrow">›</Text>
            </View>
          </View>
        </View>
      )}
    </View>
  )
}
