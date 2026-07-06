import Taro from '@tarojs/taro'
import type { ApiResponse } from '../types/api'

export const API_BASE = (process.env.TARO_APP_API_BASE as string) ?? 'http://localhost:8080'

function getAuthHeader(): Record<string, string> {
  const token = Taro.getStorageSync('auth_token') as string | undefined
  return token ? { Authorization: `Bearer ${token}` } : {}
}

export async function apiGet<T>(path: string): Promise<ApiResponse<T>> {
  const res = await Taro.request<ApiResponse<T>>({
    url: `${API_BASE}${path}`,
    method: 'GET',
    header: { 'Content-Type': 'application/json', ...getAuthHeader() },
  })
  return res.data
}

export async function apiPost<T>(path: string, body: unknown): Promise<ApiResponse<T>> {
  const res = await Taro.request<ApiResponse<T>>({
    url: `${API_BASE}${path}`,
    method: 'POST',
    data: body,
    header: { 'Content-Type': 'application/json', ...getAuthHeader() },
  })
  return res.data
}

export async function apiUpload<T>(
  path: string,
  filePath: string,
  formData: Record<string, string>,
): Promise<ApiResponse<T>> {
  const res = await Taro.uploadFile({
    url: `${API_BASE}${path}`,
    filePath,
    name: 'video',
    formData,
    header: { ...getAuthHeader() },
  })
  return JSON.parse(res.data) as ApiResponse<T>
}
