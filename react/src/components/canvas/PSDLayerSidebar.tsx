import React, { useState, useCallback, useMemo, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Slider } from '@/components/ui/slider'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import {
    Layers,
    Eye,
    EyeOff,
    Type,
    Image as ImageIcon,
    FolderOpen,
    Edit3,
    Move,
    X,
    Palette,
    AlignLeft,
    AlignCenter,
    AlignRight,
    Bold,
    Italic,
    Underline,
    Bookmark,
    Star,
} from 'lucide-react'
import { saveCanvas } from '@/api/canvas'
import {
    updateLayerProperties,
    type PSDLayer,
    uploadPSD,
    type PSDUploadResponse,
    listPSDTemplates,
    getPSDTemplateById,
    parsePSDTemplate,
    type PSDTemplateInfo
} from '@/api/upload'
import { useCanvas } from '@/contexts/canvas'
import { TemplateManager } from '@/components/template/TemplateManager'
import { createTemplateFromPSDLayer } from '@/api/template'

interface PSDLayerSidebarProps {
    psdData: {
        file_id: string
        layers: PSDLayer[]
        width: number
        height: number
    } | null
    isVisible: boolean
    onClose: () => void
    onUpdate: (updatedPsdData: any) => void
}

export function PSDLayerSidebar({ psdData, isVisible, onClose, onUpdate }: PSDLayerSidebarProps) {
    const { t } = useTranslation()
    const { excalidrawAPI } = useCanvas()

    // 状态管理
    const [selectedLayer, setSelectedLayer] = useState<PSDLayer | null>(null)
    const [expandedGroups, setExpandedGroups] = useState<Set<number>>(new Set())
    const [searchTerm, setSearchTerm] = useState('')
    const [filterType, setFilterType] = useState<'all' | 'text' | 'layer' | 'group'>('all')
    const [canvasElements, setCanvasElements] = useState<any[]>([])
    const [lastUpdateTime, setLastUpdateTime] = useState<number>(0)
    const [showTemplateManager, setShowTemplateManager] = useState(false)
    // UI 演示：顶部两类与资产子类
    const [uiTopTab, setUiTopTab] = useState<'layers' | 'assets'>('layers')
    const [assetSubTab, setAssetSubTab] = useState<'templates' | 'library' | 'fonts'>('library')
    const [assetSource, setAssetSource] = useState<'platform' | 'uploads'>('platform')

    // 图片数据状态管理
    const [platformImages, setPlatformImages] = useState<string[]>([])
    const [userUploadedImages, setUserUploadedImages] = useState<Array<{ id: string, name: string, url: string }>>([])
    const [draggedImageData, setDraggedImageData] = useState<{ url: string, name: string } | null>(null)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    // PSD模板相关状态
    const [psdTemplates, setPsdTemplates] = useState<PSDTemplateInfo[]>([])
    const [selectedPsdTemplate, setSelectedPsdTemplate] = useState<string | null>(null)
    const [psdTemplateData, setPsdTemplateData] = useState<PSDUploadResponse | null>(null)
    const [loadingPsd, setLoadingPsd] = useState(false)
    const [thumbnailLoadErrors, setThumbnailLoadErrors] = useState<Set<string>>(new Set())

    // 处理图片上传
    const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = event.target.files
        if (!files || files.length === 0) return

        try {
            // 模拟上传过程
            setLoading(true)

            // 使用FileReader读取图片并转换为Data URL
            const readFileAsDataURL = (file: File): Promise<string> => {
                return new Promise((resolve, reject) => {
                    const reader = new FileReader()
                    reader.onload = () => {
                        if (typeof reader.result === 'string') {
                            resolve(reader.result)
                        } else {
                            reject(new Error('无法读取文件内容'))
                        }
                    }
                    reader.onerror = () => reject(new Error('读取文件失败'))
                    reader.readAsDataURL(file)
                })
            }

            const newImages: any[] = []

            for (let i = 0; i < files.length; i++) {
                const file = files[i]
                try {
                    // 验证是否为有效的图片文件
                    if (!file.type.startsWith('image/')) {
                        console.warn('跳过非图片文件:', file.name)
                        continue
                    }

                    // 使用FileReader读取文件为Data URL
                    const dataUrl = await readFileAsDataURL(file)
                    console.log('成功创建Data URL:', '文件名:', file.name, '类型:', file.type, '大小:', file.size)

                    const imageObj = {
                        id: Date.now() + '-' + i + '-' + Math.random().toString(36).substr(2, 9),
                        name: file.name,
                        url: dataUrl,
                        type: file.type,
                        size: file.size
                    }

                    newImages.push(imageObj)
                } catch (fileError) {
                    console.error('读取文件失败:', fileError, '文件:', file.name)
                }
            }

            // 使用函数式更新确保状态正确合并
            setUserUploadedImages(prev => {
                const updated = [...prev, ...newImages]
                console.log('更新后的上传图片列表:', updated.length, '张图片')
                return updated
            })

            if (newImages.length > 0) {
                toast.success(`成功上传 ${newImages.length} 张图片`)
            } else {
                setError('无法上传图片，请确保选择的是有效的图片文件')
            }

            // 清空文件输入
            event.target.value = ''
        } catch (err) {
            console.error('上传处理失败:', err)
            setError('处理图片时出错')
        } finally {
            setLoading(false)
        }
    }

    // 由于使用Data URL而非Object URL，不再需要清理临时URL
    // 保留此effect以便将来如果切换回Object URL时使用
    useEffect(() => {
        return () => {
            console.log('组件卸载，当前使用Data URL不需要清理')
        }
    }, [userUploadedImages])

    // 处理图片点击事件 - 添加图片到画布中心
    const handleImageClick = async (imageInfo: { name: string, url?: string }) => {
        try {
            console.log('🖱️ 点击图片:', imageInfo.name)

            if (!excalidrawAPI) {
                toast.error('画布未初始化')
                return
            }

            // 准备图片数据
            let dataURL = imageInfo.url || `/assets/${imageInfo.name}`
            let mimeType = 'image/png'

            // 如果是相对路径，需要fetch获取blob
            if (!dataURL.startsWith('data:')) {
                const response = await fetch(dataURL)
                const blob = await response.blob()
                mimeType = blob.type

                // 转换为DataURL
                dataURL = await new Promise<string>((resolve, reject) => {
                    const reader = new FileReader()
                    reader.onload = () => resolve(reader.result as string)
                    reader.onerror = reject
                    reader.readAsDataURL(blob)
                })
            }

            // 创建图片元素ID
            const fileId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

            // 添加文件到Excalidraw
            excalidrawAPI.addFiles([{
                id: fileId as any,
                dataURL: dataURL as any,
                mimeType: mimeType as any,
                created: Date.now()
            }])

            // 获取画布状态和当前元素
            const appState = excalidrawAPI.getAppState()
            const currentElements = excalidrawAPI.getSceneElements()

            // 在画布中心创建图片元素
            const newImageElement = {
                id: `image-${fileId}`,
                type: 'image' as const,
                x: -appState.scrollX + (appState.width / 2 / appState.zoom.value) - 100,
                y: -appState.scrollY + (appState.height / 2 / appState.zoom.value) - 100,
                width: 200,
                height: 200,
                angle: 0,
                strokeColor: 'transparent',
                backgroundColor: 'transparent',
                fillStyle: 'solid' as const,
                strokeWidth: 1,
                strokeStyle: 'solid' as const,
                roughness: 0,
                opacity: 100,
                fileId: fileId,
                scale: [1, 1] as [number, number],
                status: 'saved' as const,
                locked: false,
                version: 1,
                versionNonce: Math.floor(Math.random() * 1000000000),
                isDeleted: false,
                groupIds: [],
                boundElements: null,
                updated: Date.now(),
                link: null,
                customData: {
                    libraryImage: true,
                    imageName: imageInfo.name
                }
            }

            // 添加到画布
            excalidrawAPI.updateScene({
                elements: [...currentElements, newImageElement as any]
            })

            toast.success(`图片 "${imageInfo.name}" 已添加到画布`)
        } catch (err) {
            console.error('添加图片到画布失败:', err)
            toast.error('添加图片失败，请重试')
        }
    }

    // 处理图片删除事件
    const handleImageDelete = (imageId: string, imageName: string) => {
        try {
            // 显示确认对话框
            if (!window.confirm(`确定要删除图片 "${imageName}" 吗？`)) {
                return
            }

            console.log('删除图片:', imageId, imageName)

            // 更新状态，过滤掉要删除的图片
            setUserUploadedImages(prev => {
                const updated = prev.filter(image => image.id !== imageId)
                console.log('删除后的图片列表:', updated.length, '张图片')
                return updated
            })

            // 显示删除成功提示
            toast.success(`图片 "${imageName}" 已成功删除`)
        } catch (err) {
            console.error('删除图片失败:', err)
            toast.error('删除图片失败，请重试')
        }
    }

    // 监听画布变化，实时同步图层状态
    useEffect(() => {
        if (!excalidrawAPI || !isVisible) return

        const updateCanvasElements = () => {
            const elements = excalidrawAPI.getSceneElements()
            const psdElements = elements.filter(element => element.customData?.psdFileId)

            setCanvasElements(psdElements)
            setLastUpdateTime(Date.now())

            // console.log('图层列表同步更新:', {
            //     totalElements: elements.length,
            //     psdElements: psdElements.length,
            //     timestamp: new Date().toLocaleTimeString()
            // })
        }

        // 初始更新
        updateCanvasElements()

        // 监听画布变化事件
        const unsubscribe = (excalidrawAPI as any).on?.('change', updateCanvasElements) || null

        // 定期检查更新（作为备用机制）
        const interval = setInterval(updateCanvasElements, 1000)

        return () => {
            unsubscribe?.()
            clearInterval(interval)
        }
    }, [excalidrawAPI, isVisible])

    // 获取平台图片数据
    useEffect(() => {
        const fetchPlatformImages = async () => {
            if (assetSubTab !== 'library' || assetSource !== 'platform') return

            setLoading(true)
            setError(null)

            try {
                // 模拟API调用
                // 实际项目中应该替换为真实的API调用
                // const response = await fetch('/api/platform/images')
                // const data = await response.json()
                // setPlatformImages(data.images)

                // 模拟数据加载延迟
                await new Promise(resolve => setTimeout(resolve, 500))

                // 使用public/assets中的图片作为模拟数据
                const mockPlatformImages = [
                    // 素材模板中的图片
                    '01-momo-M09-鋪底_專業抗敏護齦牙膏100g-8入+買舒酸定指定品-送_1200x1200.jpg',
                    '02-momo-舒酸定-M09-0905,0908-滿888現折100_1200x1200.jpg',
                    '04-9288701-好便宜0912-_1200x628.jpg',
                    '60000000201964 舒酸定專業抗敏護齦牙膏 100g_tube.png',
                    '60000000201964 舒酸定專業抗敏護齦牙膏 100g_正面立體圖.png',
                    '60000000201964 舒酸定專業抗敏護齦牙膏 100g_直式立體圖.png',
                    '60000000211457 舒酸定專業抗敏護齦強化琺瑯質牙膏_tube.png',
                    'SSD SENSITIVITY_GUM_&_ENAMEL_100_g_正面立體圖.png',
                    'SSD SENSITIVITY_GUM_&_ENAMEL_100_g_直式立體圖.png',
                    '主圖測試.jpg'
                ]

                setPlatformImages(mockPlatformImages)
            } catch (err) {
                setError('获取平台图片失败')
                console.error('获取平台图片失败:', err)
            } finally {
                setLoading(false)
            }
        }

        fetchPlatformImages()
    }, [assetSubTab, assetSource])

    // 获取PSD模板列表
    useEffect(() => {
        const fetchPsdTemplates = async () => {
            if (assetSubTab !== 'templates') return

            setLoading(true)
            setError(null)

            try {
                // 从API获取template文件夹下的PSD模板列表（包含解析状态）
                const templates = await listPSDTemplates()
                
                // 前端去重：基于文件名去重，保留最新的模板（作为双重保障）
                const templatesMap = new Map<string, PSDTemplateInfo>()
                templates.forEach(template => {
                    const existing = templatesMap.get(template.name)
                    if (!existing) {
                        templatesMap.set(template.name, template)
                    } else {
                        // 如果已存在，比较created_at，保留更新的
                        const existingDate = existing.created_at ? new Date(existing.created_at).getTime() : 0
                        const currentDate = template.created_at ? new Date(template.created_at).getTime() : 0
                        if (currentDate > existingDate) {
                            templatesMap.set(template.name, template)
                        }
                    }
                })
                
                // 转换为数组并排序
                const uniqueTemplates = Array.from(templatesMap.values())
                setPsdTemplates(uniqueTemplates)
                
                // 如果有未解析的模板，可以选择自动解析（或显示提示）
                const unparsedTemplates = uniqueTemplates.filter(t => !t.is_parsed)
                if (unparsedTemplates.length > 0) {
                    console.log(`发现 ${unparsedTemplates.length} 个未解析的PSD模板`)
                    // 可以选择自动后台解析，或者显示提示让用户手动触发
                }
            } catch (err) {
                setError('获取PSD模板失败')
                console.error('获取PSD模板失败:', err)
            } finally {
                setLoading(false)
            }
        }

        fetchPsdTemplates()
    }, [assetSubTab])

    // 处理PSD模板点击 - 直接上传到画布
    const handlePsdTemplateClick = async (template: PSDTemplateInfo) => {
        try {
            console.log('🎯 点击PSD模板:', template.name)
            setLoadingPsd(true)
            setSelectedPsdTemplate(template.name)

            let result: PSDUploadResponse

            // 如果模板已解析，直接从数据库加载（快速）
            if (template.is_parsed && template.template_id) {
                toast.loading(`正在加载模板 "${template.display_name}"...`, { id: 'loading-template' })
                
                try {
                    // 从数据库快速获取已解析的数据
                    result = await getPSDTemplateById(template.template_id)
                    console.log('✅ 从数据库快速加载PSD模板:', result)
                } catch (error) {
                    console.warn('从数据库加载失败，回退到解析模式:', error)
                    // 如果从数据库加载失败，回退到解析模式
                    toast.loading(`正在使用传统方式加载...`, { id: 'loading-template' })
                    
                    // 从template文件夹获取PSD文件
                    const response = await fetch(`/api/psd/templates/${encodeURIComponent(template.name)}`)
                    if (!response.ok) {
                        throw new Error('获取PSD文件失败')
                    }
                    
                    const blob = await response.blob()
                    const file = new File([blob], template.name, { type: 'application/octet-stream' })
                    
                    // 上传并解析PSD
                    result = await uploadPSD(file)
                }
            } else {
                // 如果模板未解析，先解析再加载
                toast.loading(`正在解析PSD文件 "${template.name}"...`, { id: 'loading-template' })
                
                try {
                    // 先解析PSD文件并存储到数据库
                    const parseResult = await parsePSDTemplate(template.name)
                    
                    if (parseResult.already_parsed) {
                        // 如果已经解析过，直接从数据库加载
                        result = await getPSDTemplateById(parseResult.template_id)
                    } else {
                        // 如果刚刚解析完成，直接使用解析结果（需要再次获取）
                        toast.loading(`正在加载已解析的模板...`, { id: 'loading-template' })
                        result = await getPSDTemplateById(parseResult.template_id)
                    }
                    console.log('✅ PSD模板解析完成并已加载:', result)
                } catch (error) {
                    // 如果解析失败，回退到传统的上传解析方式
                    console.warn('解析失败，回退到传统方式:', error)
                    toast.loading(`正在使用传统方式加载...`, { id: 'loading-template' })
                    
                    // 从template文件夹获取PSD文件
                    const response = await fetch(`/api/psd/templates/${encodeURIComponent(template.name)}`)
                    if (!response.ok) {
                        throw new Error('获取PSD文件失败')
                    }
                    
                    const blob = await response.blob()
                    const file = new File([blob], template.name, { type: 'application/octet-stream' })
                    
                    // 上传并解析PSD
                    result = await uploadPSD(file)
                }
            }

            // 直接添加所有图层到画布（复用 PSDCanvasUploader 的逻辑）
            if (excalidrawAPI && result.layers) {
                console.log('开始添加PSD图层到画布，共', result.layers.length, '个图层')

                // 获取画布状态
                const appState = excalidrawAPI.getAppState()
                const currentElements = excalidrawAPI.getSceneElements()

                // 计算视口中心
                const viewportCenter = {
                    x: -appState.scrollX + (appState.width || 0) / 2 / appState.zoom.value,
                    y: -appState.scrollY + (appState.height || 0) / 2 / appState.zoom.value,
                }

                // 过滤有效图层
                const validLayers = result.layers.filter(layer => {
                    return layer.image_url &&
                        layer.visible !== false &&
                        layer.width > 0 &&
                        layer.height > 0
                })

                console.log('有效图层数量:', validLayers.length)

                if (validLayers.length === 0) {
                    toast.dismiss('loading-template')
                    toast.warning('该PSD文件没有可显示的图层')
                    setSelectedPsdTemplate(null)
                    setLoadingPsd(false)
                    return
                }

                // 计算PSD整体边界
                const minLeft = Math.min(...validLayers.map(l => l.left || 0))
                const minTop = Math.min(...validLayers.map(l => l.top || 0))
                const maxRight = Math.max(...validLayers.map(l => (l.left || 0) + (l.width || 0)))
                const maxBottom = Math.max(...validLayers.map(l => (l.top || 0) + (l.height || 0)))
                const psdWidth = maxRight - minLeft
                const psdHeight = maxBottom - minTop

                // 计算居中偏移
                const centerOffsetX = viewportCenter.x - (minLeft + psdWidth / 2)
                const centerOffsetY = viewportCenter.y - (minTop + psdHeight / 2)

                // 按图层顺序添加
                const sortedLayers = [...validLayers].sort((a, b) => a.index - b.index)
                const newElements: any[] = []
                const totalLayers = sortedLayers.length

                // 批量添加文件，减少API调用次数
                const fileEntries: any[] = []
                const timestamp = Date.now()
                
                // 确保file_id有效（如果从数据库加载可能为null）
                const baseFileId = result.file_id || result.template_id || `template-${timestamp}`
                
                for (let i = 0; i < sortedLayers.length; i++) {
                    const layer = sortedLayers[i]
                    
                    // 确保每个fileId都是唯一的字符串
                    const fileId = `psd-template-${baseFileId}-${layer.index}-${timestamp}-${i}-${Math.random().toString(36).substr(2, 9)}`
                    
                    // 验证fileId不是null/undefined
                    if (!fileId || typeof fileId !== 'string') {
                        console.error('Invalid fileId generated:', fileId)
                        continue
                    }
                    
                    // 验证image_url存在且有效
                    if (!layer.image_url || typeof layer.image_url !== 'string') {
                        console.warn('Layer missing image_url, skipping:', layer.name)
                        continue
                    }
                    
                    fileEntries.push({
                        id: fileId,
                        dataURL: layer.image_url,
                        mimeType: 'image/png',
                        created: Date.now()
                    })

                    // 创建图层元素
                    const imageElement: any = {
                        id: `image-${fileId}`,
                        type: 'image',
                        x: (layer.left || 0) + centerOffsetX,
                        y: (layer.top || 0) + centerOffsetY,
                        width: layer.width,
                        height: layer.height,
                        angle: 0,
                        strokeColor: 'transparent',
                        backgroundColor: 'transparent',
                        fillStyle: 'solid',
                        strokeWidth: 1,
                        strokeStyle: 'solid',
                        roughness: 0,
                        opacity: layer.opacity ? Math.round(layer.opacity / 255 * 100) : 100,
                        fileId: fileId,
                        scale: [1, 1],
                        status: 'saved',
                        locked: false,
                        version: 1,
                        versionNonce: Math.floor(Math.random() * 1000000000),
                        isDeleted: false,
                        groupIds: [],
                        boundElements: null,
                        updated: Date.now(),
                        link: null,
                        customData: {
                            psdLayerIndex: layer.index,
                            psdLayerName: layer.name,
                            psdFileId: baseFileId,
                            templateId: result.template_id || null
                        }
                    }

                    newElements.push(imageElement)
                }

                // 批量添加所有文件到Excalidraw
                toast.loading(`正在添加 ${totalLayers} 个图层到画布...`, { id: 'loading-template' })
                
                // 验证文件条目有效后再添加
                const validFileEntries = fileEntries.filter(entry => {
                    if (!entry || typeof entry !== 'object') {
                        console.error('Invalid file entry:', entry)
                        return false
                    }
                    if (!entry.id || typeof entry.id !== 'string') {
                        console.error('Invalid file entry id:', entry)
                        return false
                    }
                    if (!entry.dataURL || typeof entry.dataURL !== 'string') {
                        console.error('Invalid file entry dataURL:', entry)
                        return false
                    }
                    return true
                })
                
                if (validFileEntries.length > 0) {
                    // 确保只传递有效的文件对象，避免WeakMap错误
                    try {
                        excalidrawAPI.addFiles(validFileEntries.map(entry => ({
                            id: entry.id,
                            dataURL: entry.dataURL,
                            mimeType: entry.mimeType || 'image/png',
                            created: entry.created || Date.now()
                        })))
                    } catch (error) {
                        console.error('Error adding files to Excalidraw:', error)
                        // 如果批量添加失败，尝试逐个添加
                        console.log('Falling back to adding files one by one')
                        for (const entry of validFileEntries) {
                            try {
                                excalidrawAPI.addFiles([{
                                    id: entry.id,
                                    dataURL: entry.dataURL,
                                    mimeType: entry.mimeType || 'image/png',
                                    created: entry.created || Date.now()
                                }])
                            } catch (singleError) {
                                console.error('Error adding single file:', entry.id, singleError)
                            }
                        }
                    }
                } else {
                    console.error('No valid file entries to add')
                    throw new Error('没有有效的图层数据')
                }

                // 更新画布 - 一次性添加所有元素
                excalidrawAPI.updateScene({
                    elements: [...currentElements, ...newElements]
                })

                // 等待画布更新完成
                await new Promise(resolve => setTimeout(resolve, 200))

                // 自动聚焦到新添加的内容
                if (newElements.length > 0) {
                    try {
                        // 等待画布完全更新，获取实际添加的元素
                        const currentElementsAfterUpdate = excalidrawAPI.getSceneElements()
                        const addedElements = currentElementsAfterUpdate.filter(el => 
                            newElements.some(newEl => {
                                // 确保ID匹配且都是有效字符串
                                return el.id && newEl.id && 
                                       typeof el.id === 'string' && 
                                       typeof newEl.id === 'string' &&
                                       el.id === newEl.id
                            })
                        )
                        
                        // 验证元素ID有效并过滤掉无效值
                        const validElements = addedElements.filter(el => {
                            const isValid = el && 
                                          el.id != null && 
                                          typeof el.id === 'string' &&
                                          el.id.length > 0 &&
                                          el.type === 'image' // 确保是图片元素
                            if (!isValid) {
                                console.warn('Invalid element found:', el)
                            }
                            return isValid
                        })
                        
                        if (validElements.length > 0) {
                            // scrollToContent 接受单个元素ID（字符串）或undefined
                            // 使用第一个有效元素的ID，或者使用undefined聚焦到所有内容
                            const firstValidId = validElements[0].id
                            
                            if (firstValidId && typeof firstValidId === 'string') {
                                excalidrawAPI.scrollToContent(firstValidId, {
                                    fitToContent: true,
                                    animate: true
                                })
                            } else {
                                // 如果ID无效，使用undefined聚焦到所有内容
                                excalidrawAPI.scrollToContent(undefined, {
                                    fitToContent: true,
                                    animate: true
                                })
                            }
                        } else {
                            // 如果没有有效元素，使用undefined来聚焦到所有内容
                            excalidrawAPI.scrollToContent(undefined, {
                                fitToContent: true,
                                animate: true
                            })
                        }
                    } catch (scrollError) {
                        // 如果scrollToContent失败，只记录错误但不影响主流程
                        console.warn('Error in scrollToContent, but elements were added successfully:', scrollError)
                        // 使用undefined作为fallback，这是最安全的方式
                        try {
                            excalidrawAPI.scrollToContent(undefined, {
                                fitToContent: true,
                                animate: true
                            })
                        } catch (fallbackError) {
                            // 如果连undefined都失败，就忽略这个错误，不影响主流程
                            console.warn('Fallback scrollToContent also failed, ignoring:', fallbackError)
                        }
                    }
                }

                // 关闭加载提示并显示成功消息
                toast.dismiss('loading-template')
                toast.success(`✅ 模板 "${template.display_name}" 已成功添加到画布（${newElements.length}个图层）`, {
                    duration: 3000,
                })
            }

            // 重置状态
            setSelectedPsdTemplate(null)
        } catch (err) {
            console.error('加载PSD模板失败:', err)
            toast.dismiss('loading-template')
            const errorMessage = err instanceof Error ? err.message : '加载PSD模板失败'
            toast.error(`❌ ${errorMessage}`, {
                duration: 5000,
            })
            setSelectedPsdTemplate(null)
        } finally {
            setLoadingPsd(false)
        }
    }

    // // 获取画布中图层的实时状态
    // const getLayerCanvasState = useCallback((layerIndex: number) => {
    //     const canvasElement = canvasElements.find(element =>
    //         element.customData?.psdLayerIndex === layerIndex
    //     )

    //     if (!canvasElement) {
    //         return {
    //             exists: false,
    //             visible: false,
    //             opacity: 100,
    //             element: null
    //         }
    //     }

    //     // 检查可见性：主要基于opacity，同时检查customData中的visible状态
    //     const opacityVisible = canvasElement.opacity > 0
    //     const customDataVisible = canvasElement.customData?.visible !== false
    //     const isVisible = opacityVisible && customDataVisible

    //     return {
    //         exists: true,
    //         visible: isVisible,
    //         opacity: canvasElement.opacity || 100,
    //         element: canvasElement
    //     }
    // }, [canvasElements])

    // // 保存图层为模板
    // const handleSaveLayerAsTemplate = useCallback(async (layer: PSDLayer) => {
    //     try {
    //         const templateData = {
    //             name: `${layer.name} - 模板`,
    //             description: `从PSD图层 "${layer.name}" 创建的模板`,
    //             category_id: 'default', // 默认分类，实际应用中应该让用户选择
    //             tags: ['psd', 'layer', layer.type],
    //             is_public: false,
    //         }

    //         await createTemplateFromPSDLayer(psdData!.file_id, layer.index, templateData)
    //         toast.success(`图层 "${layer.name}" 已保存为模板`)
    //     } catch (error) {
    //         console.error('保存模板失败:', error)
    //         toast.error('保存模板失败')
    //     }
    // }, [psdData])

    // // 获取图层图标
    // const getLayerIcon = (layer: PSDLayer) => {
    //     switch (layer.type) {
    //         case 'text':
    //             return <Type className="h-4 w-4 text-blue-500" />
    //         case 'group':
    //             return <FolderOpen className="h-4 w-4 text-yellow-500" />
    //         default:
    //             return <ImageIcon className="h-4 w-4 text-green-500" />
    //     }
    // }


    // console.log('PSDLayerSidebar 渲染狀態:', { isVisible, psdData: !!psdData, layersCount: psdData?.layers?.length })

    // 如果没有 PSD 数据，显示空状态（但仍然渲染面板结构）
    const hasData = psdData && psdData.layers && psdData.layers.length > 0

    // 仅参照布局UI：顶部两类（Layers/Assets）+ 对应内容
    return (
        <div
            className="bg-white text-foreground border border-border rounded-lg shadow-sm h-full w-full flex flex-col overflow-hidden"
            style={{ height: "80vh" }}
        >
            {/* 顶部两个类型（统一指示条与选中态） */}
            <div className="relative grid grid-cols-2 border-b border-border">
                {(['layers', 'assets'] as const).map(top => (
                    <div key={top} className="flex items-center justify-center py-2">
                        <button
                            className={`flex items-center gap-2 px-4 py-2 rounded-md transition-all duration-200 ${uiTopTab === top ? 'font-semibold shadow-sm' : 'opacity-70 hover:opacity-100'}`}
                            onClick={() => setUiTopTab(top)}
                        >
                            {top === 'layers' ? <Layers className="h-4 w-4" /> : <span className="inline-block w-4 h-4">▦</span>}
                            <span className="text-base">{top === 'layers' ? 'Layers' : 'Assets'}</span>
                        </button>
                    </div>
                ))}
                {/* 顶部滑动下划线 */}
                <div
                    className="absolute bottom-0 left-0 h-0.5 w-1/2 bg-foreground transition-transform duration-300 ease-out"
                    style={{ transform: uiTopTab === 'layers' ? 'translateX(0%)' : 'translateX(100%)' }}
                />
            </div>

            {/* 主体内容 */}
            {uiTopTab === 'layers' ? (
                <div className="flex-1 flex flex-col overflow-hidden">
                    <div className="p-3 border-b border-border">
                        <Input
                            placeholder="搜索图层..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="h-8 text-xs"
                        />
                    </div>
                    <div className="flex-1 overflow-auto p-3 space-y-2">
                        {[{ name: 'Header Group', type: 'group' }, { name: 'Main Content', type: 'group' }, { name: 'Background Shape', type: 'layer' }, { name: 'Footer Text', type: 'text' }]
                            .filter(i => i.name.toLowerCase().includes(searchTerm.toLowerCase()))
                            .map((item, idx) => (
                                <div key={idx} className="flex items-center justify-between px-3 py-2 rounded-lg border hover:bg-gray-50 transition-colors">
                                    <div className="flex items-center gap-3 min-w-0">
                                        <span className="w-3 text-center">›</span>
                                        {item.type === 'group' ? <FolderOpen className="h-4 w-4" /> : item.type === 'text' ? <Type className="h-4 w-4" /> : <ImageIcon className="h-4 w-4" />}
                                        <span className="truncate">{item.name}</span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className="opacity-60">🔒</span>
                                        <Eye className="h-4 w-4" />
                                    </div>
                                </div>
                            ))}
                    </div>
                </div>
            ) : (
                <div className="flex-1 flex flex-col overflow-hidden">
                    {/* 资产子级 Tabs */}
                    <div className="px-3 pt-3">
                        <div className="flex items-center text-sm">
                            {(['templates', 'library', 'fonts'] as const).map(tab => (
                                <div key={tab} className="flex-1 text-center">
                                    <button
                                        className={`py-2 w-full transition-all duration-200 ${assetSubTab === tab ? 'font-semibold' : 'opacity-70 hover:opacity-100'}`}
                                        onClick={() => setAssetSubTab(tab)}
                                    >
                                        {tab === 'templates' ? 'Templates' : tab === 'library' ? 'Library' : 'Fonts'}
                                    </button>
                                    <div className={`${assetSubTab === tab ? 'bg-foreground' : 'bg-transparent'} h-0.5 w-10 mx-auto rounded transition-colors duration-200`}></div>
                                </div>
                            ))}
                        </div>
                        <div className="h-0.5 w-full bg-muted-foreground/20 mt-1" />
                    </div>
                    {/* 来源切换：仅在 Library 下显示 */}
                    {assetSubTab === 'library' && (
                        <div className="px-3 py-3 grid grid-cols-2 gap-2">
                            <div className="text-center">
                                <button className={`py-2 w-full rounded-md border text-sm transition-all duration-200 ${assetSource === 'platform' ? 'font-medium shadow-sm' : 'opacity-80 hover:opacity-100'}`} onClick={() => setAssetSource('platform')}>Platform</button>
                                <div className={`${assetSource === 'platform' ? 'bg-foreground' : 'bg-transparent'} h-0.5 w-10 mx-auto rounded mt-1 transition-colors`}></div>
                            </div>
                            <div className="text-center">
                                <button className={`py-2 w-full rounded-md border text-sm transition-all duration-200 ${assetSource === 'uploads' ? 'font-medium shadow-sm' : 'opacity-80 hover:opacity-100'}`} onClick={() => setAssetSource('uploads')}>My Uploads</button>
                                <div className={`${assetSource === 'uploads' ? 'bg-foreground' : 'bg-transparent'} h-0.5 w-10 mx-auto rounded mt-1 transition-colors`}></div>
                            </div>
                        </div>
                    )}
                    {/* 内容区：根据 Templates / Library / Fonts 显示不同结构 */}
                    {assetSubTab === 'templates' && (
                        <div className="grid grid-cols-2 gap-3 p-3 overflow-auto">
                            {/* 加载状态 */}
                            {loading && (
                                Array.from({ length: 4 }).map((_, i) => (
                                    <div key={i} className="aspect-[4/3] rounded-xl border bg-gray-50/60 animate-pulse flex flex-col items-center justify-center">
                                        <div className="w-10 h-10 rounded-lg bg-gray-200 mb-2"></div>
                                        <div className="w-20 h-3 bg-gray-200 rounded"></div>
                                    </div>
                                ))
                            )}

                            {/* 错误状态 */}
                            {error && (
                                <div className="col-span-2 text-center py-8 text-red-500">
                                    {error}
                                    <button
                                        className="mt-2 text-sm text-primary hover:underline block mx-auto"
                                        onClick={() => {
                                            setError(null)
                                            setPsdTemplates([])
                                        }}
                                    >
                                        重试
                                    </button>
                                </div>
                            )}

                            {/* 模板列表 - 网格布局显示预览图 */}
                            {!loading && !error && psdTemplates.length > 0 && (
                                psdTemplates.map((template, idx) => {
                                    const isCurrentLoading = loadingPsd && selectedPsdTemplate === template.name
                                    return (
                                        <button
                                            key={idx}
                                            className={`relative aspect-[4/3] rounded-xl border transition-all shadow-sm overflow-hidden group ${
                                                isCurrentLoading 
                                                    ? 'bg-purple-50 border-purple-200 hover:bg-purple-100 cursor-wait animate-pulse' 
                                                    : template.is_parsed
                                                        ? 'bg-white hover:bg-gray-50 hover:shadow-md cursor-pointer border-gray-200'
                                                        : 'bg-yellow-50 border-yellow-200 hover:bg-yellow-100 hover:shadow-md cursor-pointer'
                                            }`}
                                            onClick={() => handlePsdTemplateClick(template)}
                                            disabled={loadingPsd}
                                        >
                                            {/* 预览图 */}
                                            <div className="relative w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
                                                {isCurrentLoading ? (
                                                    <div className="flex flex-col items-center justify-center">
                                                        <div className="w-8 h-8 border-3 border-purple-600 border-t-transparent rounded-full animate-spin mb-2"></div>
                                                        <span className="text-xs text-purple-600">加载中...</span>
                                                    </div>
                                                ) : template.thumbnail_url && !thumbnailLoadErrors.has(template.name) ? (
                                                    <>
                                                        <img
                                                            src={template.thumbnail_url}
                                                            alt={template.display_name}
                                                            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                                                            onError={() => {
                                                                // 记录图片加载失败
                                                                setThumbnailLoadErrors(prev => new Set(prev).add(template.name))
                                                            }}
                                                        />
                                                        {/* 渐变遮罩 - 用于文字可读性 */}
                                                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                                                    </>
                                                ) : (
                                                    <div className="flex flex-col items-center justify-center text-gray-400">
                                                        <svg className={`w-12 h-12 mb-2 ${template.is_parsed ? 'text-purple-400' : 'text-yellow-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                                        </svg>
                                                        <span className="text-xs">暂无预览图</span>
                                                    </div>
                                                )}
                                                
                                                {/* 状态标签 - 显示在右上角 */}
                                                {!template.is_parsed && (
                                                    <div className="absolute top-2 right-2 bg-yellow-500 text-white text-xs font-medium px-2 py-1 rounded-full shadow-sm">
                                                        需解析
                                                    </div>
                                                )}
                                                
                                                {isCurrentLoading && (
                                                    <div className="absolute top-2 right-2 bg-purple-500 text-white text-xs font-medium px-2 py-1 rounded-full shadow-sm flex items-center gap-1">
                                                        <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                                        加载中
                                                    </div>
                                                )}
                                                
                                                {template.is_parsed && !isCurrentLoading && (
                                                    <div className="absolute top-2 right-2 bg-green-500 text-white text-xs font-medium px-2 py-1 rounded-full shadow-sm flex items-center gap-1">
                                                        <span>⚡</span>
                                                        已解析
                                                    </div>
                                                )}
                                            </div>
                                            
                                            {/* 模板信息 - 显示在底部 */}
                                            <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/80 to-transparent text-white">
                                                <div className="text-xs font-medium truncate mb-0.5">
                                                    {template.display_name}
                                                </div>
                                                <div className="text-[10px] opacity-90 flex items-center gap-2">
                                                    {template.is_parsed ? (
                                                        <>
                                                            <span>{template.layers_count} 图层</span>
                                                            <span>•</span>
                                                            <span>{template.width}×{template.height}</span>
                                                        </>
                                                    ) : (
                                                        <span>点击解析</span>
                                                    )}
                                                </div>
                                            </div>
                                        </button>
                                    )
                                })
                            )}

                            {!loading && !error && psdTemplates.length === 0 && (
                                <div className="col-span-2 text-center py-12 text-gray-500">
                                    <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                    </svg>
                                    <p className="text-sm">暂无PSD模板</p>
                                    <p className="text-xs text-gray-400 mt-1">模板文件应放在 template 文件夹中</p>
                                </div>
                            )}
                        </div>
                    )}
                    {assetSubTab === 'library' && (
                        <div className="grid grid-cols-3 gap-3 p-3 overflow-auto">
                            {/* 加载状态 */}
                            {loading && (
                                Array.from({ length: 6 }).map((_, i) => (
                                    <div key={i} className="aspect-square rounded-xl border bg-gray-50/60 animate-pulse flex items-center justify-center">
                                        <div className="w-10 h-10 rounded-full bg-gray-200"></div>
                                    </div>
                                ))
                            )}

                            {/* 错误状态 */}
                            {error && (
                                <div className="col-span-3 text-center py-8 text-red-500">
                                    {error}
                                    <button
                                        className="mt-2 text-sm text-primary hover:underline"
                                        onClick={() => {
                                            setError(null)
                                            setPlatformImages([])
                                        }}
                                    >
                                        重试
                                    </button>
                                </div>
                            )}

                            {/* 根据选择的来源显示不同的图片 */}
                            {!loading && !error && (
                                <>
                                    {/* 仅在My Uploads标签下显示上传按钮 */}
                                    {assetSource === 'uploads' && (
                                        <div className="col-span-3">
                                            <button
                                                onClick={() => document.getElementById('image-upload')?.click()}
                                                className="w-full py-2 px-4 border border-dashed rounded-lg text-primary hover:bg-primary/5 transition-colors flex items-center justify-center gap-2"
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                                </svg>
                                                上传图片
                                            </button>
                                            <input
                                                id="image-upload"
                                                type="file"
                                                accept="image/*"
                                                multiple
                                                className="hidden"
                                                onChange={handleImageUpload}
                                                aria-label="上传图片"
                                            />
                                        </div>
                                    )}

                                    {assetSource === 'platform' ? (
                                        platformImages.length > 0 ? (
                                            platformImages.map((imageName, i) => (
                                                <div key={i} className="aspect-square rounded-xl border bg-gray-50/60 hover:bg-gray-100/80 shadow-sm hover:shadow-md transition-all overflow-hidden cursor-pointer">
                                                    <img
                                                        src={`/assets/${imageName}`}
                                                        alt={`Platform image ${i + 1}`}
                                                        className="w-full h-full object-cover transition-opacity duration-200 hover:opacity-80"
                                                        // onClick={() => handleImageClick({ name: imageName })}
                                                        draggable
                                                        onDragStart={(e) => {
                                                            try {
                                                                console.log('🎯 开始拖拽平台图片:', imageName)
                                                                const dragData = {
                                                                    type: 'library-image',
                                                                    image: {
                                                                        id: `platform-${i}`,
                                                                        name: imageName,
                                                                        url: `/assets/${imageName}`
                                                                    }
                                                                };
                                                                e.dataTransfer.setData('application/json', JSON.stringify(dragData));
                                                                e.dataTransfer.effectAllowed = 'copy';

                                                                // 设置拖拽时的视觉效果
                                                                const dragImage = e.currentTarget.cloneNode(true) as HTMLImageElement;
                                                                dragImage.style.width = '80px';
                                                                dragImage.style.height = '80px';
                                                                dragImage.style.opacity = '0.7';
                                                                document.body.appendChild(dragImage);
                                                                e.dataTransfer.setDragImage(dragImage, 40, 40);
                                                                setTimeout(() => document.body.removeChild(dragImage), 0);

                                                                toast.info('拖拽到画布中的图片上进行替换，或拖到空白处添加新图片');
                                                            } catch (error) {
                                                                console.error('Failed to set drag data:', error);
                                                            }
                                                        }}
                                                        onDragEnd={() => {
                                                            console.log('🏁 拖拽结束');
                                                        }}
                                                    />
                                                </div>
                                            ))
                                        ) : (
                                            <div className="col-span-3 text-center py-8 text-gray-500">
                                                暂无平台图片
                                            </div>
                                        )
                                    ) : (
                                        userUploadedImages.length > 0 ? (
                                            userUploadedImages.map((image) => {
                                                // console.log('渲染上传图片:', image.id, image.name, image.url)
                                                return (
                                                    <div key={image.id} className="aspect-square rounded-xl border bg-gray-50/60 hover:bg-gray-100/80 shadow-sm hover:shadow-md transition-all overflow-hidden cursor-pointer relative group">
                                                        <div className="relative w-full h-full">
                                                            <img
                                                                src={image.url}
                                                                alt={`My uploaded image: ${image.name}`}
                                                                className="w-full h-full object-cover transition-opacity duration-200 hover:opacity-80"
                                                                // onClick={() => handleImageClick(image)}
                                                                draggable
                                                                onDragStart={(e) => {
                                                                    try {
                                                                        console.log('🎯 开始拖拽上传图片:', image.name)
                                                                        const dragData = {
                                                                            type: 'library-image',
                                                                            image: {
                                                                                id: image.id,
                                                                                name: image.name,
                                                                                url: image.url
                                                                            }
                                                                        };
                                                                        e.dataTransfer.setData('application/json', JSON.stringify(dragData));
                                                                        e.dataTransfer.effectAllowed = 'copy';

                                                                        // 设置拖拽时的视觉效果
                                                                        const dragImage = e.currentTarget.cloneNode(true) as HTMLImageElement;
                                                                        dragImage.style.width = '80px';
                                                                        dragImage.style.height = '80px';
                                                                        dragImage.style.opacity = '0.7';
                                                                        document.body.appendChild(dragImage);
                                                                        e.dataTransfer.setDragImage(dragImage, 40, 40);
                                                                        setTimeout(() => document.body.removeChild(dragImage), 0);

                                                                        toast.info('拖拽到画布中的图片上进行替换，或拖到空白处添加新图片');
                                                                    } catch (error) {
                                                                        console.error('Failed to set drag data:', error);
                                                                    }
                                                                }}
                                                                onDragEnd={() => {
                                                                    console.log('🏁 拖拽结束');
                                                                }}
                                                                onLoad={() => console.log('图片加载成功:', image.id)}
                                                                onError={(e) => {
                                                                    console.error('图片加载失败:', image.id, image.url, e)
                                                                    const target = e.target as HTMLImageElement
                                                                    // 设置占位图
                                                                    target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100" fill="none"%3E%3Crect width="100" height="100" fill="%23f0f0f0"/%3E%3Cpath d="M50 30C60 30 68 38 68 48C68 58 60 66 50 66C40 66 32 58 32 48C32 38 40 30 50 30ZM50 20C33.4 20 20 33.4 20 50C20 66.6 33.4 80 50 80C66.6 80 80 66.6 80 50C80 33.4 66.6 20 50 20ZM50 75C36.2 75 25 63.8 25 50C25 36.2 36.2 25 50 25C63.8 25 75 36.2 75 50C75 63.8 63.8 75 50 75Z" fill="%23dddddd"/%3E%3C/svg%3E'
                                                                    // 尝试使用createObjectURL重新创建URL
                                                                    try {
                                                                        const newUrl = URL.createObjectURL(new Blob([], { type: (image as any).type || 'image/png' }))
                                                                        console.log('尝试创建新的临时URL:', newUrl)
                                                                        setTimeout(() => {
                                                                            target.src = newUrl
                                                                        }, 100)
                                                                    } catch (retryError) {
                                                                        console.error('重试创建URL失败:', retryError)
                                                                    }
                                                                }}
                                                            />
                                                            {/* 显示图片名称 */}
                                                            <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-xs p-1 truncate">
                                                                {image.name}
                                                            </div>
                                                            {/* 删除按钮 - 仅在悬停时显示 */}
                                                            <button
                                                                className="absolute top-1 right-1 w-6 h-6 rounded-full bg-red-500/80 hover:bg-red-600 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                                                                onClick={(e) => {
                                                                    // 阻止事件冒泡，避免触发图片点击
                                                                    e.stopPropagation()
                                                                    handleImageDelete(image.id, image.name)
                                                                }}
                                                                aria-label={`删除图片 ${image.name}`}
                                                            >
                                                                <X className="w-3 h-3" />
                                                            </button>
                                                        </div>
                                                    </div>
                                                )
                                            })
                                        ) : (
                                            <div className="col-span-3 text-center py-8 text-gray-500">
                                                暂无上传的图片，请点击上方按钮上传
                                            </div>
                                        )
                                    )}
                                </>
                            )}
                        </div>
                    )}
                    {assetSubTab === 'fonts' && (
                        <div className="flex-1 flex flex-col overflow-hidden">
                            <div className="px-3 pt-3">
                                <Input placeholder="Search fonts" className="h-9 text-sm" />
                            </div>
                            <div className="p-3 space-y-2 overflow-auto">
                                {['Roboto', 'Lato', 'Montserrat', 'Open Sans', 'Playfair Display', 'Inter', 'Noto Sans', 'Poppins'].map((font, idx) => (
                                    <button key={idx} className="w-full text-left px-4 py-3 rounded-lg border bg-gray-50/40 hover:bg-gray-100/80 shadow-sm hover:shadow-md transition-colors">
                                        <span className="text-base">{font}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* 模板管理器（保留占位） */}
            <TemplateManager
                isOpen={showTemplateManager}
                onClose={() => setShowTemplateManager(false)}
                onApplyTemplate={(template) => {
                    console.log('应用模板:', template)
                    toast.success(`模板 "${template.name}" 已应用到画布`)
                }}
            />
        </div>
    )
}




