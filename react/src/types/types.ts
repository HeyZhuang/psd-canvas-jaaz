import { OrderedExcalidrawElement } from '@excalidraw/excalidraw/element/types'
import { AppState, BinaryFiles } from '@excalidraw/excalidraw/types'

export type ToolCallFunctionName =
  | 'generate_image'
  | 'prompt_user_multi_choice'
  | 'prompt_user_single_choice'
  | 'write_plan'
  | 'finish'

export type ToolCall = {
  id: string
  type: 'function'
  function: {
    name: ToolCallFunctionName
    arguments: string
  }
  result?: string // Only for manually merged message list by mergeToolCallResult
}
export type MessageContentType = MessageContent[] | string
export type MessageContent =
  | { text: string; type: 'text' }
  | { image_url: { url: string }; type: 'image_url' }

export type ToolResultMessage = {
  role: 'tool'
  tool_call_id: string
  content: string
}
export type AssistantMessage = {
  role: 'assistant'
  tool_calls?: ToolCall[]
  content?: MessageContent[] | string
}
export type UserMessage = {
  role: 'user'
  content: MessageContent[] | string
}
export type Message = UserMessage | AssistantMessage | ToolResultMessage

export type PendingType = 'text' | 'image' | 'tool' | false

export interface ChatSession {
  id: string
  model: string
  provider: string
  title: string | null
  created_at: string
  updated_at: string
}
export interface MessageGroup {
  id: number
  role: string
  messages: Message[]
}

export enum EAgentState {
  IDLE = 'IDLE',
  RUNNING = 'RUNNING',
  FINISHED = 'FINISHED',
  ERROR = 'ERROR',
}

export type LLMConfig = {
  models: Record<
    string,
    {
      type?: 'text' | 'image' | 'video'
      is_custom?: boolean
      is_disabled?: boolean
    }
  >
  url: string
  api_key: string
  max_tokens?: number
  is_custom?: boolean
}

export interface AppStateWithVideos extends AppState {
  videoElements?: any[]
}

export type CanvasData = {
  elements: Readonly<OrderedExcalidrawElement[]>
  appState: AppStateWithVideos
  files: BinaryFiles
}

export type Session = {
  created_at: string
  id: string
  model: string
  provider: string
  title: string
  updated_at: string
}

export type Model = {
  provider: string
  model: string
  url: string
}

// 模板管理相关类型定义
export interface TemplateCategory {
  id: string
  name: string
  description?: string
  icon?: string
  color?: string
  created_at: string
  updated_at: string
}

export interface TemplateItem {
  id: string
  name: string
  description?: string
  category_id: string
  type: 'psd_file' | 'psd_layer' | 'image' | 'text_style' | 'layer_group' | 'canvas_element'
  thumbnail_url?: string
  preview_url?: string
  metadata: {
    // PSD文件模板
    psd_file_id?: string
    original_filename?: string
    width?: number
    height?: number
    layers_count?: number
    layers_info?: Array<{
      index: number
      name: string
      visible: boolean
      opacity: number
      type: 'layer' | 'group' | 'text'
      width: number
      height: number
      image_url?: string
    }>
    file_type?: string
    created_from?: string
    // PSD图层模板
    layer_index?: number
    layer_name?: string
    layer_type?: 'text' | 'layer' | 'group'
    // 图片模板
    image_url?: string
    image_width?: number
    image_height?: number
    // 文字样式模板
    font_family?: string
    font_size?: number
    font_weight?: string
    font_style?: string
    text_color?: string
    text_align?: string
    // 图层组模板
    layer_group?: {
      layers: Array<{
        index: number
        name: string
        visible: boolean
        opacity: number
      }>
    }
    // 画布元素模板
    canvas_element?: {
      element_type: string
      element_data: any
    }
  }
  tags: string[]
  usage_count: number
  is_favorite: boolean
  is_public: boolean
  created_at: string
  updated_at: string
  created_by?: string
}

export interface TemplateCollection {
  id: string
  name: string
  description?: string
  template_ids: string[]
  thumbnail_url?: string
  is_public: boolean
  created_at: string
  updated_at: string
  created_by?: string
}

export interface TemplateSearchFilters {
  category_id?: string
  type?: TemplateItem['type']
  tags?: string[]
  is_favorite?: boolean
  is_public?: boolean
  created_by?: string
  date_range?: {
    start: string
    end: string
  }
}

export interface TemplateUploadData {
  name: string
  description?: string
  category_id: string
  type: TemplateItem['type']
  metadata: TemplateItem['metadata']
  tags: string[]
  is_public: boolean
  thumbnail_file?: File
  preview_file?: File
}
