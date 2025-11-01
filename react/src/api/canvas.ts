import { CanvasData, Message, Session } from '@/types/types'
import { ToolInfo } from '@/api/model'

export type ListCanvasesResponse = {
  id: string
  name: string
  description?: string
  thumbnail?: string
  created_at: string
}

export async function listCanvases(): Promise<ListCanvasesResponse[]> {
  const response = await fetch('/api/canvas/list')
  return await response.json()
}

export async function createCanvas(data: {
  name: string
  canvas_id: string
  messages: Message[]
  session_id: string
  text_model: {
    provider: string
    model: string
    url: string
  }
  tool_list: ToolInfo[]

  system_prompt: string
}): Promise<{ id: string }> {
  const response = await fetch('/api/canvas/create', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  return await response.json()
}

export async function getCanvas(
  id: string
): Promise<{ data: CanvasData | null; name: string; sessions: Session[] }> {
  try {
    const response = await fetch(`/api/canvas/${id}`)

    if (!response.ok) {
      console.warn(`Canvas API returned ${response.status}: ${response.statusText}`)
      // 返回默认数据而不是抛出错误
      return {
        data: null,
        name: '未命名画布',
        sessions: []
      }
    }

    const data = await response.json()

    // 更宽松的数据验证
    if (!data) {
      console.warn('Canvas API returned null/undefined data')
      return {
        data: null,
        name: '未命名画布',
        sessions: []
      }
    }

    // 确保返回的数据结构正确
    return {
      data: data.data || null,
      name: data.name || '未命名画布',
      sessions: Array.isArray(data.sessions) ? data.sessions : []
    }
  } catch (error) {
    console.error('Error fetching canvas:', error)
    // 网络错误或其他异常时返回默认数据
    return {
      data: null,
      name: '未命名画布',
      sessions: []
    }
  }
}

export async function saveCanvas(
  id: string,
  payload: {
    data: CanvasData
    thumbnail: string
  }
): Promise<void> {
  const response = await fetch(`/api/canvas/${id}/save`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!response.ok) {
    throw new Error(`Failed to save canvas: ${response.status} ${response.statusText}`)
  }
}

export async function renameCanvas(id: string, name: string): Promise<void> {
  const response = await fetch(`/api/canvas/${id}/rename`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  })
  return await response.json()
}

export async function deleteCanvas(id: string): Promise<void> {
  const response = await fetch(`/api/canvas/${id}/delete`, {
    method: 'DELETE',
  })
  return await response.json()
}
