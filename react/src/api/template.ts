import {
    TemplateItem,
    TemplateCategory,
    TemplateCollection,
    TemplateSearchFilters,
    TemplateUploadData
} from '@/types/types'

const API_BASE = '/api/templates'

// 模板分类管理
export async function getTemplateCategories(): Promise<TemplateCategory[]> {
    const response = await fetch(`${API_BASE}/categories`)
    if (!response.ok) {
        throw new Error(`Failed to fetch categories: ${response.statusText}`)
    }
    return await response.json()
}

export async function createTemplateCategory(category: Omit<TemplateCategory, 'id' | 'created_at' | 'updated_at'>): Promise<TemplateCategory> {
    const response = await fetch(`${API_BASE}/categories`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(category),
    })
    if (!response.ok) {
        throw new Error(`Failed to create category: ${response.statusText}`)
    }
    return await response.json()
}

export async function updateTemplateCategory(id: string, category: Partial<TemplateCategory>): Promise<TemplateCategory> {
    const response = await fetch(`${API_BASE}/categories/${id}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(category),
    })
    if (!response.ok) {
        throw new Error(`Failed to update category: ${response.statusText}`)
    }
    return await response.json()
}

export async function deleteTemplateCategory(id: string): Promise<void> {
    const response = await fetch(`${API_BASE}/categories/${id}`, {
        method: 'DELETE',
    })
    if (!response.ok) {
        throw new Error(`Failed to delete category: ${response.statusText}`)
    }
}

// 模板项目管理
export async function getTemplates(filters?: TemplateSearchFilters): Promise<TemplateItem[]> {
    const params = new URLSearchParams()
    if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
            if (value !== undefined && value !== null) {
                if (Array.isArray(value)) {
                    value.forEach(v => params.append(key, v))
                } else if (typeof value === 'object') {
                    params.append(`${key}_start`, value.start)
                    params.append(`${key}_end`, value.end)
                } else {
                    params.append(key, String(value))
                }
            }
        })
    }

    const response = await fetch(`${API_BASE}/items?${params.toString()}`)
    if (!response.ok) {
        throw new Error(`Failed to fetch templates: ${response.statusText}`)
    }
    return await response.json()
}

export async function getTemplateById(id: string): Promise<TemplateItem> {
    const response = await fetch(`${API_BASE}/items/${id}`)
    if (!response.ok) {
        throw new Error(`Failed to fetch template: ${response.statusText}`)
    }
    return await response.json()
}

export async function createTemplate(templateData: TemplateUploadData): Promise<TemplateItem> {
    const formData = new FormData()

    // 添加基本信息
    formData.append('name', templateData.name)
    formData.append('description', templateData.description || '')
    formData.append('category_id', templateData.category_id)
    formData.append('type', templateData.type)
    formData.append('metadata', JSON.stringify(templateData.metadata))
    formData.append('tags', JSON.stringify(templateData.tags))
    formData.append('is_public', String(templateData.is_public))

    // 添加文件
    if (templateData.thumbnail_file) {
        formData.append('thumbnail', templateData.thumbnail_file)
    }
    if (templateData.preview_file) {
        formData.append('preview', templateData.preview_file)
    }

    const response = await fetch(`${API_BASE}/items`, {
        method: 'POST',
        body: formData,
    })
    if (!response.ok) {
        throw new Error(`Failed to create template: ${response.statusText}`)
    }
    return await response.json()
}

export async function updateTemplate(id: string, templateData: Partial<TemplateUploadData>): Promise<TemplateItem> {
    const formData = new FormData()

    // 添加更新的字段
    Object.entries(templateData).forEach(([key, value]) => {
        if (value !== undefined) {
            if (key === 'metadata' || key === 'tags') {
                formData.append(key, JSON.stringify(value))
            } else if (key === 'thumbnail_file') {
                formData.append('thumbnail', value as File)
            } else if (key === 'preview_file') {
                formData.append('preview', value as File)
            } else {
                formData.append(key, String(value))
            }
        }
    })

    const response = await fetch(`${API_BASE}/items/${id}`, {
        method: 'PUT',
        body: formData,
    })
    if (!response.ok) {
        throw new Error(`Failed to update template: ${response.statusText}`)
    }
    return await response.json()
}

export async function deleteTemplate(id: string): Promise<void> {
    const response = await fetch(`${API_BASE}/items/${id}`, {
        method: 'DELETE',
    })
    if (!response.ok) {
        throw new Error(`Failed to delete template: ${response.statusText}`)
    }
}

export async function toggleTemplateFavorite(id: string): Promise<TemplateItem> {
    const response = await fetch(`${API_BASE}/items/${id}/favorite`, {
        method: 'POST',
    })
    if (!response.ok) {
        throw new Error(`Failed to toggle favorite: ${response.statusText}`)
    }
    return await response.json()
}

export async function incrementTemplateUsage(id: string): Promise<void> {
    const response = await fetch(`${API_BASE}/items/${id}/usage`, {
        method: 'POST',
    })
    if (!response.ok) {
        throw new Error(`Failed to increment usage: ${response.statusText}`)
    }
}

// 模板集合管理
export async function getTemplateCollections(): Promise<TemplateCollection[]> {
    const response = await fetch(`${API_BASE}/collections`)
    if (!response.ok) {
        throw new Error(`Failed to fetch collections: ${response.statusText}`)
    }
    return await response.json()
}

export async function createTemplateCollection(collection: Omit<TemplateCollection, 'id' | 'created_at' | 'updated_at'>): Promise<TemplateCollection> {
    const response = await fetch(`${API_BASE}/collections`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(collection),
    })
    if (!response.ok) {
        throw new Error(`Failed to create collection: ${response.statusText}`)
    }
    return await response.json()
}

export async function updateTemplateCollection(id: string, collection: Partial<TemplateCollection>): Promise<TemplateCollection> {
    const response = await fetch(`${API_BASE}/collections/${id}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(collection),
    })
    if (!response.ok) {
        throw new Error(`Failed to update collection: ${response.statusText}`)
    }
    return await response.json()
}

