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
import {
    updateLayerProperties,
    type PSDLayer
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

    // 获取画布中图层的实时状态
    const getLayerCanvasState = useCallback((layerIndex: number) => {
        const canvasElement = canvasElements.find(element =>
            element.customData?.psdLayerIndex === layerIndex
        )

        if (!canvasElement) {
            return {
                exists: false,
                visible: false,
                opacity: 100,
                element: null
            }
        }

        // 检查可见性：主要基于opacity，同时检查customData中的visible状态
        const opacityVisible = canvasElement.opacity > 0
        const customDataVisible = canvasElement.customData?.visible !== false
        const isVisible = opacityVisible && customDataVisible

        return {
            exists: true,
            visible: isVisible,
            opacity: canvasElement.opacity || 100,
            element: canvasElement
        }
    }, [canvasElements])

    // 过滤和搜索图层
    const filteredLayers = useMemo(() => {
        if (!psdData) return []

        let filtered = psdData.layers.filter(layer => {
            const matchesSearch = layer.name.toLowerCase().includes(searchTerm.toLowerCase())
            const matchesFilter = filterType === 'all' || layer.type === filterType
            return matchesSearch && matchesFilter
        })

        // 按图层顺序排序（从底层到顶层）
        return filtered.sort((a, b) => a.index - b.index)
    }, [psdData?.layers, searchTerm, filterType])

    // 图层可见性切换（与画布同步）
    const handleLayerVisibilityToggle = useCallback(
        async (layerIndex: number) => {
            if (!psdData || !excalidrawAPI) return

            try {
                const canvasState = getLayerCanvasState(layerIndex)
                const newVisible = !canvasState.visible

                if (canvasState.exists) {
                    // 如果图层在画布中存在，直接切换可见性
                    const currentElements = excalidrawAPI.getSceneElements()
                    const updatedElements = currentElements.map(element => {
                        if (element.customData?.psdLayerIndex === layerIndex) {
                            // 保存原始透明度
                            const originalOpacity = element.customData?.originalOpacity || 100

                            return {
                                ...element,
                                // 使用原始透明度或默认100
                                opacity: newVisible ? originalOpacity : 0,
                                // 不使用isDeleted，只使用opacity控制
                                isDeleted: false,
                                // 更新customData中的可见性状态
                                customData: {
                                    ...element.customData,
                                    visible: newVisible
                                }
                            }
                        }
                        return element
                    })

                    // 强制更新场景
                    excalidrawAPI.updateScene({
                        elements: updatedElements,
                        appState: excalidrawAPI.getAppState()
                    })

                    // 触发重绘
                    excalidrawAPI.history.clear()

                    // 强制刷新画布状态
                    setTimeout(() => {
                        const refreshedElements = excalidrawAPI.getSceneElements()
                        const refreshedPsdElements = refreshedElements.filter(element => element.customData?.psdFileId)
                        setCanvasElements(refreshedPsdElements)
                        setLastUpdateTime(Date.now())

                        // 验证更新是否成功
                        const targetElement = refreshedElements.find(el => el.customData?.psdLayerIndex === layerIndex)
                        if (targetElement) {
                            console.log('图层状态验证:', {
                                layerIndex,
                                layerName: targetElement.customData?.layerName,
                                isDeleted: targetElement.isDeleted,
                                opacity: targetElement.opacity,
                                customDataVisible: targetElement.customData?.visible,
                                expectedVisible: newVisible,
                                actualVisible: targetElement.opacity > 0
                            })

                            // 如果更新失败，尝试再次更新
                            if (targetElement.opacity === 0 && newVisible) {
                                console.warn('图层显示失败，尝试强制显示')
                                const forceUpdatedElements = refreshedElements.map(el => {
                                    if (el.customData?.psdLayerIndex === layerIndex) {
                                        return {
                                            ...el,
                                            opacity: el.customData?.originalOpacity || 100,
                                            isDeleted: false,
                                            customData: {
                                                ...el.customData,
                                                visible: true
                                            }
                                        }
                                    }
                                    return el
                                })

                                excalidrawAPI.updateScene({
                                    elements: forceUpdatedElements
                                })
                            }
                        }
                    }, 50)

                    console.log(`图层 ${layerIndex} 可见性切换为: ${newVisible}`, {
                        element: canvasState.element,
                        originalOpacity: canvasState.element?.customData?.originalOpacity || 100,
                        newOpacity: newVisible ? (canvasState.element?.customData?.originalOpacity || 100) : 0,
                        isDeleted: false
                    })
                } else {
                    // 如果图层不在画布中，更新PSD数据
                    const updatedLayers = psdData.layers.map((layer) =>
                        layer.index === layerIndex ? { ...layer, visible: newVisible } : layer
                    )

                    await updateLayerProperties(psdData.file_id, layerIndex, {
                        visible: newVisible
                    })

                    onUpdate({
                        ...psdData,
                        layers: updatedLayers,
                    })
                }

                toast.success(`图层可见性已切换为: ${newVisible ? '可见' : '隐藏'}`)
            } catch (error) {
                console.error('更新图层可见性失败:', error)
                toast.error('更新图层可见性失败')
            }
        },
        [psdData, excalidrawAPI, getLayerCanvasState, onUpdate]
    )

    // 图层透明度调整（与画布同步）
    const handleOpacityChange = useCallback(
        async (layerIndex: number, opacity: number) => {
            if (!psdData || !excalidrawAPI) return

            try {
                const canvasState = getLayerCanvasState(layerIndex)

                if (canvasState.exists) {
                    // 如果图层在画布中存在，直接更新透明度
                    const updatedElements = excalidrawAPI.getSceneElements().map(element => {
                        if (element.customData?.psdLayerIndex === layerIndex) {
                            return { ...element, opacity }
                        }
                        return element
                    })

                    excalidrawAPI.updateScene({
                        elements: updatedElements
                    })

                    console.log(`图层 ${layerIndex} 透明度更新为: ${opacity}%`)
                } else {
                    // 如果图层不在画布中，更新PSD数据
                    const updatedLayers = psdData.layers.map((layer) =>
                        layer.index === layerIndex ? { ...layer, opacity } : layer
                    )

                    await updateLayerProperties(psdData.file_id, layerIndex, { opacity })

                    onUpdate({
                        ...psdData,
                        layers: updatedLayers,
                    })
                }

                toast.success(`图层透明度已更新为: ${opacity}%`)
            } catch (error) {
                console.error('更新图层透明度失败:', error)
                toast.error('更新图层透明度失败')
            }
        },
        [psdData, excalidrawAPI, getLayerCanvasState, onUpdate]
    )

    // 文字图层属性更新（与画布同步）
    const handleTextPropertyUpdate = useCallback(
        async (layerIndex: number, property: string, value: any) => {
            if (!psdData || !excalidrawAPI) return

            try {
                const canvasState = getLayerCanvasState(layerIndex)

                if (canvasState.exists) {
                    // 如果图层在画布中存在，直接更新画布中的文字元素
                    const currentElements = excalidrawAPI.getSceneElements()
                    const updatedElements = currentElements.map(element => {
                        if (element.customData?.psdLayerIndex === layerIndex) {
                            // 更新文字元素的属性
                            const updatedElement = { ...element }

                            if (property === 'text_content') {
                                // 更新文字内容
                                if (updatedElement.type === 'text') {
                                    (updatedElement as any).text = value
                                }
                            } else if (property === 'font_weight') {
                                // 更新字体粗细
                                if (updatedElement.type === 'text') {
                                    (updatedElement as any).fontWeight = value === 'bold' ? 600 : 400
                                }
                            } else if (property === 'font_style') {
                                // 更新字体样式
                                if (updatedElement.type === 'text') {
                                    (updatedElement as any).fontStyle = value === 'italic' ? 'italic' : 'normal'
                                }
                            }

                            // 更新customData
                            updatedElement.customData = {
                                ...updatedElement.customData,
                                [property]: value
                            }

                            return updatedElement
                        }
                        return element
                    })

                    // 强制更新场景
                    excalidrawAPI.updateScene({
                        elements: updatedElements,
                        appState: excalidrawAPI.getAppState()
                    })

                    console.log(`文字图层 ${layerIndex} ${property} 更新为: ${value}`)
                } else {
                    // 如果图层不在画布中，更新PSD数据
                    const updatedLayers = psdData.layers.map((layer) =>
                        layer.index === layerIndex ? { ...layer, [property]: value } : layer
                    )

                    await updateLayerProperties(psdData.file_id, layerIndex, { [property]: value })

                    onUpdate({
                        ...psdData,
                        layers: updatedLayers,
                    })
                }

                toast.success('文字属性已更新')
            } catch (error) {
                console.error('更新文字属性失败:', error)
                toast.error('更新文字属性失败')
            }
        },
        [psdData, excalidrawAPI, getLayerCanvasState, onUpdate]
    )

    // 保存图层为模板
    const handleSaveLayerAsTemplate = useCallback(async (layer: PSDLayer) => {
        try {
            const templateData = {
                name: `${layer.name} - 模板`,
                description: `从PSD图层 "${layer.name}" 创建的模板`,
                category_id: 'default', // 默认分类，实际应用中应该让用户选择
                tags: ['psd', 'layer', layer.type],
                is_public: false,
            }

            await createTemplateFromPSDLayer(psdData!.file_id, layer.index, templateData)
            toast.success(`图层 "${layer.name}" 已保存为模板`)
        } catch (error) {
            console.error('保存模板失败:', error)
            toast.error('保存模板失败')
        }
    }, [psdData])

    // 获取图层图标
    const getLayerIcon = (layer: PSDLayer) => {
        switch (layer.type) {
            case 'text':
                return <Type className="h-4 w-4 text-blue-500" />
            case 'group':
                return <FolderOpen className="h-4 w-4 text-yellow-500" />
            default:
                return <ImageIcon className="h-4 w-4 text-green-500" />
        }
    }

    // 获取图层类型标签
    const getLayerTypeLabel = (layer: PSDLayer) => {
        switch (layer.type) {
            case 'text':
                return '文字'
            case 'group':
                return '群组'
            default:
                return '图层'
        }
    }

    // console.log('PSDLayerSidebar 渲染狀態:', { isVisible, psdData: !!psdData, layersCount: psdData?.layers?.length })

    // 始终显示面板，不受 isVisible 控制
    // if (!isVisible) {
    //     return null
    // }

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
                        <div className="p-3 space-y-2 overflow-auto">
                            {['Social Media Posts', 'Marketing Banners', 'Blog Thumbnails'].map((folder, idx) => (
                                <div key={idx} className="flex items-center justify-between px-3 py-3 rounded-lg border bg-gray-50/40 hover:bg-gray-100/60 transition-colors">
                                    <div className="flex items-center gap-3">
                                        <FolderOpen className="h-5 w-5 opacity-80" />
                                        <span className="text-base">{folder}</span>
                                    </div>
                                    <span className="opacity-60">›</span>
                                </div>
                            ))}
                        </div>
                    )}
                    {assetSubTab === 'library' && (
                        <div className="grid grid-cols-3 gap-3 p-3 overflow-auto">
                            {Array.from({ length: 12 }).map((_, i) => (
                                <div key={i} className="aspect-square rounded-xl border bg-gray-50/60 hover:bg-gray-100/80 shadow-sm hover:shadow-md transition-all overflow-hidden">
                                    <div className="w-full h-full flex items-center justify-center text-sm">
                                        library {i + 1}
                                    </div>
                                </div>
                            ))}
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
