import type { ApiResponse, Script, SaveDraftRequest } from '../types/api'
import { apiGet, apiPost } from './client'

export async function getScript(id: string): Promise<ApiResponse<Script>> {
  return apiGet<Script>(`/api/script/${id}`)
}

export async function saveDraft(data: SaveDraftRequest & { id?: string }): Promise<ApiResponse<Script>> {
  return apiPost<Script>('/api/script/draft', data)
}

export async function updateDraft(id: string, data: SaveDraftRequest): Promise<ApiResponse<Script>> {
  return apiPost<Script>('/api/script/draft', { ...data, id })
}
