export interface Template {
  id: string
  title: string
  description: string
  domain: string
  content_structure: string
  duration: '30s' | '60s' | '3min' | '5min' | '10min' | '15min'
  script_type: string
  usage_count: number
  is_featured: boolean
  created_at?: string
}

export interface Script {
  id: string
  title: string
  content: string
  script_type: string
  style: string
  duration_estimate: number
  status: 'draft' | 'final'
  created_at?: string
  updated_at?: string
}

export interface VideoStatus {
  status: 'processing' | 'completed' | 'failed'
  processed_video_url?: string
  error_msg?: string
  progress?: number
}

export interface ASRPosition {
  paragraph_index: number
  word_index: number
  timestamp_ms?: number
}

export interface GenerateScriptRequest {
  topic: string
  domain: string
  keywords?: string
  script_type: string
  style: string
  duration: '30s' | '60s' | '3min' | '5min' | '10min' | '15min'
  duration_sec?: number
  template_id?: string
  persona?: string
  persona_type?: string
  user_id?: string
}

export interface SaveDraftRequest {
  title: string
  content: string
  script_type: string
  style: string
}

export interface SubmitVideoRequest {
  script_id: string
  frame_markers: FrameMarker[]
  asr_result?: string
}

export interface FrameMarker {
  paragraph_index: number
  word_index: number
  timestamp_ms: number
}

export interface ApiResponse<T> {
  success: boolean
  data: T | null
  error?: string
}

export interface PaginatedResponse<T> {
  success: boolean
  data: T[]
  total: number
  page: number
  limit: number
}