export async function deleteTemplateCollection(id: string): Promise<void> {
    const response = await fetch(`${API_BASE}/collections/${id}`, {
        method: 'DELETE',
    })
    if (!response.ok) {
        throw new Error(`Failed to delete collection: ${response.statusText}`)
    }
}

// 从PSD图层创建模板
export async function createTemplateFromPSDLayer(
    psdFileId: string,
    layerIndex: number,
    templateData: Omit<TemplateUploadData, 'metadata' | 'type'>
): Promise<TemplateItem> {
    const formData = new FormData()
    formData.append('psd_file_id', psdFileId)
    formData.append('layer_index', layerIndex.toString())
    formData.append('name', templateData.name)
    formData.append('description', templateData.description || '')
    formData.append('category_id', templateData.category_id)
    formData.append('tags', JSON.stringify(templateData.tags || []))
    formData.append('is_public', templateData.is_public ? 'true' : 'false')

    // 添加缩略图和预览图文件
    if (templateData.thumbnail_file) {
        formData.append('thumbnail', templateData.thumbnail_file)
    }
    if (templateData.preview_file) {
        formData.append('preview', templateData.preview_file)
    }

    const response = await fetch(`${API_BASE}/from-psd-layer`, {
        method: 'POST',
        body: formData,
    })
    if (!response.ok) {
        throw new Error(`Failed to create template from PSD layer: ${response.statusText}`)
    }
    return await response.json()
}

// 应用模板到画布
export async function applyTemplateToCanvas(
    templateId: string,
    canvasId: string,
    position?: { x: number; y: number }
): Promise<TemplateItem> {
    const formData = new FormData()
    formData.append('template_id', templateId)
    formData.append('canvas_id', canvasId)
    if (position) {
        formData.append('position', JSON.stringify(position))
    }

    const response = await fetch(`${API_BASE}/apply-to-canvas`, {
        method: 'POST',
        body: formData,
    })
    if (!response.ok) {
        throw new Error(`Failed to apply template to canvas: ${response.statusText}`)
    }

    const result = await response.json()
    return result.template
}

// 搜索模板
export async function searchTemplates(query: string, filters?: TemplateSearchFilters): Promise<TemplateItem[]> {
    const params = new URLSearchParams()
    params.append('q', query)

    if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
            if (value !== undefined && value !== null) {
                if (Array.isArray(value)) {
                    value.forEach(v => params.append(key, v))
                } else if (typeof value === 'object') {
                    params.append(`${key}_start`, value.start)
                    params.append(`${key}_end`, value.end)
                } else {
                    params.append(key, String(value))
                }
            }
        })
    }

    const response = await fetch(`${API_BASE}/search?${params.toString()}`)
    if (!response.ok) {
        throw new Error(`Failed to search templates: ${response.statusText}`)
    }
    return await response.json()
}

// 获取模板统计信息
export async function getTemplateStats(): Promise<{
    total_templates: number
    total_categories: number
    total_collections: number
    most_used_templates: TemplateItem[]
    recent_templates: TemplateItem[]
}> {
    const response = await fetch(`${API_BASE}/stats`)
    if (!response.ok) {
        throw new Error(`Failed to fetch template stats: ${response.statusText}`)
    }
    return await response.json()
}
