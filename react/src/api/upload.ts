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
