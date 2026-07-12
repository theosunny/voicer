import type { ApiResponse, VideoStatus, FrameMarker } from '../types/api'
import { apiGet, apiUpload, apiDelete } from './client'

export async function getVideoStatus(videoId: string): Promise<ApiResponse<VideoStatus>> {
  return apiGet<VideoStatus>(`/api/video/${videoId}/status`)
}

export async function submitVideo(
  filePath: string,
  scriptId: string,
  frameMarkers: FrameMarker[],
  asrResult?: string,
): Promise<ApiResponse<{ video_id: string }>> {
  const formData: Record<string, string> = {
    script_id: scriptId,
    frame_markers: JSON.stringify(frameMarkers),
    ...(asrResult ? { asr_result: asrResult } : {}),
  }
  return apiUpload<{ video_id: string }>('/api/video/submit', filePath, formData)
}

export interface VideoListItem {
  id: string
  user_id: string
  script_id?: string
  raw_video_url: string
  processed_video_url: string
  status: string
  error_msg?: string
  created_at: string
  completed_at?: string
}

export async function deleteVideo(videoId: string): Promise<ApiResponse<void>> {
  return apiDelete<void>(`/api/video/${videoId}`)
}

export async function listVideos(limit = 20, offset = 0): Promise<ApiResponse<VideoListItem[]> & { total?: number }> {
  return apiGet<VideoListItem[]>(`/api/videos?limit=${limit}&offset=${offset}`) as Promise<ApiResponse<VideoListItem[]> & { total?: number }>
}
