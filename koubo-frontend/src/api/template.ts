import type { API } from '@tarojs/taro'
import type { Template } from '../types/api'
import { apiGet } from './client'

export interface GetTrendingParams {
  domain?: string
  limit?: number
  page?: number
}

export async function getTrendingTemplates(
  params: GetTrendingParams = {},
): Promise<{ data: Template[]; total: number }> {
  const { domain = '', limit = 10, page = 1 } = params
  const parts: string[] = [`limit=${limit}`, `page=${page}`]
  if (domain) parts.push(`domain=${encodeURIComponent(domain)}`)
  const qs = parts.join('&')
  return apiGet<{ data: Template[]; total: number }>(`/api/templates/trending?${qs}`) as any
}
