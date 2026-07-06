import Taro from '@tarojs/taro'
import type { PaginatedResponse, Template } from '../types/api'
import { API_BASE } from './client'

export interface GetTrendingParams {
  domain?: string
  limit?: number
  page?: number
}

export async function getTrendingTemplates(
  params: GetTrendingParams = {},
): Promise<PaginatedResponse<Template>> {
  const { domain = '', limit = 10, page = 1 } = params
  const parts: string[] = [`limit=${limit}`, `page=${page}`]
  if (domain) parts.push(`domain=${encodeURIComponent(domain)}`)
  const qs = parts.join('&')

  const res = await Taro.request<PaginatedResponse<Template>>({
    url: `${API_BASE}/api/templates/trending?${qs}`,
    method: 'GET',
    header: { 'Content-Type': 'application/json' },
  })
  return res.data
}
