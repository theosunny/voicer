import type { ApiResponse, VideoStatus, FrameMarker } from '../types/api'
import { apiGet, apiUpload } from './client'

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
