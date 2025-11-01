// 字体相关API接口
export interface FontCategory {
    id: string
    name: string
    description?: string
    icon?: string
    color?: string
    created_at: string
    updated_at: string
}

export interface FontItem {
    id: string
    name: string
    font_family: string
    font_file_name: string
    font_file_url: string
    font_format: string
    file_size: number
    description?: string
    category_id?: string
    tags: string[]
    usage_count: number
    is_favorite: boolean
    is_public: boolean
    font_metadata: {
        font_family: string
        font_weight: string
        font_style: string
        font_stretch: string
        unicode_ranges: string[]
        glyph_count: number
        version: string
        copyright: string
        vendor: string
    }
    created_at: string
    updated_at: string
    created_by?: string
}

export interface FontCategoryCreate {
    name: string
    description?: string
    icon?: string
    color?: string
}

export interface FontItemCreate {
    name: string
    description?: string
    category_id?: string
    tags?: string[]
    is_public?: boolean
}

// API函数
const API_BASE = '/api/fonts'

export async function getFontCategories(): Promise<FontCategory[]> {
    const response = await fetch(`${API_BASE}/categories`)
    if (!response.ok) {
        throw new Error('Failed to fetch font categories')
    }
    return response.json()
}

export async function createFontCategory(category: FontCategoryCreate): Promise<FontCategory> {
    const response = await fetch(`${API_BASE}/categories`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(category),
    })
    if (!response.ok) {
        throw new Error('Failed to create font category')
    }
    return response.json()
}

export async function updateFontCategory(categoryId: string, category: Partial<FontCategoryCreate>): Promise<FontCategory> {
    const response = await fetch(`${API_BASE}/categories/${categoryId}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(category),
    })
    if (!response.ok) {
        throw new Error('Failed to update font category')
    }
    return response.json()
}

export async function deleteFontCategory(categoryId: string): Promise<void> {
    const response = await fetch(`${API_BASE}/categories/${categoryId}`, {
        method: 'DELETE',
    })
    if (!response.ok) {
        throw new Error('Failed to delete font category')
    }
}

export async function getFonts(filters?: {
    category_id?: string
    tags?: string[]
    is_favorite?: boolean
    is_public?: boolean
    created_by?: string
}): Promise<FontItem[]> {
    const params = new URLSearchParams()
    if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
            if (value !== undefined) {
                if (Array.isArray(value)) {
                    value.forEach(v => params.append(key, v))
                } else {
                    params.append(key, String(value))
                }
            }
        })
    }

    const response = await fetch(`${API_BASE}/items?${params}`)
    if (!response.ok) {
        throw new Error('Failed to fetch fonts')
    }
    return response.json()
}

export async function getFont(fontId: string): Promise<FontItem> {
    const response = await fetch(`${API_BASE}/items/${fontId}`)
    if (!response.ok) {
        throw new Error('Failed to fetch font')
    }
    return response.json()
}

export async function uploadFont(
    fontFile: File,
    fontData: FontItemCreate
): Promise<FontItem> {
    const formData = new FormData()
    formData.append('font_file', fontFile)
    formData.append('name', fontData.name)
    formData.append('description', fontData.description || '')
    formData.append('category_id', fontData.category_id || '')
    formData.append('tags', JSON.stringify(fontData.tags || []))
    formData.append('is_public', String(fontData.is_public || false))

    const response = await fetch(`${API_BASE}/items`, {
        method: 'POST',
        body: formData,
    })
    if (!response.ok) {
        throw new Error('Failed to upload font')
    }
    return response.json()
}

export async function updateFont(
    fontId: string,
    fontData: Partial<FontItemCreate>
): Promise<FontItem> {
    const formData = new FormData()
    if (fontData.name !== undefined) formData.append('name', fontData.name)
    if (fontData.description !== undefined) formData.append('description', fontData.description)
    if (fontData.category_id !== undefined) formData.append('category_id', fontData.category_id || '')
    if (fontData.tags !== undefined) formData.append('tags', JSON.stringify(fontData.tags))
    if (fontData.is_public !== undefined) formData.append('is_public', String(fontData.is_public))

    const response = await fetch(`${API_BASE}/items/${fontId}`, {
        method: 'PUT',
        body: formData,
    })
    if (!response.ok) {
        throw new Error('Failed to update font')
    }
    return response.json()
}

export async function deleteFont(fontId: string): Promise<void> {
    const response = await fetch(`${API_BASE}/items/${fontId}`, {
        method: 'DELETE',
    })
    if (!response.ok) {
        throw new Error('Failed to delete font')
    }
}

export async function toggleFontFavorite(fontId: string): Promise<{ id: string; is_favorite: boolean }> {
    const response = await fetch(`${API_BASE}/items/${fontId}/favorite`, {
        method: 'POST',
    })
    if (!response.ok) {
        throw new Error('Failed to toggle font favorite')
    }
    return response.json()
}

export async function incrementFontUsage(fontId: string): Promise<void> {
    const response = await fetch(`${API_BASE}/items/${fontId}/usage`, {
        method: 'POST',
    })
    if (!response.ok) {
        throw new Error('Failed to increment font usage')
    }
}

export async function searchFonts(query: string, filters?: {
    category_id?: string
    tags?: string[]
    is_favorite?: boolean
    is_public?: boolean
}): Promise<FontItem[]> {
    const params = new URLSearchParams()
    params.append('q', query)
    if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
            if (value !== undefined) {
                if (Array.isArray(value)) {
                    value.forEach(v => params.append(key, v))
                } else {
                    params.append(key, String(value))
                }
            }
        })
    }

    const response = await fetch(`${API_BASE}/search?${params}`)
    if (!response.ok) {
        throw new Error('Failed to search fonts')
    }
    return response.json()
}

export async function getFontStats(): Promise<{
    total_fonts: number
    total_categories: number
    most_used_fonts: Array<{
        id: string
        name: string
        font_family: string
        usage_count: number
    }>
    recent_fonts: Array<{
        id: string
        name: string
        font_family: string
        created_at: string
    }>
}> {
    const response = await fetch(`${API_BASE}/stats`)
    if (!response.ok) {
        throw new Error('Failed to fetch font stats')
    }
    return response.json()
}

export async function importExistingFonts(): Promise<{
    message: string
    imported_count: number
    errors: string[]
}> {
    const response = await fetch(`${API_BASE}/import-existing`, {
        method: 'POST',
    })
    if (!response.ok) {
        throw new Error('Failed to import existing fonts')
    }
    return response.json()
}

// 字体预览功能
export function getFontPreviewUrl(fontItem: FontItem): string {
    return fontItem.font_file_url
}

export function formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

