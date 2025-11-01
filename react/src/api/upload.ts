import { compressImageFile } from '@/utils/imageUtils'

export async function uploadImage(
  file: File
): Promise<{ file_id: string; width: number; height: number; url: string }> {
  // Compress image before upload
  const compressedFile = await compressImageFile(file)

  const formData = new FormData()
  formData.append('file', compressedFile)
  const response = await fetch('/api/upload_image', {
    method: 'POST',
    body: formData,
  })
  return await response.json()
}

export interface PSDLayer {
  index: number
  name: string
  visible: boolean
  opacity: number
  blend_mode: string
  left: number
  top: number
  width: number
  height: number
  parent_index: number | null
  type: 'layer' | 'group' | 'text'
  image_url?: string
  // 字體相關屬性
  font_family?: string
  font_size?: number
  font_weight?: string
  font_style?: string
  text_align?: string
  text_color?: string
  text_content?: string
  line_height?: number
  letter_spacing?: number
  text_decoration?: string
}

export interface PSDUploadResponse {
  file_id: string
  url: string
  width: number
  height: number
  layers: PSDLayer[]
  thumbnail_url: string
  original_filename?: string  // 添加原始文件名
  template_id?: string  // 自动创建的模板ID
  template_created?: boolean  // 是否成功创建模板
}

export async function uploadPSD(file: File): Promise<PSDUploadResponse> {
  const formData = new FormData()
  formData.append('file', file)
  const response = await fetch('/api/psd/upload', {
    method: 'POST',
    body: formData,
  })
  if (!response.ok) {
    throw new Error(`Failed to upload PSD: ${response.statusText}`)
  }
  return await response.json()
}

export async function getPSDMetadata(fileId: string) {
  const response = await fetch(`/api/psd/metadata/${fileId}`)
  if (!response.ok) {
    throw new Error(`Failed to get PSD metadata: ${response.statusText}`)
  }
  return await response.json()
}

export async function updatePSDLayer(
  fileId: string,
  layerIndex: number,
  file: File
) {
  const formData = new FormData()
  formData.append('file', file)
  const response = await fetch(`/api/psd/update_layer/${fileId}/${layerIndex}`, {
    method: 'POST',
    body: formData,
  })
  if (!response.ok) {
    throw new Error(`Failed to update layer: ${response.statusText}`)
  }
  return await response.json()
}

export async function updateLayerOrder(fileId: string, layerOrder: number[]) {
  const response = await fetch(`/api/psd/update_layer_order/${fileId}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(layerOrder),
  })
  if (!response.ok) {
    throw new Error(`Failed to update layer order: ${response.statusText}`)
  }
  return await response.json()
}

export async function duplicatePSDLayer(fileId: string, layerIndex: number) {
  const response = await fetch(`/api/psd/duplicate_layer/${fileId}/${layerIndex}`, {
    method: 'POST',
  })
  if (!response.ok) {
    throw new Error(`Failed to duplicate layer: ${response.statusText}`)
  }
  return await response.json()
}

export async function deletePSDLayer(fileId: string, layerIndex: number) {
  const response = await fetch(`/api/psd/delete_layer/${fileId}/${layerIndex}`, {
    method: 'DELETE',
  })
  if (!response.ok) {
    throw new Error(`Failed to delete layer: ${response.statusText}`)
  }
  return await response.json()
}

export async function updateLayerProperties(
  fileId: string,
  layerIndex: number,
  properties: Record<string, any>
) {
  const response = await fetch(`/api/psd/update_layer_properties/${fileId}/${layerIndex}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(properties),
  })
  if (!response.ok) {
    throw new Error(`Failed to update layer properties: ${response.statusText}`)
  }
  return await response.json()
}

export async function exportPSD(fileId: string, format: 'png' | 'jpg') {
  const response = await fetch(`/api/psd/export/${fileId}/${format}`, {
    method: 'POST',
  })
  if (!response.ok) {
    throw new Error(`Failed to export PSD: ${response.statusText}`)
  }
  return await response.json()
}

// PSD模板相关API
export async function getPSDTemplateLayers(templateId: string) {
  const response = await fetch(`/api/psd/template/${templateId}/layers`)
  if (!response.ok) {
    throw new Error(`Failed to get PSD template layers: ${response.statusText}`)
  }
  return await response.json()
}

export async function applyPSDTemplate(templateId: string, canvasId?: string) {
  const response = await fetch(`/api/psd/template/${templateId}/apply`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ canvas_id: canvasId }),
  })
  if (!response.ok) {
    throw new Error(`Failed to apply PSD template: ${response.statusText}`)
  }
  return await response.json()
}

// 获取template文件夹下的PSD模板列表
export interface PSDTemplateInfo {
  template_id: string | null
  name: string
  display_name: string
  description?: string | null
  width: number
  height: number
  layers_count: number
  thumbnail_url?: string | null
  is_parsed: boolean
  created_at?: string | null
  size?: number
  mtime?: number
}

export async function listPSDTemplates(): Promise<PSDTemplateInfo[]> {
  const response = await fetch('/api/psd/templates/list')
  if (!response.ok) {
    throw new Error(`Failed to list PSD templates: ${response.statusText}`)
  }
  const data = await response.json()
  return data.templates || []
}

// 根据模板ID获取已解析的PSD模板数据（快速加载）
export async function getPSDTemplateById(templateId: string): Promise<PSDUploadResponse> {
  const response = await fetch(`/api/psd/templates/by-id/${templateId}`)
  if (!response.ok) {
    throw new Error(`Failed to get PSD template: ${response.statusText}`)
  }
  return await response.json()
}

// 解析PSD模板文件
export async function parsePSDTemplate(filename: string): Promise<{ template_id: string, already_parsed: boolean, message: string }> {
  const response = await fetch(`/api/psd/templates/parse/${encodeURIComponent(filename)}`, {
    method: 'POST'
  })
  if (!response.ok) {
    throw new Error(`Failed to parse PSD template: ${response.statusText}`)
  }
  return await response.json()
}

// 智能图层排列相关API
export interface ElementArrangement {
  id: string
  type: string
  original_coords: {
    x: number
    y: number
    width: number
    height: number
  }
  new_coords: {
    x: number
    y: number
    width: number
    height: number
  }
  scale_factor: number
  adjustment_reason: string
  quality_check: string
  warnings: string[]
}

export interface ArrangeLayersRequest {
  selectedElements: any[]
  canvasWidth: number
  canvasHeight: number
  targetWidth: number
  targetHeight: number
  apiKey?: string
}

export interface ArrangeLayersResponse {
  success: boolean
  arrangements: ElementArrangement[]
}
export async function arrangeCanvasElements(request: ArrangeLayersRequest): Promise<ArrangeLayersResponse> {
  const response = await fetch('/api/psd/arrange-layers', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  })
  if (!response.ok) {
    throw new Error(`Failed to arrange layers: ${response.statusText}`)
  }
  return await response.json()
}