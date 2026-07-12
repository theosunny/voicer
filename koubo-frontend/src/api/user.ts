import { apiPost, apiPatch, apiGet } from './client'

export interface UserInfo {
  token: string
  user_id: string
  nickname: string
  avatar_url: string
  persona: string
}

export async function wxLogin(code: string, nickname?: string, avatarUrl?: string) {
  return apiPost<UserInfo>('/api/auth/wx-login', {
    code,
    nickname: nickname ?? '',
    avatar_url: avatarUrl ?? '',
  })
}

export async function getProfile() {
  return apiGet<UserInfo>('/api/auth/profile')
}

export async function updateProfile(nickname: string, avatarUrl: string, persona: string) {
  return apiPatch<{ nickname: string; avatar_url: string; persona: string }>('/api/auth/profile', {
    nickname,
    avatar_url: avatarUrl,
    persona,
  })
}
